"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ensureAnonAuth } from "@/lib/firebase/client";
import { compressImageForUpload } from "@/lib/image-compress";

type Step = "idle" | "generating" | "result" | "error";

interface PosterFlowProps {
  onGenerated?: () => void;
}

export function PosterFlow({ onGenerated }: PosterFlowProps) {
  const [step, setStep] = useState<Step>("idle");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [goalText, setGoalText] = useState("");
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterId, setPosterId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(file: File | null) {
    if (!file) {
      setPhoto(null);
      setPhotoPreviewUrl(null);
      return;
    }

    // Preview immediately with the raw file; swap in the compressed
    // version (what actually gets uploaded) once it's ready.
    setPhotoPreviewUrl(URL.createObjectURL(file));
    const compressed = await compressImageForUpload(file);
    setPhoto(compressed);
  }

  async function handleGenerate() {
    if (!photo || !goalText.trim()) return;
    setStep("generating");
    setErrorMessage("");

    try {
      const user = await ensureAnonAuth();
      const idToken = await user.getIdToken();

      const form = new FormData();
      form.set("photo", photo);
      form.set("goalTextRaw", goalText);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");

      setPosterUrl(data.posterUrl);
      setPosterId(data.id);
      setStep("result");
      onGenerated?.();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Generation failed.");
      setStep("error");
    }
  }

  function reset() {
    setStep("idle");
    setPhoto(null);
    setPhotoPreviewUrl(null);
    setGoalText("");
    setPosterUrl(null);
    setPosterId(null);
    setErrorMessage("");
  }

  return (
    <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
      {/* Left: input */}
      <Card>
        <CardHeader>
          <CardTitle>Make your poster</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div
            className="mx-auto flex aspect-9/16 h-95 w-auto cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted"
            onClick={() => fileInputRef.current?.click()}
          >
            {photoPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreviewUrl} alt="Your photo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm text-muted-foreground">Add a photo of yours</span>
            )}
          </div>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="goal">This is what my dream is</Label>
            <Textarea
              id="goal"
              placeholder="I want to be a cricketer"
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
            />
          </div>

          <Button
            disabled={!photo || !goalText.trim() || step === "generating"}
            onClick={handleGenerate}
          >
            {step === "generating" ? "Generating..." : "Generate"}
          </Button>
        </CardContent>
      </Card>

      {/* Right: output */}
      <Card>
        <CardHeader>
          <CardTitle>Your poster</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {step === "idle" && (
            <div className="mx-auto flex aspect-9/16 h-95 w-auto items-center justify-center rounded-xl border border-dashed border-border bg-muted">
              <span className="text-sm text-muted-foreground">Your poster will appear here</span>
            </div>
          )}

          {step === "generating" && (
            <>
              <Skeleton className="mx-auto aspect-9/16 h-95 w-auto rounded-xl" />
              <p className="text-sm text-muted-foreground">Building your poster...</p>
            </>
          )}

          {step === "result" && posterUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={posterUrl} alt="Your poster" className="mx-auto h-95 w-auto rounded-xl object-cover" />
              <div className="flex gap-2">
                <Button render={<a href={posterUrl} download />} className="flex-1">
                  Download
                </Button>
                {posterId && (
                  <Button render={<Link href={`/p/${posterId}`} />} variant="secondary" className="flex-1">
                    Share
                  </Button>
                )}
              </div>
              <Button variant="ghost" onClick={reset}>
                Make another
              </Button>
            </>
          )}

          {step === "error" && (
            <>
              <div className="mx-auto flex aspect-9/16 h-95 w-auto items-center justify-center rounded-xl border border-dashed border-destructive/50 bg-muted">
                <p className="px-6 text-center text-sm text-destructive">{errorMessage}</p>
              </div>
              <Button onClick={reset}>Start over</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
