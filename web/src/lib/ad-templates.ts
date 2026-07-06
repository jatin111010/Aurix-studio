/** Premium Canva-style ad templates (1080×1080). */

import { applyBrandPalette, type BrandPalette } from "@/lib/ad-colors";
import {
  getLayoutProfile,
  type LayoutProfile,
  type ProductCategory,
} from "@/lib/ad-category";
import { AD_SIZE } from "@/lib/ad-layout-grid";

export { AD_SIZE };

export type AdTemplateId =
  | "luxury"
  | "minimal"
  | "festival"
  | "grocery"
  | "fashion"
  | "electronics";

export type AdFontFamily = "Poppins" | "Montserrat" | "Inter";

export type AdTemplate = {
  id: AdTemplateId;
  label: string;
  background: { top: string; bottom: string };
  header: {
    height: number;
    fill: string;
    headlineColor: string;
    subColor: string;
    accentLine: string;
  };
  typography: {
    headlineFamily: AdFontFamily;
    bodyFamily: AdFontFamily;
    headlineSize: number;
    subSize: number;
    badgeSize: number;
    ctaSize: number;
  };
  product: {
    centerY: number;
    maxWidthRatio: number;
    maxHeightRatio: number;
    shadowColor: string;
    glowColor: string;
  };
  badge: {
    bg: string;
    text: string;
    width: number;
    height: number;
    top: number;
    right: number;
  };
  cta: {
    bg: string;
    text: string;
    height: number;
    bottom: number;
    width: number;
  };
  decor: {
    accent: string;
    showCornerOrbs: boolean;
    showSideStripe: boolean;
    showPedestal: boolean;
    showDivider: boolean;
  };
};

