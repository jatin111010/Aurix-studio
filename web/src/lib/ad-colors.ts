/**
 * Extract dominant packaging colors from a die-cut product PNG.
 */

import sharp from "sharp";
import type { AdTemplate } from "@/lib/ad-templates";

export type BrandPalette = {
  primary: string;
  secondary: string;
  accent: string;
  isPrimaryDark: boolean;
};

type Rgb = { r: number; g: number; b: number };

const DEFAULT_PALETTE: BrandPalette = {
  primary: "#1e293b",
  secondary: "#475569",
  accent: "#f59e0b",
  isPrimaryDark: true,
};

function rgbToHex({ r, g, b }: Rgb): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function luminance({ r, g, b }: Rgb): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function saturation({ r, g, b }: Rgb): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === 0) return 0;
  return (max - min) / max;
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  return rgbToHex({
    r: Math.round(rgb.r * (1 - amount)),
    g: Math.round(rgb.g * (1 - amount)),
    b: Math.round(rgb.b * (1 - amount)),
  });
}

function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  return rgbToHex(mixRgb(rgb, { r: 255, g: 255, b: 255 }, amount));
}

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function readableTextColor(bgHex: string): string {
  const lum = luminance(hexToRgb(bgHex));
  return lum > 0.55 ? "#1c1917" : "#ffffff";
}

export async function extractBrandColors(
  productPng: Buffer,
): Promise<BrandPalette> {
  try {
    const { data, info } = await sharp(productPng)
      .resize(96, 96, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const buckets = new Map<string, { rgb: Rgb; count: number }>();

    for (let i = 0; i < data.length; i += info.channels) {
      const a = data[i + 3] ?? 255;
      if (a < 80) continue;

      const r = Math.round(data[i] / 24) * 24;
      const g = Math.round(data[i + 1] / 24) * 24;
      const b = Math.round(data[i + 2] / 24) * 24;
      const key = `${r},${g},${b}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        buckets.set(key, { rgb: { r, g, b }, count: 1 });
      }
    }

    const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
    if (sorted.length === 0) return DEFAULT_PALETTE;

    const vivid = [...sorted].sort(
      (a, b) => saturation(b.rgb) - saturation(a.rgb),
    );

    const primary = vivid[0]?.rgb ?? sorted[0].rgb;
    const secondary = sorted.find(
      (s) => colorDistance(s.rgb, primary) > 60,
    )?.rgb ?? sorted[1]?.rgb ?? primary;
    const accent =
      vivid.find((v) => colorDistance(v.rgb, primary) > 40)?.rgb ??
      boostSaturation(primary);

    const primaryHex = rgbToHex(primary);
    return {
      primary: primaryHex,
      secondary: rgbToHex(secondary),
      accent: rgbToHex(accent),
      isPrimaryDark: luminance(primary) < 0.45,
    };
  } catch {
    return DEFAULT_PALETTE;
  }
}

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.sqrt(
    (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2,
  );
}

function boostSaturation(rgb: Rgb): Rgb {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  if (max === min) return { r: Math.min(255, rgb.r + 40), g: rgb.g, b: rgb.b };
  const scale = 255 / max;
  return {
    r: Math.min(255, Math.round(rgb.r * scale)),
    g: Math.min(255, Math.round(rgb.g * scale)),
    b: Math.min(255, Math.round(rgb.b * scale)),
  };
}

/** Blend packaging colors into template while keeping text contrast. */
export function applyBrandPalette(
  template: AdTemplate,
  palette: BrandPalette,
  strength = 0.35,
): AdTemplate {
  const t = Math.min(0.5, Math.max(0.15, strength));
  const bgTop = blendHex(template.background.top, palette.primary, t * 0.6);
  const bgBottom = blendHex(
    template.background.bottom,
    palette.secondary,
    t * 0.8,
  );
  const accentLine = blendHex(template.header.accentLine, palette.accent, t);
  const ctaBg = blendHex(template.cta.bg, palette.accent, t * 0.7);
  const badgeBg = blendHex(template.badge.bg, palette.primary, t * 0.5);

  return {
    ...template,
    background: { top: bgTop, bottom: bgBottom },
    header: {
      ...template.header,
      accentLine,
      headlineColor: readableTextOnHeader(template.header.fill),
      subColor: readableSubOnHeader(template.header.fill),
    },
    product: {
      ...template.product,
      glowColor: hexToRgba(palette.accent, 0.14),
      shadowColor: palette.isPrimaryDark
        ? "rgba(0,0,0,0.42)"
        : "rgba(28,25,23,0.2)",
    },
    badge: {
      ...template.badge,
      bg: badgeBg,
      text: readableTextColor(badgeBg),
    },
    cta: {
      ...template.cta,
      bg: ctaBg,
      text: readableTextColor(ctaBg),
    },
    decor: {
      ...template.decor,
      accent: blendHex(template.decor.accent, palette.accent, t),
    },
  };
}

function readableTextOnHeader(headerFill: string): string {
  const rgba = parseRgba(headerFill);
  if (rgba) {
    return rgba.a > 0.5 && luminance({ r: rgba.r, g: rgba.g, b: rgba.b }) > 0.6
      ? "#1c1917"
      : "#ffffff";
  }
  return readableTextColor(headerFill);
}

function readableSubOnHeader(headerFill: string): string {
  const base = readableTextOnHeader(headerFill);
  return base === "#ffffff" ? "rgba(255,255,255,0.85)" : "#44403c";
}

function parseRgba(
  color: string,
): { r: number; g: number; b: number; a: number } | null {
  const m = color.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
  );
  if (!m) return null;
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: m[4] !== undefined ? Number(m[4]) : 1,
  };
}

function blendHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a.startsWith("#") ? a : "#333333");
  const cb = hexToRgb(b.startsWith("#") ? b : "#666666");
  return rgbToHex(mixRgb(ca, cb, t));
}

function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
