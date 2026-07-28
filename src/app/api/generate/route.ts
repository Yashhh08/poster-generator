import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "ai";
import sharp from "sharp";
import { z } from "zod";
import { getAdminAuth, getAdminDb, getAdminStorage } from "@/lib/firebase/admin";
import { isPhotoSafeToProcess } from "@/lib/content-safety";
import { buildPosterShellSvg, POSTER_WIDTH, POSTER_HEIGHT } from "@/lib/poster-shell";
import { SCENE_MODEL } from "@/lib/ai/models";
import { buildScenePlan } from "@/lib/ai/scene-plan";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const fieldsSchema = z.object({
  goalTextRaw: z.string().trim().min(1).max(300),
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await getAdminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: "Invalid auth token." }, { status: 401 });
  }

  // No rate limiting while prototyping. Add a per-uid check here before
  // any real/public launch.

  const form = await req.formData();
  const photo = form.get("photo");
  const parsedFields = fieldsSchema.safeParse({
    goalTextRaw: form.get("goalTextRaw"),
  });

  if (!(photo instanceof File) || !parsedFields.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(photo.type)) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }
  if (photo.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image too large." }, { status: 400 });
  }

  const { goalTextRaw } = parsedFields.data;

  const adminDb = getAdminDb();
  const submissionRef = adminDb.collection("submissions").doc();
  await submissionRef.set({
    uid,
    goalTextRaw,
    status: "generating",
    createdAt: new Date(),
  });

  const startedAt = Date.now();
  const bucket = getAdminStorage().bucket();

  try {
    const originalBuffer = Buffer.from(await photo.arrayBuffer());

    const safety = await isPhotoSafeToProcess(originalBuffer, photo.type);
    if (!safety.safe) {
      await submissionRef.update({ status: "failed", generationMs: Date.now() - startedAt });
      return NextResponse.json(
        { error: "This photo can't be processed." },
        { status: 400 }
      );
    }

    // 1. Upload original photo.
    const rawPath = `raw/${uid}/${submissionRef.id}.jpg`;
    await bucket.file(rawPath).save(originalBuffer, {
      contentType: photo.type,
    });

    // 2. One dynamic call: turn the user's raw goal text into a detailed
    // scene prompt + a short poster tagline. No curated category library —
    // every prompt is generated fresh for what they actually typed.
    const { scenePrompt, premiseLine } = await buildScenePlan(goalTextRaw);
    await submissionRef.update({ premiseLine });

    // 3. Segment subject from background: no explicit mask (spec 5.2 — a
    // dedicated segmentation model is the real fix, still unbuilt). A fixed
    // placeholder mask was tried and removed: it forces the model to treat
    // an arbitrary ellipse as ground truth, which is worse than no mask on
    // any photo where the subject isn't dead-center. Instead we rely on the
    // scenePrompt's explicit "subject stays untouched" instruction and let
    // the model infer the subject boundary itself.

    // OpenAI's image-edit API requires PNG input for the source image; the
    // upload can be JPEG/WebP, so normalize here.
    const editSourcePng = await sharp(originalBuffer).png().toBuffer();

    // 4. Scene generation via AI Gateway image-edit model.
    // gpt-image-1* doesn't support `aspectRatio`, only fixed `size` values;
    // 1024x1536 is the closest supported size to our 9:16 target, and the
    // compositing step below crops/resizes to the exact poster dimensions.
    const { image: sceneImage } = await generateImage({
      model: SCENE_MODEL,
      prompt: {
        images: [editSourcePng],
        text: scenePrompt,
      },
      size: "1024x1536",
    });

    // 5. Composite: generated scene + poster shell overlay -> final image.
    const shellSvg = buildPosterShellSvg({ premiseLine });
    const finalBuffer = await sharp(Buffer.from(sceneImage.uint8Array))
      .resize(POSTER_WIDTH, POSTER_HEIGHT, { fit: "cover" })
      .composite([{ input: Buffer.from(shellSvg) }])
      .jpeg({ quality: 90 })
      .toBuffer();

    // 6. Upload final poster.
    const posterPath = `posters/${uid}/${submissionRef.id}.jpg`;
    await bucket.file(posterPath).save(finalBuffer, { contentType: "image/jpeg" });
    await bucket.file(posterPath).makePublic();
    const posterUrl = bucket.file(posterPath).publicUrl();

    // 7. Write Firestore doc.
    await submissionRef.update({
      status: "done",
      originalImagePath: rawPath,
      posterImagePathStory: posterPath,
      generationMs: Date.now() - startedAt,
      modelUsed: SCENE_MODEL,
      shareCount: 0,
    });

    // 8. Return final image URL.
    return NextResponse.json({
      id: submissionRef.id,
      premiseLine,
      posterUrl,
    });
  } catch (err) {
    await submissionRef.update({
      status: "failed",
      generationMs: Date.now() - startedAt,
    });
    console.error("generate pipeline failed", err);
    return NextResponse.json(
      { error: "Generation failed. Please try again." },
      { status: 500 }
    );
  }
}
