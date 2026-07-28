export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1920;

export interface PosterShellOptions {
  premiseLine: string;
  ctaText?: string;
}

const DEFAULT_CTA = "Make yours → starring.app";
const SIDE_MARGIN = 72;
const MAX_TEXT_WIDTH = POSTER_WIDTH - SIDE_MARGIN * 2;
const MAX_LINES = 3;
const LINE_HEIGHT_RATIO = 1.08;
const CTA_BASELINE_FROM_BOTTOM = 96;
const GAP_ABOVE_CTA = 60;

// Rough average glyph width for a bold sans-serif at a given font size —
// good enough for greedy word-wrap without a real text-measurement pass.
const AVG_CHAR_WIDTH_RATIO = 0.56;

/**
 * Deterministic SVG overlay: premise line + gradient/vignette + CTA.
 * Rendered on top of the generated background+subject composite image.
 * Kept as pure code (no AI call) per spec 5.4 — one-time design, not per-request.
 *
 * Premise-line length varies a lot (user-editable), so this wraps to
 * multiple lines and shrinks the font size until it fits within
 * MAX_LINES, rather than letting long lines clip off the canvas.
 */
export function buildPosterShellSvg({ premiseLine, ctaText = DEFAULT_CTA }: PosterShellOptions): string {
  const safeCta = escapeXml(ctaText);

  const { lines, fontSize } = fitPremiseLine(premiseLine);
  const lineHeight = fontSize * LINE_HEIGHT_RATIO;
  const ctaBaselineY = POSTER_HEIGHT - CTA_BASELINE_FROM_BOTTOM;
  const lastLineBaselineY = ctaBaselineY - GAP_ABOVE_CTA;
  const firstLineBaselineY = lastLineBaselineY - lineHeight * (lines.length - 1);

  const premiseTspans = lines
    .map(
      (line, i) =>
        `<tspan x="${SIDE_MARGIN}" y="${firstLineBaselineY + i * lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join("\n    ");

  return `
<svg width="${POSTER_WIDTH}" height="${POSTER_HEIGHT}" viewBox="0 0 ${POSTER_WIDTH} ${POSTER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bottomVignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0" />
      <stop offset="55%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.85" />
    </linearGradient>
    <linearGradient id="topVignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.35" />
      <stop offset="18%" stop-color="#000000" stop-opacity="0" />
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="${POSTER_WIDTH}" height="${POSTER_HEIGHT}" fill="url(#topVignette)" />
  <rect x="0" y="0" width="${POSTER_WIDTH}" height="${POSTER_HEIGHT}" fill="url(#bottomVignette)" />

  <text
    font-family="Helvetica, Arial, sans-serif"
    font-weight="800"
    font-size="${fontSize}"
    fill="#ffffff"
    letter-spacing="-1"
  >
    ${premiseTspans}
  </text>

  <text
    x="${SIDE_MARGIN}"
    y="${ctaBaselineY}"
    font-family="Helvetica, Arial, sans-serif"
    font-weight="500"
    font-size="34"
    fill="#e5e5e5"
  >${safeCta}</text>
</svg>`.trim();
}

function fitPremiseLine(premiseLine: string): { lines: string[]; fontSize: number } {
  const words = premiseLine.trim().split(/\s+/).filter(Boolean);

  for (let fontSize = 76; fontSize >= 44; fontSize -= 4) {
    const maxCharsPerLine = Math.floor(MAX_TEXT_WIDTH / (fontSize * AVG_CHAR_WIDTH_RATIO));
    const lines = wrapWords(words, maxCharsPerLine);
    if (lines.length <= MAX_LINES) {
      return { lines, fontSize };
    }
  }

  // Fallback: smallest size, hard-truncate to MAX_LINES.
  const fontSize = 44;
  const maxCharsPerLine = Math.floor(MAX_TEXT_WIDTH / (fontSize * AVG_CHAR_WIDTH_RATIO));
  const lines = wrapWords(words, maxCharsPerLine).slice(0, MAX_LINES);
  return { lines, fontSize };
}

function wrapWords(words: string[], maxCharsPerLine: number): string[] {
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  return lines;
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
