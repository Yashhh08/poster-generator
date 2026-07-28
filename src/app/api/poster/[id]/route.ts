import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = await getAdminDb().collection("submissions").doc(id).get();

  if (!doc.exists || doc.data()?.status !== "done") {
    return NextResponse.json({ error: "Poster not found." }, { status: 404 });
  }

  const data = doc.data()!;
  const posterUrl = getAdminStorage()
    .bucket()
    .file(data.posterImagePathStory)
    .publicUrl();

  return NextResponse.json({
    id,
    premiseLine: data.premiseLine,
    posterUrl,
    createdAt: data.createdAt,
  });
}
