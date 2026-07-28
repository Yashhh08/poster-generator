import { PosterShellPreview } from "@/components/poster/poster-shell-preview";

const SAMPLE_PREMISES = [
  "From the gully to the crease.",
  "Every rally was practice for this.",
  "The chair where a stylist was born.",
];

export default function PosterShellDevPage() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-10 bg-neutral-950 p-10">
      <h1 className="text-xl font-semibold text-white">Poster shell preview</h1>
      <div className="flex flex-wrap justify-center gap-8">
        {SAMPLE_PREMISES.map((premise) => (
          <PosterShellPreview
            key={premise}
            backgroundImageUrl={`https://picsum.photos/seed/${encodeURIComponent(premise)}/1080/1920`}
            premiseLine={premise}
          />
        ))}
      </div>
    </main>
  );
}
