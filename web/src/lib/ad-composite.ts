import {
  Circle,
  FabricImage,
  Gradient,
  Rect,
  StaticCanvas,
  type StaticCanvas as StaticCanvasType,
} from "fabric/node";
import sharp from "sharp";
import {
  AD_SIZE,
  getAdTemplate,
  type AdTemplate,
  type AdTemplateId,
} from "@/lib/ad-templates";
import type { AdCopyContent } from "@/lib/openai";

export type { AdCopyContent };

const FONT = "DejaVu Sans, Liberation Sans, Arial, sans-serif";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .slice(0, 80);
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

function canvasToPngBuffer(canvas: StaticCanvasType): Promise<Buffer> {
  canvas.renderAll();
  return new Promise((resolve, reject) => {
    const stream = canvas.createPNGStream();
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function loadProductImage(productPng: Buffer): Promise<FabricImage> {
  const dataUrl = `data:image/png;base64,${productPng.toString("base64")}`;
  const img = await FabricImage.fromURL(dataUrl);
  img.set({ originX: "center", originY: "center" });
  return img;
}

function addBackground(canvas: StaticCanvasType, template: AdTemplate): void {
  const bg = new Rect({
    left: 0,
    top: 0,
    width: AD_SIZE,
    height: AD_SIZE,
    selectable: false,
    evented: false,
  });

  bg.set(
    "fill",
    new Gradient({
      type: "linear",
      coords: { x1: 0, y1: 0, x2: 0, y2: AD_SIZE },
      colorStops: [
        { offset: 0, color: template.background.top },
        { offset: 1, color: template.background.bottom },
      ],
    }),
  );

  canvas.add(bg);
}

function layoutProduct(img: FabricImage): void {
  const maxW = AD_SIZE * 0.72;
  const maxH = AD_SIZE * 0.52;
  const scale = Math.min(maxW / (img.width ?? 1), maxH / (img.height ?? 1));
  img.scale(scale);
  img.set({
    left: AD_SIZE / 2,
    top: AD_SIZE * 0.56,
  });
}

function addBadgeShape(
  canvas: StaticCanvasType,
  template: AdTemplate,
): { cx: number; cy: number } | null {
  const badgeW = 200;
  const badgeH = 56;
  const left = AD_SIZE - badgeW - 36;
  const top = 36;

  canvas.add(
    new Rect({
      left,
      top,
      width: badgeW,
      height: badgeH,
      rx: 28,
      ry: 28,
      fill: template.badgeBg,
      selectable: false,
      evented: false,
    }),
  );

  return { cx: left + badgeW / 2, cy: top + badgeH / 2 };
}

function addCtaShape(
  canvas: StaticCanvasType,
  template: AdTemplate,
): { cx: number; cy: number } {
  const btnW = 360;
  const btnH = 64;
  const left = (AD_SIZE - btnW) / 2;
  const top = AD_SIZE * 0.86;

  canvas.add(
    new Rect({
      left,
      top,
      width: btnW,
      height: btnH,
      rx: 32,
      ry: 32,
      fill: template.ctaBg,
      selectable: false,
      evented: false,
    }),
  );

  return { cx: AD_SIZE / 2, cy: top + btnH / 2 };
}

function addProductFrame(canvas: StaticCanvasType, template: AdTemplate): void {
  canvas.add(
    new Circle({
      left: AD_SIZE / 2,
      top: AD_SIZE * 0.56,
      radius: AD_SIZE * 0.36,
      fill: "rgba(255,255,255,0.08)",
      stroke: template.accent,
      strokeWidth: 3,
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    }),
  );
}

/** SVG text overlay — works on Vercel/Linux (FabricText does not). */
function buildTextOverlaySvg(
  copy: AdCopyContent,
  template: AdTemplate,
  badge: { cx: number; cy: number } | null,
  cta: { cx: number; cy: number },
): string {
  const headlineLines = wrapHeadline(copy.headline);
  const headlineY = AD_SIZE * 0.1;
  const lineHeight = 62;

  const headlineSvg = headlineLines
    .map(
      (line, i) =>
        `<text x="${AD_SIZE / 2}" y="${headlineY + i * lineHeight}" font-family="${FONT}" font-size="52" font-weight="700" fill="${template.headlineColor}" text-anchor="middle">${escapeXml(line)}</text>`,
    )
    .join("\n");

  return `<svg width="${AD_SIZE}" height="${AD_SIZE}" xmlns="http://www.w3.org/2000/svg">
  ${headlineSvg}
  <text x="${AD_SIZE / 2}" y="${AD_SIZE * 0.22}" font-family="${FONT}" font-size="28" fill="${template.subColor}" text-anchor="middle">${escapeXml(copy.subheadline)}</text>
  ${badge && copy.badge ? `<text x="${badge.cx}" y="${badge.cy + 10}" font-family="${FONT}" font-size="26" font-weight="700" fill="${template.badgeText}" text-anchor="middle">${escapeXml(copy.badge)}</text>` : ""}
  <text x="${cta.cx}" y="${cta.cy + 10}" font-family="${FONT}" font-size="28" font-weight="700" fill="${template.ctaText}" text-anchor="middle">${escapeXml(copy.cta)}</text>
</svg>`;
}

async function applyTextOverlay(
  basePng: Buffer,
  copy: AdCopyContent,
  template: AdTemplate,
  badge: { cx: number; cy: number } | null,
  cta: { cx: number; cy: number },
): Promise<Buffer> {
  const svg = buildTextOverlaySvg(copy, template, badge, cta);
  return sharp(basePng)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

/**
 * Fabric.js layout (shapes + product) + Sharp SVG text overlay.
 */
export async function compositeAdPost(
  productPng: Buffer,
  copy: AdCopyContent,
  templateId: AdTemplateId,
): Promise<Buffer> {
  const template = getAdTemplate(templateId);
  const canvas = new StaticCanvas(undefined, {
    width: AD_SIZE,
    height: AD_SIZE,
  });

  addBackground(canvas, template);
  const badge = copy.badge ? addBadgeShape(canvas, template) : null;
  addProductFrame(canvas, template);

  const product = await loadProductImage(productPng);
  layoutProduct(product);
  canvas.add(product);

  const cta = addCtaShape(canvas, template);

  const basePng = await canvasToPngBuffer(canvas);
  return applyTextOverlay(basePng, copy, template, badge, cta);
}
