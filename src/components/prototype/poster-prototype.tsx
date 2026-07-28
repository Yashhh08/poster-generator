"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { renderPoster, type PosterData } from "@/lib/poster-canvas";

type Step = "landing" | "capture" | "generating" | "result";

const GENERATING_MESSAGES = [
  "DEVELOPING PLATE...",
  "GRADING FILM STOCK...",
  "SETTING THE TYPE...",
  "STAMPING ENTRY DATE...",
  "SEALING THE ARCHIVE...",
];

const EXAMPLES = [
  { headline: "PLAYING", sub: "23 JUL 2026", from: "#2f5fc9", to: "#0a0a10", rot: -4 },
  { headline: "HEALING\nFOR MYSELF", sub: "25 JUL 2026", from: "#7a2fb8", to: "#0e0a15", rot: 3 },
  { headline: "LEARNING AI", sub: "23 JUL 2026", from: "#3a4a6a", to: "#0a0c12", rot: -2 },
  { headline: "FOR MYSELF", sub: "23 JUL 2026", from: "#c41f7a", to: "#150a12", rot: 5 },
];

// Positions are a percentage of SCATTER_HEIGHT (one "screen" of the field).
// The field is rendered twice, stacked, and scrolled up by exactly one
// SCATTER_HEIGHT on an endless loop — so the scattered arrangement itself
// (not a grid) drifts upward forever with no visible seam.
const SCATTER_HEIGHT = 960;

const SCATTER_TILES = [
  { top: 7, left: 7, rot: -8, size: 115, from: "#2f5fc9", to: "#0a0a10", layer: 0 },
  { top: 3, left: 24, rot: 11, size: 95, from: "#7a2fb8", to: "#0e0a15", layer: 1 },
  { top: 20, left: 11, rot: 6, size: 130, from: "#3a4a6a", to: "#0a0c12", layer: 2 },
  { top: 33, left: 3, rot: -12, size: 103, from: "#c41f7a", to: "#150a12", layer: 0 },
  { top: 48, left: 13, rot: 8, size: 123, from: "#1f6fa8", to: "#0a1015", layer: 1 },
  { top: 63, left: 4, rot: -6, size: 100, from: "#3b52c9", to: "#150a1c", layer: 2 },
  { top: 78, left: 16, rot: 10, size: 125, from: "#8b3ff0", to: "#12081a", layer: 0 },
  { top: 92, left: 6, rot: -5, size: 105, from: "#2f5fc9", to: "#0a0a10", layer: 1 },
  { top: 5, left: 93, rot: 8, size: 110, from: "#c41f7a", to: "#1a0a12", layer: 2 },
  { top: 17, left: 79, rot: -10, size: 133, from: "#3a4a6a", to: "#0a0c12", layer: 0 },
  { top: 32, left: 96, rot: 6, size: 98, from: "#1f6fa8", to: "#0a1015", layer: 1 },
  { top: 48, left: 86, rot: -8, size: 123, from: "#8b3ff0", to: "#12081a", layer: 2 },
  { top: 63, left: 97, rot: 10, size: 103, from: "#7a2fb8", to: "#0e0a15", layer: 0 },
  { top: 78, left: 83, rot: -6, size: 128, from: "#c41f7a", to: "#150a12", layer: 1 },
  { top: 92, left: 94, rot: 5, size: 100, from: "#3b52c9", to: "#150a1c", layer: 2 },
  { top: 4, left: 57, rot: 12, size: 90, from: "#2f5fc9", to: "#0a0a10", layer: 0 },
];

// Depth planes for the parallax effect: the back layer drifts slowest, dimmest
// and smallest; the front layer fastest, brightest and largest.
const SCATTER_LAYERS = [
  { duration: 34, opacity: 0.65, scale: 0.88, z: 0 },
  { duration: 22, opacity: 0.85, scale: 1, z: 10 },
  { duration: 13, opacity: 1, scale: 1.14, z: 20 },
];

function demoOutputForFile(file: File): string | null {
  const normalizedName = file.name.toLowerCase().replace(/\s+/g, "");
  if (normalizedName.includes("nidhi")) return "/nidhi-o.png";
  if (normalizedName.includes("kanika")) return "/kanika-o.png";
  return null;
}

