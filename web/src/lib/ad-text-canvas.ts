import { createCanvas, registerFont } from "canvas";
import fs from "fs";
import path from "path";
import type { AdTemplate } from "@/lib/ad-templates";
import { AD_SIZE } from "@/lib/ad-templates";
import type { AdCopyContent } from "@/lib/openai";

const FONT_FAMILY = "VeloraAd";
let fontsReady = false;

function ensureFontsRegistered(): void {
  if (fontsReady) return;

  const fontDir = path.join(process.cwd(), "assets/fonts");
  const regular = path.join(fontDir, "DejaVuSans.ttf");
  const bold = path.join(fontDir, "DejaVuSans-Bold.ttf");

  if (!fs.existsSync(regular) || !fs.existsSync(bold)) {
    throw new Error(
      "Ad fonts missing. Run: npm install (or node scripts/ensure-ad-fonts.mjs)",
    );
  }

  registerFont(regular, { family: FONT_FAMILY, weight: "normal" });
  registerFont(bold, { family: FONT_FAMILY, weight: "bold" });
  fontsReady = true;
}

function wrapHeadline(text: string, maxChars = 28): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function trimLine(
  text: string,
  maxWidth: number,
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
): string {
  if (!ctx) return text;
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 3 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

/**
 * Renders ad copy as a transparent PNG using node-canvas + bundled TTF fonts.
 * Works on Vercel (unlike Sharp SVG &lt;text&gt;, which needs system fontconfig).
 */
export function renderAdTextLayer(
  copy: AdCopyContent,
  template: AdTemplate,
  badge: { cx: number; cy: number } | null,
  cta: { cx: number; cy: number },
): Buffer {
  ensureFontsRegistered();

  const canvas = createCanvas(AD_SIZE, AD_SIZE);
  const ctx = canvas.getContext("2d");

  const headlineLines = wrapHeadline(copy.headline);
  const headlineY = AD_SIZE * 0.1;
  const lineHeight = 62;

  ctx.fillStyle = template.headlineColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `bold 52px "${FONT_FAMILY}"`;
  headlineLines.forEach((line, i) => {
    ctx.fillText(line, AD_SIZE / 2, headlineY + i * lineHeight);
  });

  ctx.font = `28px "${FONT_FAMILY}"`;
  ctx.fillStyle = template.subColor;
  const sub = trimLine(copy.subheadline, AD_SIZE * 0.9, ctx);
  ctx.fillText(sub, AD_SIZE / 2, AD_SIZE * 0.22);

  if (badge && copy.badge) {
    ctx.font = `bold 26px "${FONT_FAMILY}"`;
    ctx.fillStyle = template.badgeText;
    ctx.textBaseline = "middle";
    ctx.fillText(copy.badge, badge.cx, badge.cy);
  }

  ctx.font = `bold 28px "${FONT_FAMILY}"`;
  ctx.fillStyle = template.ctaText;
  ctx.textBaseline = "middle";
  const ctaText = trimLine(copy.cta, 320, ctx);
  ctx.fillText(ctaText, cta.cx, cta.cy);

  return canvas.toBuffer("image/png");
}
