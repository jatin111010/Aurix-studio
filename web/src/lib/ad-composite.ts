import {
  Ellipse,
  FabricImage,
  Gradient,
  Rect,
  StaticCanvas,
  type StaticCanvas as StaticCanvasType,
} from "fabric/node";
import sharp from "sharp";
import type { ProductCategory } from "@/lib/ad-category";
import { getLayoutProfile } from "@/lib/ad-category";
import type { BrandPalette } from "@/lib/ad-colors";
import {
  AD_SIZE,
  computeLayoutZones,
  gridSpanWidth,
  GRID_MARGIN,
  type AdLayoutZones,
} from "@/lib/ad-layout-grid";
import {
  buildAdTemplate,
  type AdTemplate,
  type AdTemplateId,
} from "@/lib/ad-templates";
import type { AdCopyContent } from "@/lib/openai";
import { getTextZones, renderAdTextLayer } from "@/lib/ad-text-canvas";

export type { AdCopyContent };

export type CompositeAdOptions = {
  backgroundId?: string;
  category?: ProductCategory;
  brandPalette?: BrandPalette;
};

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
      coords: { x1: 0, y1: 0, x2: AD_SIZE * 0.2, y2: AD_SIZE },
      colorStops: [
        { offset: 0, color: template.background.top },
        { offset: 0.55, color: template.background.bottom },
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
        width: 12,
        height: AD_SIZE,
        fill: template.decor.accent,
        selectable: false,
        evented: false,
      }),
    );
  }

  if (template.decor.showCornerOrbs) {
    for (const [left, top, rx, ry] of [
      [72, 72, 90, 90],
      [AD_SIZE - 72, 72, 90, 90],
      [72, AD_SIZE - 72, 70, 70],
      [AD_SIZE - 72, AD_SIZE - 72, 70, 70],
    ] as const) {
      canvas.add(
        new Ellipse({
          left,
          top,
          rx,
          ry,
          fill: hexToRgba(template.decor.accent, 0.1),
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
        }),
      );
    }
  }

  if (template.decor.showDivider) {
    canvas.add(
      new Rect({
        left: GRID_MARGIN,
        top: template.header.height + 20,
        width: gridSpanWidth(10),
        height: 2,
        fill: hexToRgba(template.decor.accent, 0.2),
        selectable: false,
        evented: false,
      }),
    );
  }

  if (template.id === "luxury" && template.decor.showPedestal) {
    canvas.add(
      new Ellipse({
        left: AD_SIZE / 2,
        top: AD_SIZE * 0.68,
        rx: AD_SIZE * 0.28,
        ry: 8,
        fill: hexToRgba(template.decor.accent, 0.35),
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
      }),
    );
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
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
      left: GRID_MARGIN,
      top: template.header.height - 4,
      width: gridSpanWidth(10),
      height: 4,
      fill: template.header.accentLine,
      selectable: false,
      evented: false,
    }),
  );
}

function addProductShadow(
  canvas: StaticCanvasType,
  zones: AdLayoutZones,
  template: AdTemplate,
): void {
  const cy = zones.product.centerY;

  for (const [offset, rxMul, opacity] of [
    [0.16, 0.34, 0.35],
    [0.14, 0.3, 0.25],
    [0.12, 0.26, 0.15],
  ] as const) {
    canvas.add(
      new Ellipse({
        left: AD_SIZE / 2,
        top: cy + AD_SIZE * offset,
        rx: AD_SIZE * rxMul,
        ry: AD_SIZE * 0.038,
        fill: `rgba(0,0,0,${opacity})`,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
      }),
    );
  }

  canvas.add(
    new Ellipse({
      left: AD_SIZE / 2,
      top: cy,
      rx: zones.product.maxWidth * 0.42,
      ry: zones.product.maxHeight * 0.42,
      fill: template.product.glowColor,
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    }),
  );
}

function addRoundedPill(
  canvas: StaticCanvasType,
  left: number,
  top: number,
  width: number,
  height: number,
  fill: string,
  withShadow = true,
): void {
  const rx = height / 2;

  if (withShadow) {
    canvas.add(
      new Rect({
        left: left + 3,
        top: top + 4,
        width,
        height,
        rx,
        ry: rx,
        fill: "rgba(0,0,0,0.22)",
        selectable: false,
        evented: false,
      }),
    );
  }

  canvas.add(
    new Rect({
      left,
      top,
      width,
      height,
      rx,
      ry: rx,
      fill,
      selectable: false,
      evented: false,
    }),
  );
}

function addBadgeShape(
  canvas: StaticCanvasType,
  template: AdTemplate,
  zones: AdLayoutZones,
): void {
  if (!zones.badge) return;
  addRoundedPill(
    canvas,
    zones.badge.left,
    zones.badge.top,
    zones.badge.width,
    zones.badge.height,
    template.badge.bg,
  );
}

function addCtaBar(
  canvas: StaticCanvasType,
  template: AdTemplate,
  zones: AdLayoutZones,
): void {
  const left = (AD_SIZE - zones.cta.width) / 2;
  addRoundedPill(
    canvas,
    left,
    zones.cta.top,
    zones.cta.width,
    zones.cta.height,
    template.cta.bg,
  );
}

function layoutProduct(
  img: FabricImage,
  zones: AdLayoutZones,
): void {
  const maxW = zones.product.maxWidth;
  const maxH = zones.product.maxHeight;
  const scale = Math.min(maxW / (img.width ?? 1), maxH / (img.height ?? 1));
  img.scale(scale);
  img.set({
    left: zones.product.centerX,
    top: zones.product.centerY,
  });
}

/**
 * Composite a die-cut product PNG onto a premium ad layout.
 * Text is confined to header + CTA bands — never over the product.
 */
export async function compositeAdPost(
  productPng: Buffer,
  copy: AdCopyContent,
  templateId: AdTemplateId,
  options: CompositeAdOptions = {},
): Promise<Buffer> {
  const category = options.category ?? "general";
  const template = buildAdTemplate({
    templateId,
    backgroundId: options.backgroundId,
    category,
    brandPalette: options.brandPalette,
  });

  const profile = getLayoutProfile(category);
  const hasBadge = Boolean(copy.offer || copy.badge);
  const zones = computeLayoutZones(template, profile, hasBadge);

  const canvas = new StaticCanvas(undefined, {
    width: AD_SIZE,
    height: AD_SIZE,
  });

  addCanvasBackground(canvas, template);
  addDecorations(canvas, template);
  addHeaderBand(canvas, template);

  if (hasBadge) addBadgeShape(canvas, template, zones);

  addProductShadow(canvas, zones, template);

  const product = await loadProductImage(productPng);
  layoutProduct(product, zones);
  canvas.add(product);

  addCtaBar(canvas, template, zones);

  const textZones = getTextZones(template, hasBadge, zones);
  const basePng = await canvasToPngBuffer(canvas);
  const textLayer = renderAdTextLayer(copy, template, textZones);

  return sharp(basePng)
    .composite([{ input: textLayer, top: 0, left: 0 }])
    .png()
    .toBuffer();
}