export function PosterPrototype() {
  const [step, setStep] = useState<Step>("landing");
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [demoOutputSrc, setDemoOutputSrc] = useState<string | null>(null);
  const [sentence, setSentence] = useState("");
  const [poster, setPoster] = useState<PosterData | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  function scrollToCapture() {
    setStep("capture");
    requestAnimationFrame(() =>
      captureRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function handlePhotoChange(file: File | null) {
    if (!file) return;
    setDemoOutputSrc(demoOutputForFile(file));
    const reader = new FileReader();
    reader.onload = () => setPhotoSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  const wordCount = sentence.trim() ? sentence.trim().split(/\s+/).length : 0;
  const canGenerate = !!photoSrc && wordCount > 0 && wordCount <= 5;

  async function handleGenerate() {
    if (!photoSrc || !canGenerate) return;
    setStep("generating");
    setMessageIndex(0);

    const interval = setInterval(() => {
      setMessageIndex((i) => Math.min(i + 1, GENERATING_MESSAGES.length - 1));
    }, 550);

    const [result] = await Promise.all([
      demoOutputSrc
        ? {
            dataUrl: demoOutputSrc,
            entryNumber: "ARCHIVE",
            dateLabel: "28 JULY 2026",
          }
        : renderPoster(photoSrc, sentence.trim()),
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);

    clearInterval(interval);
    setPoster(result);
    setStep("result");
  }

  function handleDownload() {
    if (!poster) return;
    const a = document.createElement("a");
    a.href = poster.dataUrl;
    a.download = "today-i-began.jpg";
    a.click();
  }

  async function handleShare() {
    if (!poster || !navigator.share) {
      handleDownload();
      return;
    }

    const response = await fetch(poster.dataUrl);
    const blob = await response.blob();
    const file = new File([blob], "today-i-began.jpg", { type: blob.type || "image/jpeg" });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: "Today I began",
        text: "My Beginning Archive entry",
        files: [file],
      });
      return;
    }

    await navigator.share({
      title: "Today I began",
      text: "My Beginning Archive entry",
    });
  }

  function reset() {
    setPhotoSrc(null);
    setDemoOutputSrc(null);
    setSentence("");
    setPoster(null);
    scrollToCapture();
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--archive-bg)", color: "var(--archive-ink)" }}
    >
      <GridShowcase onBegin={scrollToCapture} />

      <div ref={captureRef} className="relative mx-auto max-w-5xl px-8 py-28 sm:px-14">
        <AnimatedHeight>
          {step !== "result" && (
            <CaptureCard
              photoSrc={photoSrc}
              sentence={sentence}
              wordCount={wordCount}
              canGenerate={canGenerate}
              generating={step === "generating"}
              message={GENERATING_MESSAGES[messageIndex]}
              fileInputRef={fileInputRef}
              onPhotoChange={handlePhotoChange}
              onSentenceChange={setSentence}
              onGenerate={handleGenerate}
            />
          )}

          {step === "result" && poster && (
            <ResultTicket poster={poster} onDownload={handleDownload} onShare={handleShare} onReset={reset} />
          )}
        </AnimatedHeight>
      </div>

      <Landing onBegin={scrollToCapture} />

      <Footer />
    </div>
  );
}

