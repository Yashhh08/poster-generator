"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface GalleryPoster {
  id: string;
  premiseLine: string;
  posterUrl: string;
}

export function Gallery({ refreshKey }: { refreshKey?: number }) {
  const [posters, setPosters] = useState<GalleryPoster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/posters")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setPosters(data.posters ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (!loading && posters.length === 0) return null;

  return (
    <div className="flex w-full flex-col gap-4">
      <h2 className="text-sm font-medium text-muted-foreground">Recently generated</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-9/16 animate-pulse rounded-lg bg-muted" />
            ))
          : posters.map((poster) => (
              <Link
                key={poster.id}
                href={`/p/${poster.id}`}
                className="group relative aspect-9/16 overflow-hidden rounded-lg bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={poster.posterUrl}
                  alt={poster.premiseLine}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </Link>
            ))}
      </div>
    </div>
  );
}
