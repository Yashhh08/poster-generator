import { generateText, Output } from "ai";
import { z } from "zod";
import { SCENE_PLAN_MODEL } from "@/lib/ai/models";

const safetySchema = z.object({
  safe: z.boolean(),
  reason: z.string().optional(),
});

/**
 * Basic pre-generation content-safety check (spec Section 9) so an
 * inappropriate upload doesn't spend a full image-edit generation call.
 * Not a substitute for output-side moderation, which is out of MVP scope.
 */
export async function isPhotoSafeToProcess(
  photoBuffer: Buffer,
  mimeType: string
): Promise<{ safe: boolean; reason?: string }> {
  const { output } = await generateText({
    model: SCENE_PLAN_MODEL,
    output: Output.object({ schema: safetySchema }),
    system:
      "You are a content-safety filter for a photo poster generator. Reject only photos containing nudity, sexual content, graphic violence, or clearly depicting a minor in an unsafe context. Ordinary photos of people, places, or objects are safe. Respond with the required JSON only.",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Is this photo safe to process?" },
          { type: "file", data: photoBuffer, mediaType: mimeType },
        ],
      },
    ],
  });

  return output;
}
