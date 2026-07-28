"use client";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/**
 * Downscales/re-encodes an image client-side before upload so a raw phone
 * photo (often 10-20MB+) doesn't hit the server's 8MB cap or waste upload
 * bandwidth — the edit model only ever sees ~1024x1536 anyway (see
 * SCENE_MODEL's `size` param in /api/generate), so anything larger is
 * wasted transfer, not extra fidelity.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );
  if (!blob) return file;

  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
