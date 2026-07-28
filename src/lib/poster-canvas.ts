// Client-only poster renderer: draws the user's photo with a cinematic
// grade and the "I BEGAN ___" copy on top, entirely in <canvas>. No network
// calls — this is what stands in for the AI-generated output in the prototype.

const WIDTH = 1080;
const HEIGHT = 1350;

const INK = "#ffffff";
const INK_DIM = "#9aa0b4";
const BLUE = "#3b82f6";
const PURPLE = "#8b3ff0";
const PINK = "#ec1e7a";
const STAMP = PINK;

export interface PosterData {
  dataUrl: string;
  entryNumber: string;
  dateLabel: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function cssFontFamily(varName: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = attempt;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatDate(d: Date): string {
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "long" }).toUpperCase();
  return `${day} ${month} ${d.getFullYear()}`;
}

export async function renderPoster(
  photoSrc: string,
  sentence: string,
): Promise<PosterData> {
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }
  const img = await loadImage(photoSrc);

  const display = cssFontFamily("--font-display", "Georgia, serif");
  const mono = cssFontFamily("--font-mono", "'Courier New', monospace");

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");

  // 1. Photo, cover-fit, with a warm cinematic grade.
  ctx.filter = "contrast(1.1) saturate(0.7) brightness(0.82) sepia(0.18)";
  const scale = Math.max(WIDTH / img.width, HEIGHT / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  ctx.drawImage(img, (WIDTH - drawW) / 2, (HEIGHT - drawH) / 2, drawW, drawH);
  ctx.filter = "none";

  // 2. Blue-purple-pink brand wash + bottom scrim so text stays legible.
  const wash = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  wash.addColorStop(0, "rgba(59,130,246,0.25)");
  wash.addColorStop(0.55, "rgba(139,63,240,0.16)");
  wash.addColorStop(1, "rgba(10,10,16,0.4)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const scrim = ctx.createLinearGradient(0, HEIGHT * 0.34, 0, HEIGHT);
  scrim.addColorStop(0, "rgba(10,10,16,0)");
  scrim.addColorStop(1, "rgba(10,10,16,0.97)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const topScrim = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.22);
  topScrim.addColorStop(0, "rgba(10,10,16,0.6)");
  topScrim.addColorStop(1, "rgba(10,10,16,0)");
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, WIDTH, HEIGHT * 0.22);

  // 3. Film-grain speckle.
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 2200; i++) {
    const gx = Math.random() * WIDTH;
    const gy = Math.random() * HEIGHT;
    ctx.fillRect(gx, gy, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;

  const pad = 64;
  ctx.textBaseline = "alphabetic";

  // 4. Top label + rotating stamp mark.
  ctx.fillStyle = BLUE;
  ctx.font = `700 24px ${mono}`;
  ctx.fillText("THE BEGINNING ARCHIVE", pad, 92);

  ctx.save();
  ctx.translate(WIDTH - pad - 60, 58);
  ctx.rotate((-9 * Math.PI) / 180);
  ctx.strokeStyle = STAMP;
  ctx.lineWidth = 3;
  ctx.strokeRect(-58, -22, 116, 46);
  ctx.fillStyle = STAMP;
  ctx.font = `700 15px ${mono}`;
  ctx.textAlign = "center";
  ctx.fillText("VERIFIED", 0, -2);
  ctx.fillText("ENTRY", 0, 15);
  ctx.textAlign = "left";
  ctx.restore();

  // 5-8. Bottom block (headline, divider, date, ticket stub) is laid out
  // bottom-up with fixed spacing so it never overlaps regardless of how
  // many lines the goal text wraps to.
  const badgeH = 190;
  const badgeY = HEIGHT - 48 - badgeH;
  const dateBaseline = badgeY - 46;
  const dividerY = dateBaseline - 54;
  const lineHeight = 94;

  ctx.font = `italic 900 88px ${display}`;
  const goalLines = wrapText(ctx, sentence, WIDTH - pad * 2).slice(0, 2);
  const totalLines = 1 + goalLines.length;
  const firstBaseline = dividerY - 40 - (totalLines - 1) * lineHeight;

  ctx.fillStyle = INK;
  ctx.fillText("I began", pad, firstBaseline);

  const goalGradient = ctx.createLinearGradient(pad, 0, WIDTH - pad, 0);
  goalGradient.addColorStop(0, BLUE);
  goalGradient.addColorStop(0.55, PURPLE);
  goalGradient.addColorStop(1, PINK);
  ctx.fillStyle = goalGradient;
  goalLines.forEach((line, i) => {
    ctx.fillText(line, pad, firstBaseline + (i + 1) * lineHeight);
  });

  // 6. Divider.
  ctx.strokeStyle = PINK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(pad, dividerY);
  ctx.lineTo(pad + 140, dividerY);
  ctx.stroke();

  // 7. Date.
  const dateLabel = formatDate(new Date());
  ctx.fillStyle = BLUE;
  ctx.font = `700 30px ${mono}`;
  ctx.fillText(dateLabel, pad, dateBaseline);

  // 8. Verified-entry ticket stub.
  const entryNumber = Math.floor(100000 + Math.random() * 899999).toString();

  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(pad, badgeY, WIDTH - pad * 2, badgeH);
  ctx.setLineDash([]);

  // punch notches
  ctx.fillStyle = "#0a0a10";
  [pad, WIDTH - pad].forEach((cx) => {
    ctx.beginPath();
    ctx.arc(cx, badgeY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, badgeY + badgeH, 9, 0, Math.PI * 2);
    ctx.fill();
  });

  const innerPad = 32;
  ctx.fillStyle = INK_DIM;
  ctx.font = `700 20px ${mono}`;
  ctx.fillText("ENTRY NO.", pad + innerPad, badgeY + 44);
  ctx.fillStyle = INK;
  ctx.font = `700 30px ${mono}`;
  ctx.fillText(entryNumber, pad + innerPad, badgeY + 82);

  ctx.fillStyle = INK_DIM;
  ctx.font = `400 18px ${mono}`;
  ctx.fillText("Every Story Has A Beginning", pad + innerPad, badgeY + badgeH - 30);

  ctx.fillStyle = PINK;
  ctx.font = `italic 700 26px ${display}`;
  ctx.textAlign = "right";
  ctx.fillText("JioHotstar", WIDTH - pad - innerPad, badgeY + 82);
  ctx.textAlign = "left";

  return { dataUrl: canvas.toDataURL("image/jpeg", 0.92), entryNumber, dateLabel };
}
