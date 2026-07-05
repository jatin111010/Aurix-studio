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
import { renderAdTextLayer } from "@/lib/ad-text-canvas";

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

/** Fabric.js layout (shapes + product) + canvas text overlay. */
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
  const textLayer = renderAdTextLayer(copy, template, badge, cta);

  return sharp(basePng)
    .composite([{ input: textLayer, top: 0, left: 0 }])
    .png()
    .toBuffer();
}
