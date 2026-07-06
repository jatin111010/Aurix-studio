/** Visual ad post templates (1080×1080) — distinct layouts per style. */

export type AdTemplateId = "festival" | "minimal" | "bold";

export type AdTemplate = {
  id: AdTemplateId;
  label: string;
  /** Full-canvas gradient */
  background: { top: string; bottom: string };
  /** Top header band — headline always sits here for contrast */
  header: {
    height: number;
    fill: string;
    headlineColor: string;
    subColor: string;
    accentLine: string;
  };
  /** Product stage */
  product: {
    centerY: number;
    maxWidthRatio: number;
    maxHeightRatio: number;
    shadowColor: string;
    glowColor: string;
  };
  /** Offer badge */
  badge: {
    bg: string;
    text: string;
    width: number;
    height: number;
    top: number;
    right: number;
  };
  /** CTA bar at bottom */
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
  };
};

export const AD_TEMPLATES: Record<AdTemplateId, AdTemplate> = {
  festival: {
    id: "festival",
    label: "Festival sale",
    background: { top: "#2d0a00", bottom: "#7c2d12" },
    header: {
      height: 300,
      fill: "rgba(120, 20, 10, 0.92)",
      headlineColor: "#fffbeb",
      subColor: "#fde68a",
      accentLine: "#fbbf24",
    },
    product: {
      centerY: 0.58,
      maxWidthRatio: 0.68,
      maxHeightRatio: 0.48,
      shadowColor: "rgba(0,0,0,0.45)",
      glowColor: "rgba(251, 191, 36, 0.15)",
    },
    badge: {
      bg: "#dc2626",
      text: "#ffffff",
      width: 210,
      height: 58,
      top: 48,
      right: 40,
    },
    cta: {
      bg: "#f59e0b",
      text: "#1c0a00",
      height: 76,
      bottom: 44,
      width: 400,
    },
    decor: {
      accent: "#fbbf24",
      showCornerOrbs: true,
      showSideStripe: false,
    },
  },
  minimal: {
    id: "minimal",
    label: "Clean minimal",
    background: { top: "#ffffff", bottom: "#f5f5f4" },
    header: {
      height: 280,
      fill: "rgba(255, 255, 255, 0.97)",
      headlineColor: "#1c1917",
      subColor: "#44403c",
      accentLine: "#b45309",
    },
    product: {
      centerY: 0.57,
      maxWidthRatio: 0.7,
      maxHeightRatio: 0.5,
      shadowColor: "rgba(28, 25, 23, 0.18)",
      glowColor: "rgba(255, 255, 255, 0.9)",
    },
    badge: {
      bg: "#1c1917",
      text: "#fafaf9",
      width: 200,
      height: 54,
      top: 52,
      right: 44,
    },
    cta: {
      bg: "#1c1917",
      text: "#fafaf9",
      height: 72,
      bottom: 48,
      width: 380,
    },
    decor: {
      accent: "#b45309",
      showCornerOrbs: false,
      showSideStripe: false,
    },
  },
  bold: {
    id: "bold",
    label: "Bold promo",
    background: { top: "#0f172a", bottom: "#1e3a8a" },
    header: {
      height: 320,
      fill: "rgba(15, 23, 42, 0.95)",
      headlineColor: "#ffffff",
      subColor: "#93c5fd",
      accentLine: "#38bdf8",
    },
    product: {
      centerY: 0.59,
      maxWidthRatio: 0.72,
      maxHeightRatio: 0.5,
      shadowColor: "rgba(0,0,0,0.5)",
      glowColor: "rgba(56, 189, 248, 0.12)",
    },
    badge: {
      bg: "#f97316",
      text: "#ffffff",
      width: 215,
      height: 58,
      top: 46,
      right: 36,
    },
    cta: {
      bg: "#ffffff",
      text: "#0f172a",
      height: 74,
      bottom: 46,
      width: 390,
    },
    decor: {
      accent: "#38bdf8",
      showCornerOrbs: false,
      showSideStripe: true,
    },
  },
};

export const AD_SIZE = 1080;

/** Merchant background choice tints the canvas — header/CTA bands keep text readable. */
const AD_BACKGROUND_MOODS: Record<
  string,
  {
    gradient: { top: string; bottom: string };
    glow: string;
    accent?: string;
  }
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
    product: {
      ...template.product,
      glowColor: mood.glow,
    },
    decor: {
      ...template.decor,
      accent: mood.accent ?? template.decor.accent,
    },
  };
}

export function getAdTemplate(id: AdTemplateId): AdTemplate {
  return AD_TEMPLATES[id];
}

export function getAdTemplateForBrief(
  templateId: AdTemplateId,
  backgroundId: string,
): AdTemplate {
  return applyBackgroundMood(AD_TEMPLATES[templateId], backgroundId);
}
