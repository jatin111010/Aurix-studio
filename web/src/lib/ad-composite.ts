import {
  Ellipse,
  FabricImage,
  Gradient,
  Rect,
  StaticCanvas,
  type StaticCanvas as StaticCanvasType,
} from "fabric/node";
import sharp from "sharp";
import {
  AD_SIZE,
  getAdTemplateForBrief,
  type AdTemplate,
  type AdTemplateId,
} from "@/lib/ad-templates";
import type { AdCopyContent } from "@/lib/openai";
import {
  getTextZones,
  renderAdTextLayer,
  type TextZones,
} from "@/lib/ad-text-canvas";

export type { AdCopyContent };

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

function addCanvasBackground(
  canvas: StaticCanvasType,
  template: AdTemplate,
): void {
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

function addDecorations(canvas: StaticCanvasType, template: AdTemplate): void {
  if (template.decor.showSideStripe) {
    canvas.add(
      new Rect({
        left: 0,
        top: 0,
        width: 14,
        height: AD_SIZE,
        fill: template.decor.accent,
        selectable: false,
        evented: false,
      }),
    );
  }

  if (template.decor.showCornerOrbs) {
    for (const [left, top] of [
      [60, 60],
      [AD_SIZE - 60, 60],
      [60, AD_SIZE - 60],
      [AD_SIZE - 60, AD_SIZE - 60],
    ] as const) {
      canvas.add(
        new Ellipse({
          left,
          top,
          rx: 80,
          ry: 80,
          fill: "rgba(251, 191, 36, 0.12)",
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
        }),
      );
    }
  }

  if (template.id === "minimal") {
    canvas.add(
      new Rect({
        left: 36,
        top: template.header.height + 24,
        width: AD_SIZE - 72,
        height: 2,
        fill: "rgba(28, 25, 23, 0.08)",
        selectable: false,
        evented: false,
      }),
    );
  }
}

function addHeaderBand(canvas: StaticCanvasType, template: AdTemplate): void {
  canvas.add(
    new Rect({
      left: 0,
      top: 0,
      width: AD_SIZE,
      height: template.header.height,
      fill: template.header.fill,
      selectable: false,
      evented: false,
    }),
  );

  canvas.add(
    new Rect({
      left: 0,
      top: template.header.height - 5,
      width: AD_SIZE,
      height: 5,
      fill: template.header.accentLine,
      selectable: false,
      evented: false,
    }),
  );
}

function addProductStage(
  canvas: StaticCanvasType,
  template: AdTemplate,
): void {
  const cy = AD_SIZE * template.product.centerY;

  canvas.add(
    new Ellipse({
      left: AD_SIZE / 2,
      top: cy + AD_SIZE * 0.14,
      rx: AD_SIZE * 0.32,
      ry: AD_SIZE * 0.045,
      fill: template.product.shadowColor,
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    }),
  );

  canvas.add(
    new Ellipse({
      left: AD_SIZE / 2,
      top: cy,
      rx: AD_SIZE * 0.34,
      ry: AD_SIZE * 0.34,
      fill: template.product.glowColor,
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    }),
  );
}

function addBadgeShape(
  canvas: StaticCanvasType,
  template: AdTemplate,
): { cx: number; cy: number } | null {
  const b = template.badge;
  const left = AD_SIZE - b.right - b.width;
  const top = b.top;

  canvas.add(
    new Rect({
      left: left + 3,
      top: top + 4,
      width: b.width,
      height: b.height,
      rx: b.height / 2,
      ry: b.height / 2,
      fill: "rgba(0,0,0,0.22)",
      selectable: false,
      evented: false,
    }),
  );

  canvas.add(
    new Rect({
      left,
      top,
      width: b.width,
      height: b.height,
      rx: b.height / 2,
      ry: b.height / 2,
      fill: b.bg,
      selectable: false,
      evented: false,
    }),
  );

  return { cx: left + b.width / 2, cy: top + b.height / 2 };
}

function addCtaBar(
  canvas: StaticCanvasType,
  template: AdTemplate,
): { cx: number; cy: number } {
  const c = template.cta;
  const left = (AD_SIZE - c.width) / 2;
  const top = AD_SIZE - c.bottom - c.height;

  canvas.add(
    new Rect({
      left: left + 2,
      top: top + 3,
      width: c.width,
      height: c.height,
      rx: c.height / 2,
      ry: c.height / 2,
      fill: "rgba(0,0,0,0.25)",
      selectable: false,
      evented: false,
    }),
  );

  canvas.add(
    new Rect({
      left,
      top,
      width: c.width,
      height: c.height,
      rx: c.height / 2,
      ry: c.height / 2,
      fill: c.bg,
      selectable: false,
      evented: false,
    }),
  );

  return { cx: AD_SIZE / 2, cy: top + c.height / 2 };
}

function layoutProduct(img: FabricImage, template: AdTemplate): void {
  const maxW = AD_SIZE * template.product.maxWidthRatio;
  const maxH = AD_SIZE * template.product.maxHeightRatio;
  const scale = Math.min(maxW / (img.width ?? 1), maxH / (img.height ?? 1));
  img.scale(scale);
  img.set({
    left: AD_SIZE / 2,
    top: AD_SIZE * template.product.centerY,
  });
}

/**
 * Composite a die-cut product PNG onto a styled ad template.
 * Product should be transparent background (from diecutImage).
 */
export async function compositeAdPost(
  productPng: Buffer,
  copy: AdCopyContent,
  templateId: AdTemplateId,
  backgroundId = "studio",
): Promise<Buffer> {
  const template = getAdTemplateForBrief(templateId, backgroundId);
  const canvas = new StaticCanvas(undefined, {
    width: AD_SIZE,
    height: AD_SIZE,
  });

  addCanvasBackground(canvas, template);
  addDecorations(canvas, template);
  addHeaderBand(canvas, template);

  const hasBadge = Boolean(copy.badge);
  if (hasBadge) addBadgeShape(canvas, template);

  addProductStage(canvas, template);

  const product = await loadProductImage(productPng);
  layoutProduct(product, template);
  canvas.add(product);

  addCtaBar(canvas, template);

  const zones: TextZones = getTextZones(template, hasBadge);
  const basePng = await canvasToPngBuffer(canvas);
  const textLayer = renderAdTextLayer(copy, template, zones);

  return sharp(basePng)
    .composite([{ input: textLayer, top: 0, left: 0 }])
    .png()
    .toBuffer();
}
