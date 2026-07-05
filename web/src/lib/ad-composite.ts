import {
  Circle,
  FabricImage,
  FabricText,
  Gradient,
  Rect,
  StaticCanvas,
  type StaticCanvas as StaticCanvasType,
} from "fabric/node";
import {
  AD_SIZE,
  pickAdTemplate,
  type AdTemplate,
} from "@/lib/ad-templates";
import type { AdCopyContent } from "@/lib/openai";

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

function addHeadline(
  canvas: StaticCanvasType,
  text: string,
  template: AdTemplate,
): void {
  const headline = new FabricText(text, {
    left: AD_SIZE / 2,
    top: AD_SIZE * 0.08,
    originX: "center",
    originY: "top",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontWeight: "700",
    fontSize: 56,
    fill: template.headlineColor,
    textAlign: "center",
    width: AD_SIZE - 120,
  });
  canvas.add(headline);
}

function addSubheadline(
  canvas: StaticCanvasType,
  text: string,
  template: AdTemplate,
): void {
  const sub = new FabricText(text, {
    left: AD_SIZE / 2,
    top: AD_SIZE * 0.17,
    originX: "center",
    originY: "top",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: 28,
    fill: template.subColor,
    textAlign: "center",
    width: AD_SIZE - 140,
  });
  canvas.add(sub);
}

function addBadge(
  canvas: StaticCanvasType,
  text: string,
  template: AdTemplate,
): void {
  const badgeW = 200;
  const badgeH = 56;
  const left = AD_SIZE - badgeW - 36;
  const top = 36;

  const pill = new Rect({
    left,
    top,
    width: badgeW,
    height: badgeH,
    rx: 28,
    ry: 28,
    fill: template.badgeBg,
    selectable: false,
    evented: false,
  });
  canvas.add(pill);

  const label = new FabricText(text, {
    left: left + badgeW / 2,
    top: top + badgeH / 2,
    originX: "center",
    originY: "center",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontWeight: "700",
    fontSize: 26,
    fill: template.badgeText,
    textAlign: "center",
  });
  canvas.add(label);
}

function addCtaButton(
  canvas: StaticCanvasType,
  text: string,
  template: AdTemplate,
): void {
  const btnW = 360;
  const btnH = 64;
  const left = (AD_SIZE - btnW) / 2;
  const top = AD_SIZE * 0.86;

  const btn = new Rect({
    left,
    top,
    width: btnW,
    height: btnH,
    rx: 32,
    ry: 32,
    fill: template.ctaBg,
    selectable: false,
    evented: false,
  });
  canvas.add(btn);

  const label = new FabricText(text, {
    left: AD_SIZE / 2,
    top: top + btnH / 2,
    originX: "center",
    originY: "center",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontWeight: "700",
    fontSize: 28,
    fill: template.ctaText,
    textAlign: "center",
  });
  canvas.add(label);
}

function addProductFrame(canvas: StaticCanvasType, template: AdTemplate): void {
  const frame = new Circle({
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
  });
  canvas.add(frame);
}

/**
 * Build a full social ad post: Fabric.js layout + Photoroom product hero image.
 */
export async function compositeAdPost(
  productPng: Buffer,
  copy: AdCopyContent,
  backgroundId: string,
): Promise<Buffer> {
  const template = pickAdTemplate(backgroundId);
  const canvas = new StaticCanvas(undefined, {
    width: AD_SIZE,
    height: AD_SIZE,
  });

  addBackground(canvas, template);
  addHeadline(canvas, copy.headline, template);
  addSubheadline(canvas, copy.subheadline, template);
  addBadge(canvas, copy.badge, template);
  addProductFrame(canvas, template);

  const product = await loadProductImage(productPng);
  layoutProduct(product);
  canvas.add(product);

  addCtaButton(canvas, copy.cta, template);

  return canvasToPngBuffer(canvas);
}