// Smoothly animates height changes when its content swaps (e.g. capture
// form -> generating -> result), instead of the surrounding page snapping
// to the new height instantly.
function AnimatedHeight({ children }: { children: React.ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="overflow-hidden transition-[height] duration-500 ease-in-out"
      style={{ height }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
}

function Sprockets({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={`sprocket-rail absolute top-0 bottom-0 hidden w-7 sm:block ${
        side === "left" ? "left-0" : "right-0"
      }`}
      style={{ background: "var(--archive-bg-raised)" }}
      aria-hidden
    />
  );
}

function Landing({ onBegin }: { onBegin: () => void }) {
  return (
    <section className="archive-grain relative overflow-hidden border-b border-(--archive-rust)/40 px-8 py-28 sm:px-16">
      <Sprockets side="left" />
      <Sprockets side="right" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(46% 60% at 22% 8%, rgba(59,130,246,0.22), transparent 65%), radial-gradient(40% 45% at 88% 85%, rgba(236,30,122,0.18), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl">
        <p
          className="mb-8 text-[11px] font-bold tracking-[0.45em]"
          style={{ fontFamily: "var(--font-mono)", color: "var(--archive-amber)" }}
        >
          THE BEGINNING ARCHIVE — EST. TODAY
        </p>

        <h1
          className="text-6xl leading-[0.95] font-black italic sm:text-8xl"
          style={{ fontFamily: "var(--font-display)", color: "var(--archive-ink)" }}
        >
          Let&apos;s begin today
        </h1>

        <div className="mt-10 flex flex-wrap items-center gap-6">
          <p
            className="max-w-xl text-2xl italic"
            style={{ fontFamily: "var(--font-display)", color: "var(--archive-amber-bright)" }}
          >
            One sentence. A billion stories.
          </p>
          <div
            className="stamp-rotate shrink-0 select-none rounded-sm border-[3px] px-4 py-2 text-center"
            style={{
              borderColor: "var(--archive-stamp)",
              color: "var(--archive-stamp)",
              fontFamily: "var(--font-mono)",
              boxShadow: "0 0 0 1px rgba(236,30,122,0.25)",
            }}
          >
            <span className="block text-[10px] font-bold tracking-[0.3em]">VERIFIED</span>
            <span className="block text-[10px] font-bold tracking-[0.3em]">PREMIERE</span>
          </div>
        </div>
        <p
          className="mt-5 max-w-md text-sm leading-relaxed"
          style={{ fontFamily: "var(--font-mono)", color: "var(--archive-ink-dim)" }}
        >
          Upload a photograph, complete the statement, and receive a
          cinematic entry — graded, dated, and filed in seconds.
        </p>

        <button
          onClick={onBegin}
          className="ticket-punch mt-12 flex w-full items-center justify-center gap-2 whitespace-nowrap border-y-2 border-dashed px-4 py-4 text-[11px] font-bold tracking-[0.08em] text-white shadow-[0_8px_30px_-8px_rgba(139,63,240,0.6)] transition hover:brightness-110 sm:inline-flex sm:w-auto sm:px-9 sm:text-sm sm:tracking-[0.2em]"
          style={
            {
              fontFamily: "var(--font-mono)",
              backgroundImage: "var(--archive-gradient)",
              borderColor: "#0a0a10",
              "--archive-cut": "var(--archive-bg)",
            } as React.CSSProperties
          }
        >
          ADMIT ONE <span className="opacity-70">▸</span> BEGIN YOUR STORY
        </button>
      </div>

      <PosterWall />
    </section>
  );
}

interface ExampleEntry {
  headline: string;
  sub: string;
  from: string;
  to: string;
}

function ExampleCardVisual({ ex }: { ex: ExampleEntry }) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(to top, rgba(6,4,2,0.92), rgba(6,4,2,0.05) 55%)",
        }}
      />
      <span
        className="absolute top-3 left-3 h-2 w-2 rounded-full"
        style={{ background: "var(--archive-amber)", boxShadow: "0 0 8px var(--archive-amber)" }}
        aria-hidden
      />
      <p
        className="relative text-[9px] font-bold tracking-[0.25em]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--archive-amber-bright)" }}
      >
        I BEGAN
      </p>
      <p
        className="relative mt-1 text-base leading-[1.05] font-black whitespace-pre-line italic xl:text-xl"
        style={{ fontFamily: "var(--font-display)", color: "var(--archive-ink)" }}
      >
        {ex.headline}
      </p>
      <p
        className="relative mt-2 text-[9px] font-bold tracking-wider"
        style={{ fontFamily: "var(--font-mono)", color: "var(--archive-ink-dim)" }}
      >
        {ex.sub}
      </p>
    </>
  );
}