export const AD_TEMPLATES: Record<AdTemplateId, AdTemplate> = {
  luxury: {
    id: "luxury",
    label: "Luxury",
    background: { top: "#0c0a09", bottom: "#292524" },
    header: {
      height: 292,
      fill: "rgba(12, 10, 9, 0.94)",
      headlineColor: "#fafaf9",
      subColor: "rgba(250, 250, 249, 0.78)",
      accentLine: "#d4af37",
    },
    typography: {
      headlineFamily: "Montserrat",
      bodyFamily: "Inter",
      headlineSize: 46,
      subSize: 24,
      badgeSize: 26,
      ctaSize: 28,
    },
    product: {
      centerY: 0.53,
      maxWidthRatio: 0.68,
      maxHeightRatio: 0.52,
      shadowColor: "rgba(0,0,0,0.5)",
      glowColor: "rgba(212, 175, 55, 0.14)",
    },
    badge: {
      bg: "#b8860b",
      text: "#ffffff",
      width: 208,
      height: 56,
      top: 50,
      right: 44,
    },
    cta: {
      bg: "#d4af37",
      text: "#1c1917",
      height: 74,
      bottom: 46,
      width: 396,
    },
    decor: {
      accent: "#d4af37",
      showCornerOrbs: false,
      showSideStripe: false,
      showPedestal: true,
      showDivider: false,
    },
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    background: { top: "#ffffff", bottom: "#f5f5f4" },
    header: {
      height: 276,
      fill: "rgba(255, 255, 255, 0.98)",
      headlineColor: "#1c1917",
      subColor: "#57534e",
      accentLine: "#a8a29e",
    },
    typography: {
      headlineFamily: "Inter",
      bodyFamily: "Inter",
      headlineSize: 44,
      subSize: 23,
      badgeSize: 25,
      ctaSize: 27,
    },
    product: {
      centerY: 0.54,
      maxWidthRatio: 0.7,
      maxHeightRatio: 0.52,
      shadowColor: "rgba(28, 25, 23, 0.16)",
      glowColor: "rgba(255, 255, 255, 0.95)",
    },
    badge: {
      bg: "#1c1917",
      text: "#fafaf9",
      width: 198,
      height: 52,
      top: 54,
      right: 48,
    },
    cta: {
      bg: "#1c1917",
      text: "#fafaf9",
      height: 70,
      bottom: 50,
      width: 372,
    },
    decor: {
      accent: "#78716c",
      showCornerOrbs: false,
      showSideStripe: false,
      showPedestal: false,
      showDivider: true,
    },
  },
  festival: {
    id: "festival",
    label: "Festival",
    background: { top: "#450a0a", bottom: "#9a3412" },
    header: {
      height: 296,
      fill: "rgba(69, 10, 10, 0.93)",
      headlineColor: "#fffbeb",
      subColor: "#fde68a",
      accentLine: "#fbbf24",
    },
    typography: {
      headlineFamily: "Poppins",
      bodyFamily: "Poppins",
      headlineSize: 48,
      subSize: 25,
      badgeSize: 27,
      ctaSize: 29,
    },
    product: {
      centerY: 0.55,
      maxWidthRatio: 0.7,
      maxHeightRatio: 0.5,
      shadowColor: "rgba(0,0,0,0.45)",
      glowColor: "rgba(251, 191, 36, 0.16)",
    },
    badge: {
      bg: "#dc2626",
      text: "#ffffff",
      width: 214,
      height: 58,
      top: 46,
      right: 40,
    },
    cta: {
      bg: "#f59e0b",
      text: "#1c0a00",
      height: 76,
      bottom: 44,
      width: 404,
    },
    decor: {
      accent: "#fbbf24",
      showCornerOrbs: true,
      showSideStripe: false,
      showPedestal: false,
      showDivider: false,
    },
  },
  grocery: {
    id: "grocery",
    label: "Grocery",
    background: { top: "#f0fdf4", bottom: "#86efac" },
    header: {
      height: 268,
      fill: "rgba(255, 255, 255, 0.96)",
      headlineColor: "#14532d",
      subColor: "#166534",
      accentLine: "#22c55e",
    },
    typography: {
      headlineFamily: "Poppins",
      bodyFamily: "Poppins",
      headlineSize: 46,
      subSize: 24,
      badgeSize: 26,
      ctaSize: 28,
    },
    product: {
      centerY: 0.54,
      maxWidthRatio: 0.76,
      maxHeightRatio: 0.52,
      shadowColor: "rgba(20, 83, 45, 0.2)",
      glowColor: "rgba(134, 239, 172, 0.35)",
    },
    badge: {
      bg: "#16a34a",
      text: "#ffffff",
      width: 210,
      height: 56,
      top: 48,
      right: 42,
    },
    cta: {
      bg: "#15803d",
      text: "#ffffff",
      height: 74,
      bottom: 46,
      width: 392,
    },
    decor: {
      accent: "#22c55e",
      showCornerOrbs: false,
      showSideStripe: false,
      showPedestal: false,
      showDivider: true,
    },
  },
  fashion: {
    id: "fashion",
    label: "Fashion",
    background: { top: "#fdf2f8", bottom: "#fbcfe8" },
    header: {
      height: 288,
      fill: "rgba(253, 242, 248, 0.97)",
      headlineColor: "#831843",
      subColor: "#9d174d",
      accentLine: "#db2777",
    },
    typography: {
      headlineFamily: "Montserrat",
      bodyFamily: "Inter",
      headlineSize: 45,
      subSize: 23,
      badgeSize: 25,
      ctaSize: 27,
    },
    product: {
      centerY: 0.51,
      maxWidthRatio: 0.64,
      maxHeightRatio: 0.56,
      shadowColor: "rgba(131, 24, 67, 0.18)",
      glowColor: "rgba(251, 207, 232, 0.5)",
    },
    badge: {
      bg: "#be185d",
      text: "#ffffff",
      width: 204,
      height: 54,
      top: 52,
      right: 46,
    },
    cta: {
      bg: "#831843",
      text: "#ffffff",
      height: 72,
      bottom: 48,
      width: 384,
    },
    decor: {
      accent: "#db2777",
      showCornerOrbs: false,
      showSideStripe: true,
      showPedestal: false,
      showDivider: false,
    },
  },
  electronics: {
    id: "electronics",
    label: "Electronics",
    background: { top: "#0f172a", bottom: "#1e40af" },
    header: {
      height: 284,
      fill: "rgba(15, 23, 42, 0.95)",
      headlineColor: "#f8fafc",
      subColor: "#93c5fd",
      accentLine: "#38bdf8",
    },
    typography: {
      headlineFamily: "Inter",
      bodyFamily: "Inter",
      headlineSize: 46,
      subSize: 24,
      badgeSize: 26,
      ctaSize: 28,
    },
    product: {
      centerY: 0.55,
      maxWidthRatio: 0.78,
      maxHeightRatio: 0.48,
      shadowColor: "rgba(0,0,0,0.48)",
      glowColor: "rgba(56, 189, 248, 0.14)",
    },
    badge: {
      bg: "#2563eb",
      text: "#ffffff",
      width: 212,
      height: 56,
      top: 48,
      right: 38,
    },
    cta: {
      bg: "#ffffff",
      text: "#0f172a",
      height: 74,
      bottom: 46,
      width: 388,
    },
    decor: {
      accent: "#38bdf8",
      showCornerOrbs: false,
      showSideStripe: true,
      showPedestal: false,
      showDivider: false,
    },
  },
};

