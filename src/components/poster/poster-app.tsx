"use client";

import { useState } from "react";
import { PosterFlow } from "@/components/poster/poster-flow";
import { Gallery } from "@/components/poster/gallery";

export function PosterApp() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 py-10">
      <PosterFlow onGenerated={() => setRefreshKey((k) => k + 1)} />
      <Gallery refreshKey={refreshKey} />
    </div>
  );
}
