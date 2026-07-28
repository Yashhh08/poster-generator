import { NextResponse } from "next/server";
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin";

const GALLERY_LIMIT = 24;

export async function GET() {
  // Filtering status==done in-memory rather than via a Firestore .where()
  // avoids needing a composite index (equality + orderBy on different
  // fields requires one); fine at this volume.
  const snap = await getAdminDb()
    .collection("submissions")
    .orderBy("createdAt", "desc")
    .limit(GALLERY_LIMIT * 2)
    .get();

  const bucket = getAdminStorage().bucket();
  const posters = snap.docs
    .filter((doc) => doc.data().status === "done")
    .slice(0, GALLERY_LIMIT)
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        premiseLine: data.premiseLine as string,
        posterUrl: bucket.file(data.posterImagePathStory).publicUrl(),
      };
    });

  return NextResponse.json({ posters });
}