function PosterWall() {
  return (
    <div className="no-scrollbar -mx-8 flex snap-x snap-mandatory items-start gap-5 overflow-x-auto px-8 py-2 sm:mx-auto sm:max-w-4xl sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-14 sm:overflow-visible sm:px-2 sm:py-0 mt-28 xl:max-w-6xl xl:gap-x-10">
      {EXAMPLES.map((ex) => (
        <div
          key={ex.headline}
          className="archive-grain relative flex aspect-2/3 w-36 shrink-0 snap-start flex-col justify-end overflow-hidden rounded-xs border p-3 shadow-2xl transition-transform duration-300 hover:z-10 hover:-translate-y-2 hover:rotate-0 sm:w-44 xl:w-56"
          style={{
            background: `linear-gradient(165deg, ${ex.from}, ${ex.to})`,
            borderColor: "rgba(242,233,216,0.15)",
            transform: `rotate(${ex.rot}deg)`,
            boxShadow: "0 22px 40px -18px rgba(0,0,0,0.7)",
          }}
        >
          <ExampleCardVisual ex={ex} />
        </div>
      ))}
    </div>
  );
}

function ScatterTile({
  t,
  top,
  scale,
  opacity,
  mobileHidden = false,
}: {
  t: (typeof SCATTER_TILES)[number];
  top: number;
  scale: number;
  opacity: number;
  mobileHidden?: boolean;
}) {
  return (
    <div
      className={`archive-grain absolute rounded-md border shadow-xl ${mobileHidden ? "hidden sm:block" : ""}`}
      style={{
        top: `${top}px`,
        left: `${t.left}%`,
        width: t.size * scale,
        aspectRatio: "2/3",
        opacity,
        transform: `translate(-50%, -50%) rotate(${t.rot}deg)`,
        background: `linear-gradient(165deg, ${t.from}, ${t.to})`,
        borderColor: "rgba(242,233,216,0.15)",
        boxShadow: "0 16px 30px -16px rgba(0,0,0,0.7)",
      }}
    >
      <span
        className="absolute top-2 left-2 h-1.5 w-1.5 rounded-full"
        style={{ background: "var(--archive-amber)", boxShadow: "0 0 6px var(--archive-amber)" }}
        aria-hidden
      />
    </div>
  );
}

function ScatterField() {
  return (
    <>
      {SCATTER_LAYERS.map((layer, layerIndex) => {
        const tiles = SCATTER_TILES.filter((t) => t.layer === layerIndex);
        return (
          <div
            key={layerIndex}
            className="scatter-track absolute inset-0"
            style={
              {
                height: SCATTER_HEIGHT * 2,
                zIndex: layer.z,
                "--dur": `${layer.duration}s`,
              } as React.CSSProperties
            }
          >
            {[0, 1].map((copy) =>
              tiles.map((t, i) => (
                <ScatterTile
                  key={`${copy}-${i}`}
                  t={t}
                  top={(t.top / 100) * SCATTER_HEIGHT + copy * SCATTER_HEIGHT}
                  scale={layer.scale}
                  opacity={layer.opacity}
                  mobileHidden={i % 2 === 1}
                />
              )),
            )}
          </div>
        );
      })}
    </>
  );
}

