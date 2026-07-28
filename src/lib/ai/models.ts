export const SCENE_PLAN_MODEL = "anthropic/claude-sonnet-5";

/**
 * Candidate image-edit models for scene generation (spec 5.3: test 2-3 before
 * locking one in per category for cost/fidelity trade-off).
 *
 * Must be true ImageModel entries (support `generateImage`'s edit-mode
 * `{ images, mask, text }` prompt) — NOT Gemini's `*-flash-image` models,
 * which the AI SDK treats as language models with image *output* via
 * `generateText`'s `result.files`, a different call shape entirely.
 *
 * `gpt-image-1` and `gpt-image-1.5` are gated behind a higher Gateway tier
 * than this account currently has (confirmed 2026-07-21 — Vercel's "Free
 * Credit" balance alone doesn't unlock them). `gpt-image-1-mini` is
 * confirmed working today; swap the default back to the full model once
 * the account is upgraded, since fidelity matters more than cost here.
 */
export const SCENE_MODEL_CANDIDATES = [
  "openai/gpt-image-1-mini",
  "openai/gpt-image-1",
  "openai/gpt-image-1.5",
] as const;

export const SCENE_MODEL = SCENE_MODEL_CANDIDATES[0];
