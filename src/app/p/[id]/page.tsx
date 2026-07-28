import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getPoster(id: string) {
  const doc = await getAdminDb().collection("submissions").doc(id).get();
  if (!doc.exists || doc.data()?.status !== "done") return null;

  const data = doc.data()!;
  const posterUrl = getAdminStorage().bucket().file(data.posterImagePathStory).publicUrl();

  return { premiseLine: data.premiseLine as string, posterUrl };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const poster = await getPoster(id);
  if (!poster) return { title: "Poster not found" };

  return {
    title: poster.premiseLine,
    openGraph: {
      title: poster.premiseLine,
      images: [poster.posterUrl], // the poster itself is the OG image
    },
  };
}

export default async function SharePosterPage({ params }: PageProps) {
  const { id } = await params;
  const poster = await getPoster(id);
  if (!poster) notFound();

  // Fire-and-forget share count increment; not load-bearing for the render.
  getAdminDb()
    .collection("submissions")
    .doc(id)
    .update({ shareCount: FieldValue.increment(1) })
    .catch(() => {});

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-background px-4 py-10">
      <div className="w-full max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={poster.posterUrl} alt={poster.premiseLine} className="w-full rounded-2xl shadow-xl" />
        <Button render={<Link href="/" />} className="mt-6 w-full">
          Make yours
        </Button>
      </div>
    </div>
  );
}