const AD_BACKGROUND_MOODS: Record<
  string,
  { gradient: { top: string; bottom: string }; glow: string; accent?: string }
> = {
  marble: {
    gradient: { top: "#f8fafc", bottom: "#cbd5e1" },
    glow: "rgba(148, 163, 184, 0.22)",
    accent: "#64748b",
  },
  wood: {
    gradient: { top: "#3f2e1e", bottom: "#92400e" },
    glow: "rgba(251, 191, 36, 0.18)",
    accent: "#d97706",
  },
  studio: {
    gradient: { top: "#f4f4f5", bottom: "#d4d4d8" },
    glow: "rgba(255, 255, 255, 0.85)",
    accent: "#71717a",
  },
  sunlight: {
    gradient: { top: "#fffbeb", bottom: "#fde68a" },
    glow: "rgba(251, 191, 36, 0.2)",
    accent: "#f59e0b",
  },
  luxury: {
    gradient: { top: "#0a0a0a", bottom: "#27272a" },
    glow: "rgba(212, 175, 55, 0.12)",
    accent: "#d4af37",
  },
  pastel: {
    gradient: { top: "#fdf2f8", bottom: "#fbcfe8" },
    glow: "rgba(244, 114, 182, 0.15)",
    accent: "#db2777",
  },
  concrete: {
    gradient: { top: "#52525b", bottom: "#27272a" },
    glow: "rgba(161, 161, 170, 0.2)",
    accent: "#a1a1aa",
  },
  nature: {
    gradient: { top: "#14532d", bottom: "#166534" },
    glow: "rgba(74, 222, 128, 0.15)",
    accent: "#4ade80",
  },
  festive: {
    gradient: { top: "#451a03", bottom: "#b45309" },
    glow: "rgba(251, 191, 36, 0.2)",
    accent: "#fbbf24",
  },
};

function applyBackgroundMood(
  template: AdTemplate,
  backgroundId: string,
): AdTemplate {
  const mood = AD_BACKGROUND_MOODS[backgroundId];
  if (!mood) return template;
  return {
    ...template,
    background: mood.gradient,
    product: { ...template.product, glowColor: mood.glow },
    decor: {
      ...template.decor,
      accent: mood.accent ?? template.decor.accent,
    },
  };
}

function applyLayoutProfile(
  template: AdTemplate,
  profile: LayoutProfile,
): AdTemplate {
  return {
    ...template,
    header: { ...template.header, height: profile.headerHeight },
    product: {
      ...template.product,
      centerY: profile.productCenterY,
      maxWidthRatio: profile.productMaxWidthRatio,
      maxHeightRatio: profile.productMaxHeightRatio,
    },
  };
}

export type AdRenderContext = {
  templateId: AdTemplateId;
  backgroundId?: string;
  category?: ProductCategory;
  brandPalette?: BrandPalette;
};

export function buildAdTemplate(ctx: AdRenderContext): AdTemplate {
  const base = AD_TEMPLATES[ctx.templateId];
  const category = ctx.category ?? "general";
  const profile = getLayoutProfile(category);

  let template = applyLayoutProfile(base, profile);
  template = applyBackgroundMood(template, ctx.backgroundId ?? "studio");

  if (ctx.brandPalette) {
    template = applyBrandPalette(template, ctx.brandPalette, 0.32);
  }

  return template;
}

export function getAdTemplate(id: AdTemplateId): AdTemplate {
  return AD_TEMPLATES[id];
}

/** @deprecated Use buildAdTemplate */
export function getAdTemplateForBrief(
  templateId: AdTemplateId,
  backgroundId: string,
): AdTemplate {
  return buildAdTemplate({ templateId, backgroundId });
}
