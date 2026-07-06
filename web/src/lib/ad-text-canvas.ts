import { createCanvas, registerFont, type CanvasRenderingContext2D } from "canvas";
import fs from "fs";
import path from "path";
import type { AdFontFamily, AdTemplate } from "@/lib/ad-templates";
import { AD_SIZE } from "@/lib/ad-layout-grid";
import type { AdLayoutZones } from "@/lib/ad-layout-grid";
import type { AdCopyContent } from "@/lib/openai";

const FONT_FILES: Record<
  AdFontFamily,
  { regular: string; bold: string }
> = {
  Poppins: {
    regular: "Poppins-Regular.ttf",
    bold: "Poppins-Bold.ttf",
  },
  Montserrat: {
    regular: "Montserrat-Regular.ttf",
    bold: "Montserrat-Bold.ttf",
  },
  Inter: {
    regular: "Inter-Regular.ttf",
    bold: "Inter-Bold.ttf",
  },
};

const registered = new Set<AdFontFamily>();

export type TextZones = AdLayoutZones;

function ensureFontFamily(family: AdFontFamily): void {
  if (registered.has(family)) return;

  const fontDir = path.join(process.cwd(), "assets/fonts");
  const files = FONT_FILES[family];

  const regularPath = path.join(fontDir, files.regular);
  const boldPath = path.join(fontDir, files.bold);

  if (!fs.existsSync(regularPath) || !fs.existsSync(boldPath)) {
    throw new Error(
      `Ad fonts missing for ${family}. Run: npm install (or node scripts/ensure-ad-fonts.mjs)`,
    );
  }

  registerFont(regularPath, { family, weight: "normal" });
  registerFont(boldPath, { family, weight: "bold" });
  registered.add(family);
}

function wrapHeadline(text: string, maxChars = 24): string[] {
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
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function getTextZones(
  template: AdTemplate,
  hasBadge: boolean,
  layoutZones?: AdLayoutZones,
): AdLayoutZones {
  if (layoutZones) return layoutZones;

  const headerMid = template.header.height / 2;
  const badgeLeft = AD_SIZE - template.badge.right - template.badge.width;
  const ctaTop = AD_SIZE - template.cta.bottom - template.cta.height;

  return {
    header: {
      top: 0,
      height: template.header.height,
      bottom: template.header.height,
    },
    product: {
      centerX: AD_SIZE / 2,
      centerY: AD_SIZE * template.product.centerY,
      maxWidth: AD_SIZE * template.product.maxWidthRatio,
      maxHeight: AD_SIZE * template.product.maxHeightRatio,
      top: AD_SIZE * template.product.centerY - (AD_SIZE * template.product.maxHeightRatio) / 2,
      bottom: AD_SIZE * template.product.centerY + (AD_SIZE * template.product.maxHeightRatio) / 2,
      left: (AD_SIZE - AD_SIZE * template.product.maxWidthRatio) / 2,
      right: (AD_SIZE + AD_SIZE * template.product.maxWidthRatio) / 2,
    },
    cta: {
      top: ctaTop,
      height: template.cta.height,
      width: template.cta.width,
      bottom: AD_SIZE - template.cta.bottom,
      centerX: AD_SIZE / 2,
      centerY: ctaTop + template.cta.height / 2,
    },
    badge: hasBadge
      ? {
          left: badgeLeft,
          top: template.badge.top,
          width: template.badge.width,
          height: template.badge.height,
          centerX: badgeLeft + template.badge.width / 2,
          centerY: template.badge.top + template.badge.height / 2,
        }
      : null,
    headline: {
      x: AD_SIZE / 2,
      y: headerMid - 32,
      maxWidth: hasBadge ? badgeLeft - 72 : AD_SIZE - 96,
    },
    subheadline: {
      x: AD_SIZE / 2,
      y: headerMid + 36,
      maxWidth: AD_SIZE - 96,
    },
  };
}

export function renderAdTextLayer(
  copy: AdCopyContent,
  template: AdTemplate,
  zones: AdLayoutZones,
): Buffer {
  ensureFontFamily(template.typography.headlineFamily);
  ensureFontFamily(template.typography.bodyFamily);

  const canvas = createCanvas(AD_SIZE, AD_SIZE);
  const ctx = canvas.getContext("2d");

  const { headlineFamily, bodyFamily, headlineSize, subSize, badgeSize, ctaSize } =
    template.typography;

  const headlineLines = wrapHeadline(copy.headline);
  const lineHeight = headlineSize + 10;
  const isLightHeader = template.header.headlineColor === "#ffffff" ||
    template.header.headlineColor === "#fafaf9" ||
    template.header.headlineColor === "#fffbeb" ||
    template.header.headlineColor === "#f8fafc";

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `bold ${headlineSize}px "${headlineFamily}"`;

  headlineLines.forEach((line, i) => {
    const y = zones.headline.y + i * lineHeight;
    const trimmed = trimToWidth(ctx, line, zones.headline.maxWidth);
    drawTextWithShadow(
      ctx,
      trimmed,
      zones.headline.x,
      y,
      template.header.headlineColor,
      isLightHeader ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.1)",
    );
  });

  ctx.font = `${subSize}px "${bodyFamily}"`;
  const sub = trimToWidth(ctx, copy.subheadline, zones.subheadline.maxWidth);
  ctx.fillStyle = template.header.subColor;
  ctx.fillText(sub, zones.subheadline.x, zones.subheadline.y);

  const offerText = copy.offer || copy.badge;
  if (zones.badge && offerText) {
    ctx.font = `bold ${badgeSize}px "${headlineFamily}"`;
    ctx.textBaseline = "middle";
    const badgeText = trimToWidth(ctx, offerText, zones.badge.width - 24);
    drawTextWithShadow(
      ctx,
      badgeText,
      zones.badge.centerX,
      zones.badge.centerY,
      template.badge.text,
      "rgba(0,0,0,0.28)",
    );
  }

  ctx.font = `bold ${ctaSize}px "${headlineFamily}"`;
  ctx.textBaseline = "middle";
  const ctaText = trimToWidth(ctx, copy.cta, zones.cta.width - 40);
  drawTextWithShadow(
    ctx,
    ctaText,
    zones.cta.centerX,
    zones.cta.centerY,
    template.cta.text,
    template.cta.text === "#ffffff" || template.cta.text === "#fafaf9"
      ? "rgba(0,0,0,0.15)"
      : "rgba(255,255,255,0.2)",
  );

  return canvas.toBuffer("image/png");
}
