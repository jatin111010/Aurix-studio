/** Visual styles for Fabric.js ad post templates (1080×1080). */

export type AdTemplateId = "festival" | "minimal" | "bold";

export type AdTemplate = {
  id: AdTemplateId;
  label: string;
  background: { top: string; bottom: string };
  headlineColor: string;
  subColor: string;
  accent: string;
  badgeBg: string;
  badgeText: string;
  ctaBg: string;
  ctaText: string;
};

export const AD_TEMPLATES: Record<AdTemplateId, AdTemplate> = {
  festival: {
    id: "festival",
    label: "Festival sale",
    background: { top: "#1c0a00", bottom: "#92400e" },
    headlineColor: "#ffffff",
    subColor: "#fde68a",
    accent: "#fbbf24",
    badgeBg: "#dc2626",
    badgeText: "#ffffff",
    ctaBg: "#f59e0b",
    ctaText: "#1c0a00",
  },
  minimal: {
    id: "minimal",
    label: "Clean minimal",
    background: { top: "#fafaf9", bottom: "#e7e5e4" },
    headlineColor: "#1c1917",
    subColor: "#57534e",
    accent: "#b45309",
    badgeBg: "#292524",
    badgeText: "#fafaf9",
    ctaBg: "#1c1917",
    ctaText: "#fafaf9",
  },
  bold: {
    id: "bold",
    label: "Bold promo",
    background: { top: "#172554", bottom: "#1e3a8a" },
    headlineColor: "#ffffff",
    subColor: "#bfdbfe",
    accent: "#38bdf8",
    badgeBg: "#f97316",
    badgeText: "#ffffff",
    ctaBg: "#ffffff",
    ctaText: "#172554",
  },
};

export const AD_SIZE = 1080;

/** Pick template from background vibe (or default). */
export function pickAdTemplate(backgroundId: string): AdTemplate {
  if (backgroundId === "sunlight") return AD_TEMPLATES.bold;
  if (backgroundId === "marble") return AD_TEMPLATES.minimal;
  return AD_TEMPLATES.festival;
}
