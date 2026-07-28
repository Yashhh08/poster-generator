import { buildPosterShellSvg, POSTER_WIDTH, POSTER_HEIGHT } from "@/lib/poster-shell";

interface PosterShellPreviewProps {
  backgroundImageUrl: string;
  premiseLine: string;
  ctaText?: string;
}

export function PosterShellPreview({
  backgroundImageUrl,
  premiseLine,
  ctaText,
}: PosterShellPreviewProps) {
  const svg = buildPosterShellSvg({ premiseLine, ctaText });
  const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-2xl"
      style={{ width: POSTER_WIDTH / 3, height: POSTER_HEIGHT / 3 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={backgroundImageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={svgDataUrl}
        alt=""
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