function GridShowcase({ onBegin }: { onBegin: () => void }) {
  const header = (
    <>
      <p
        className="mb-3 text-[11px] font-bold tracking-[0.35em]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--archive-amber)" }}
      >
        CASE FILE NO. 001 — THE ARCHIVE
      </p>
      <h2
        className="text-6xl leading-[0.95] font-black italic sm:text-8xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        It&apos;s time{" "}
        <span style={{ color: "var(--archive-amber-bright)" }}>to begin...</span>
      </h2>
      <p
        className="mt-5 max-w-xl text-sm leading-relaxed"
        style={{ fontFamily: "var(--font-mono)", color: "var(--archive-ink-dim)" }}
      >
        Every new year, new job, new habit is another entry. The format
        never expires and neither does the archive.
      </p>
    </>
  );

  return (
    <section className="relative">
      {/* The scattered collage drifting upward forever, at every breakpoint */}
      <div className="relative min-h-screen overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(45% 40% at 50% 50%, rgba(139,63,240,0.12), transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 12%, black 82%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 12%, black 82%, transparent 100%)",
          }}
        >
          <ScatterField />
        </div>

        {/* Blends the field into the section below instead of cutting off. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
          style={{
            background: "linear-gradient(to bottom, transparent, var(--archive-bg) 92%)",
          }}
        />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-8 text-center">
          <div className="relative">
            {/* Soft blur/scrim sized to the content itself (plus a bleed
                margin) — fully covers the text and only feathers out in the
                margin, so it reads as atmosphere, not a hard-edged card. */}
            <div
              className="pointer-events-none absolute -inset-10 sm:-inset-16"
              style={
                {
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  WebkitMaskImage: "radial-gradient(closest-side, black 65%, transparent 100%)",
                  maskImage: "radial-gradient(closest-side, black 65%, transparent 100%)",
                } as React.CSSProperties
              }
            />
            <div
              className="pointer-events-none absolute -inset-10 sm:-inset-16"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(6,5,12,0.62), transparent 100%)",
              }}
            />

            <div className="relative">
              {header}
              <button
                onClick={onBegin}
                className="ticket-punch mt-10 inline-flex items-center gap-2 border-y-2 border-dashed px-5 py-4 text-xs font-bold tracking-widest whitespace-nowrap text-white shadow-[0_8px_30px_-8px_rgba(139,63,240,0.6)] transition hover:brightness-110 sm:px-9 sm:text-sm sm:tracking-[0.2em]"
                style={
                  {
                    fontFamily: "var(--font-mono)",
                    backgroundImage: "var(--archive-gradient)",
                    borderColor: "#0a0a10",
                    "--archive-cut": "var(--archive-bg)",
                  } as React.CSSProperties
                }
              >
                BEGIN YOUR STORY <span className="opacity-70">▸</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionLabel({ n, title }: { n: string; title: string }) {
  return (
    <p
      className="mb-2 text-[11px] font-bold tracking-[0.3em]"
      style={{ fontFamily: "var(--font-mono)", color: "var(--archive-amber)" }}
    >
      {n} — {title}
    </p>
  );
}

