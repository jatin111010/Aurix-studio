import { createCanvas, registerFont, type CanvasRenderingContext2D } from "canvas";
import fs from "fs";
import path from "path";
import type { AdTemplate } from "@/lib/ad-templates";
import { AD_SIZE } from "@/lib/ad-templates";
import type { AdCopyContent } from "@/lib/openai";

const FONT_FAMILY = "VeloraAd";
let fontsReady = false;

export type TextZones = {
  headline: { x: number; y: number; maxWidth: number };
  subheadline: { x: number; y: number; maxWidth: number };
  badge: { cx: number; cy: number; maxWidth: number } | null;
  cta: { cx: number; cy: number; maxWidth: number };
};

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

function wrapHeadline(text: string, maxChars = 26): string[] {
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

function trimToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 3 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

function drawTextWithShadow(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
  shadow = "rgba(0,0,0,0.35)",
): void {
  ctx.save();
  ctx.shadowColor = shadow;
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function getTextZones(template: AdTemplate, hasBadge: boolean): TextZones {
  const headerMid = template.header.height / 2;
  const badgeLeft =
    AD_SIZE - template.badge.right - template.badge.width;
  const badgeCx = badgeLeft + template.badge.width / 2;
  const badgeCy = template.badge.top + template.badge.height / 2;

  const ctaTop = AD_SIZE - template.cta.bottom - template.cta.height;
  const ctaCx = AD_SIZE / 2;
  const ctaCy = ctaTop + template.cta.height / 2;

  const headlineMaxW = hasBadge ? badgeLeft - 48 : AD_SIZE - 80;

  return {
    headline: {
      x: AD_SIZE / 2,
      y: headerMid - 28,
      maxWidth: headlineMaxW,
    },
    subheadline: {
      x: AD_SIZE / 2,
      y: headerMid + 42,
      maxWidth: AD_SIZE - 100,
    },
    badge: hasBadge
      ? { cx: badgeCx, cy: badgeCy, maxWidth: template.badge.width - 24 }
      : null,
    cta: {
      cx: ctaCx,
      cy: ctaCy,
      maxWidth: template.cta.width - 40,
    },
  };
}

export function renderAdTextLayer(
  copy: AdCopyContent,
  template: AdTemplate,
  zones: TextZones,
): Buffer {
  ensureFontsRegistered();

  const canvas = createCanvas(AD_SIZE, AD_SIZE);
  const ctx = canvas.getContext("2d");

  const headlineLines = wrapHeadline(copy.headline);
  const lineHeight = 58;

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `bold 50px "${FONT_FAMILY}"`;

  headlineLines.forEach((line, i) => {
    const trimmed = trimToWidth(ctx, line, zones.headline.maxWidth);
    drawTextWithShadow(
      ctx,
      trimmed,
      zones.headline.x,
      zones.headline.y + i * lineHeight,
      template.header.headlineColor,
      template.id === "minimal" ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.4)",
    );
  });

  ctx.font = `26px "${FONT_FAMILY}"`;
  const sub = trimToWidth(ctx, copy.subheadline, zones.subheadline.maxWidth);
  ctx.fillStyle = template.header.subColor;
  ctx.fillText(sub, zones.subheadline.x, zones.subheadline.y);

  if (zones.badge && copy.badge) {
    ctx.font = `bold 28px "${FONT_FAMILY}"`;
    ctx.textBaseline = "middle";
    const badgeText = trimToWidth(ctx, copy.badge, zones.badge.maxWidth);
    drawTextWithShadow(
      ctx,
      badgeText,
      zones.badge.cx,
      zones.badge.cy,
      template.badge.text,
      "rgba(0,0,0,0.25)",
    );
  }

  ctx.font = `bold 30px "${FONT_FAMILY}"`;
  ctx.textBaseline = "middle";
  const ctaText = trimToWidth(ctx, copy.cta, zones.cta.maxWidth);
  drawTextWithShadow(
    ctx,
    ctaText,
    zones.cta.cx,
    zones.cta.cy,
    template.cta.text,
    template.id === "minimal" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
  );

  return canvas.toBuffer("image/png");
}