function CaptureCard({
  photoSrc,
  sentence,
  wordCount,
  canGenerate,
  generating,
  message,
  fileInputRef,
  onPhotoChange,
  onSentenceChange,
  onGenerate,
}: {
  photoSrc: string | null;
  sentence: string;
  wordCount: number;
  canGenerate: boolean;
  generating: boolean;
  message: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPhotoChange: (file: File | null) => void;
  onSentenceChange: (v: string) => void;
  onGenerate: () => void;
}) {
  return (
    <div>
      <p
        className="mb-3 text-[11px] font-bold tracking-[0.35em]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--archive-ink-dim)" }}
      >
        CASE FILE NO. 002 — OPEN INTAKE
      </p>
      <h2
        className="mb-14 text-4xl font-black italic"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Complete your entry
      </h2>

      <div className="grid gap-12 sm:grid-cols-2">
        <div className="relative">
          <SectionLabel n="EXHIBIT A" title="PHOTOGRAPH" />
          <p className="mb-4 text-sm" style={{ color: "var(--archive-ink-dim)" }}>
            You, exactly as you are today.
          </p>
          <div
            className={`group relative flex aspect-4/5 cursor-pointer items-center justify-center overflow-hidden ${generating ? "ai-developing-frame" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            style={{ background: "var(--archive-bg-raised)" }}
          >
            <CornerBrackets />
            {photoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoSrc}
                alt="Your photo"
                className={`h-full w-full object-cover ${generating ? "ai-photo-develop" : ""}`}
              />
            ) : (
              <span
                className="px-6 text-center text-xs font-bold tracking-[0.2em]"
                style={{ fontFamily: "var(--font-mono)", color: "var(--archive-ink-dim)" }}
              >
                CLICK TO FRAME SUBJECT
              </span>
            )}
            {generating && <AiGenerationOverlay />}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex flex-col">
          <SectionLabel n="EXHIBIT B" title="STATEMENT" />
          <p className="mb-4 text-sm" style={{ color: "var(--archive-ink-dim)" }}>
            &ldquo;Today I began ______.&rdquo; Five words or fewer.
          </p>

          <div
            className={`relative flex-1 overflow-hidden border p-6 ${generating ? "ai-statement-panel" : ""}`}
            style={{ borderColor: "rgba(91,147,255,0.35)", background: "var(--archive-bg-raised)" }}
          >
            {generating && <AiGenerationOverlay compact />}
            <p
              className="relative text-xl italic"
              style={{ fontFamily: "var(--font-display)", color: "var(--archive-ink-dim)" }}
            >
              Today I began
            </p>
            <input
              value={sentence}
              onChange={(e) => onSentenceChange(e.target.value)}
              placeholder="learning AI"
              className="relative mt-3 w-full border-b-2 bg-transparent pb-2 text-lg font-bold focus:outline-none"
              style={{
                fontFamily: "var(--font-mono)",
                borderColor: "var(--archive-stamp)",
                color: "var(--archive-amber-bright)",
              }}
            />
            <div className="relative mt-4 flex gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 flex-1"
                  style={{
                    backgroundImage:
                      i < wordCount
                        ? wordCount > 5
                          ? "none"
                          : "var(--archive-gradient)"
                        : "none",
                    background:
                      i < wordCount && wordCount > 5
                        ? "var(--archive-stamp)"
                        : i >= wordCount
                          ? "rgba(255,255,255,0.12)"
                          : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          <button
            disabled={!canGenerate || generating}
            onClick={onGenerate}
            className={`ticket-punch ai-generate-button mt-8 w-full border-y-2 border-dashed py-4 text-sm font-bold tracking-[0.2em] text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed ${generating ? "ai-generate-button--active" : ""}`}
            style={
              {
                fontFamily: "var(--font-mono)",
                backgroundImage: "var(--archive-gradient)",
                borderColor: "#0a0a10",
                opacity: !canGenerate && !generating ? 0.3 : 1,
                "--archive-cut": "var(--archive-bg)",
              } as React.CSSProperties
            }
          >
            <span className="ai-button-sheen" aria-hidden />
            <span className="ai-button-sparks" aria-hidden />
            <span className="relative z-10">{generating ? "COMPOSING IMAGE..." : "STAMP & GENERATE ▸"}</span>
          </button>

          {generating && <FilmReelStatus message={message} />}
        </div>
      </div>
    </div>
  );
}

function AiGenerationOverlay({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`ai-generation-overlay ${compact ? "ai-generation-overlay--compact" : ""}`} aria-hidden>
      <span className="ai-scanline" />
      <span className="ai-radar" />
      <span className="ai-node ai-node-1" />
      <span className="ai-node ai-node-2" />
      <span className="ai-node ai-node-3" />
      <span className="ai-node ai-node-4" />
      <span className="ai-matrix ai-matrix-1">PROMPT</span>
      <span className="ai-matrix ai-matrix-2">VISION</span>
      <span className="ai-matrix ai-matrix-3">RENDER</span>
    </div>
  );
}

function CornerBrackets() {
  const common = "absolute h-5 w-5 border-[color:var(--archive-amber)]";
  return (
    <>
      <span className={`${common} top-2 left-2 border-t-2 border-l-2`} aria-hidden />
      <span className={`${common} top-2 right-2 border-t-2 border-r-2`} aria-hidden />
      <span className={`${common} bottom-2 left-2 border-b-2 border-l-2`} aria-hidden />
      <span className={`${common} bottom-2 right-2 border-b-2 border-r-2`} aria-hidden />
    </>
  );
}

function FilmReelStatus({ message }: { message: string }) {
  return (
    <div className="mt-8 flex items-center gap-4">
      <svg
        viewBox="0 0 40 40"
        className="reel-spin h-9 w-9 shrink-0"
        style={{ color: "var(--archive-amber)" }}
        aria-hidden
      >
        <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="20" cy="20" r="4" fill="currentColor" />
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <circle
            key={deg}
            cx={20 + 10 * Math.cos((deg * Math.PI) / 180)}
            cy={20 + 10 * Math.sin((deg * Math.PI) / 180)}
            r="3"
            fill="currentColor"
          />
        ))}
      </svg>
      <p
        className="text-xs font-bold tracking-[0.2em]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--archive-amber-bright)" }}
      >
        {message}
        <span className="animate-pulse">_</span>
      </p>
    </div>
  );
}

function ResultTicket({
  poster,
  onDownload,
  onShare,
  onReset,
}: {
  poster: PosterData;
  onDownload: () => void;
  onShare: () => void;
  onReset: () => void;
}) {
  return (
    <div className="mx-auto max-w-sm text-center lg:max-w-4xl lg:text-left">
      <div className="lg:grid lg:grid-cols-[1fr_1.15fr] lg:grid-rows-[auto_1fr] lg:items-stretch lg:gap-x-16">
        <div className="lg:col-start-2 lg:row-start-1">
          <p
            className="mb-2 text-[11px] font-bold tracking-[0.35em]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--archive-ink-dim)" }}
          >
            CASE FILE NO. 002 — SEALED
          </p>
          <h2
            className="mb-6 text-4xl font-black italic lg:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your entry
          </h2>
          <p
            className="hidden max-w-sm text-sm leading-relaxed lg:block"
            style={{ fontFamily: "var(--font-mono)", color: "var(--archive-ink-dim)" }}
          >
            Graded, dated, and numbered. This portrait is now filed in the
            archive as a permanent record of where the story began.
          </p>
        </div>

        <div
          className="overflow-hidden border shadow-2xl lg:col-start-1 lg:row-start-1 lg:row-span-2"
          style={{ borderColor: "rgba(91,147,255,0.35)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster.dataUrl} alt="Your generated poster" className="block w-full" />

          <div
            className="ticket-punch flex items-center justify-between border-t-2 border-dashed px-5 py-4 text-left"
            style={
              {
                fontFamily: "var(--font-mono)",
                background: "var(--archive-bg-raised)",
                borderColor: "rgba(242,233,216,0.2)",
                "--archive-cut": "var(--archive-bg)",
              } as React.CSSProperties
            }
          >
            <div>
              <p className="text-[9px] tracking-[0.2em]" style={{ color: "var(--archive-ink-dim)" }}>
                ENTRY NO.
              </p>
              <p className="text-sm font-bold" style={{ color: "var(--archive-amber-bright)" }}>
                {poster.entryNumber}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] tracking-[0.2em]" style={{ color: "var(--archive-ink-dim)" }}>
                DATE FILED
              </p>
              <p className="text-sm font-bold" style={{ color: "var(--archive-amber-bright)" }}>
                {poster.dateLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3 lg:col-start-2 lg:row-start-2 lg:mt-0 lg:items-end">
          <button
            onClick={onDownload}
            className="min-h-11 flex-1 border-2 py-3.5 text-xs font-bold tracking-[0.15em] text-white transition hover:brightness-110 active:scale-[0.98] lg:flex-none lg:px-8"
            style={{ backgroundImage: "var(--archive-gradient)", borderColor: "#0a0a10" }}
          >
            DOWNLOAD
          </button>
          <button
            onClick={onShare}
            className="min-h-11 flex-1 border py-3.5 text-xs font-bold tracking-[0.15em] transition hover:bg-white/5 active:scale-[0.98] lg:flex-none lg:px-8"
            style={{ borderColor: "var(--archive-ink-dim)", color: "var(--archive-ink)" }}
          >
            SHARE
          </button>
          <button
            onClick={onReset}
            aria-label="Generate a new poster"
            title="Generate a new poster"
            className="grid min-h-11 w-12 shrink-0 place-items-center border text-2xl leading-none font-bold transition hover:bg-white/5 active:scale-[0.98]"
            style={{ borderColor: "var(--archive-ink-dim)", color: "var(--archive-ink)" }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer
      className="border-t px-8 py-8 text-center text-[10px] font-bold tracking-[0.3em]"
      style={{
        fontFamily: "var(--font-mono)",
        borderColor: "rgba(242,233,216,0.1)",
        color: "var(--archive-ink-dim)",
      }}
    >
      THE BEGINNING ARCHIVE · JIOHOTSTAR
    </footer>
  );
}
