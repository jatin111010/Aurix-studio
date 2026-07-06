import type { ProductAnalysis, ProductCategory } from "@/lib/studio-analysis";
import {
  STUDIO_STYLES,
  type StudioStyle,
  type StudioStyleId,
} from "@/lib/studio-options";

const CATEGORY_STYLE_MAP: Record<ProductCategory, StudioStyleId[]> = {
  food: ["wooden", "kitchen", "marble", "white_studio", "festival", "minimal"],
  cosmetics: ["white_studio", "marble", "luxury_white", "minimal", "reflection"],
  perfume: ["luxury_black", "reflection", "gold", "luxury_white", "dark"],
  electronics: ["dark", "floating", "concrete", "minimal", "white_studio"],
  jewelry: ["luxury_black", "gold", "reflection", "luxury_white", "dark"],
  shoes: ["concrete", "outdoor", "floating", "lifestyle", "fashion_studio"],
  furniture: ["living_room", "modern_home", "office", "lifestyle", "minimal"],
  fashion: ["lifestyle", "fashion_studio", "minimal", "white_studio", "outdoor"],
  kitchen: ["kitchen", "wooden", "marble", "white_studio", "modern_home"],
  home_decor: ["living_room", "modern_home", "lifestyle", "minimal", "wooden"],
  beverages: ["kitchen", "marble", "white_studio", "outdoor", "minimal"],
  medicine: ["white_studio", "minimal", "ecommerce", "marble", "luxury_white"],
  luxury: ["luxury_black", "gold", "reflection", "luxury_white", "marble"],
  general: ["white_studio", "marble", "minimal", "wooden", "ecommerce"],
};

export function getRecommendedStyleIds(
  category: ProductCategory,
  analysis?: ProductAnalysis,
): StudioStyleId[] {
  const base = CATEGORY_STYLE_MAP[category] ?? CATEGORY_STYLE_MAP.general;
  const premium = analysis?.premiumLevel;

  let ordered = [...base];

  if (premium === "luxury" || premium === "premium") {
    ordered = [
      analysis?.recommendedStyleId as StudioStyleId,
      "luxury_black",
      "gold",
      "reflection",
      ...ordered,
    ];
  } else if (premium === "budget") {
    ordered = ["white_studio", "ecommerce", "minimal", ...ordered];
  }

  if (analysis?.recommendedStyleId && analysis.recommendedStyleId !== "ai_recommended") {
    ordered.unshift(analysis.recommendedStyleId as StudioStyleId);
  }

  const unique: StudioStyleId[] = [];
  for (const id of ordered) {
    if (id && id !== "ai_recommended" && id !== "diecut" && !unique.includes(id)) {
      unique.push(id);
    }
    if (unique.length >= 9) break;
  }

  return unique;
}

export function getRecommendedStyles(
  category: ProductCategory,
  analysis?: ProductAnalysis,
): StudioStyle[] {
  return getRecommendedStyleIds(category, analysis).map((id) => STUDIO_STYLES[id]);
}

export function styleListRows(
  category: ProductCategory,
  analysis?: ProductAnalysis,
): Array<{ id: string; title: string; description: string }> {
  const recommended = getRecommendedStyles(category, analysis);

  const rows = [
    {
      id: "studio_style_ai_recommended",
      title: "⭐ AI Recommended",
      description: analysis?.recommendedStyleLabel ?? "Best match for your product",
    },
    ...recommended.map((s) => ({
      id: `studio_style_${s.id}`,
      title: s.label,
      description: s.description,
    })),
  ];

  if (rows.length < 10) {
    rows.push({
      id: "studio_style_diecut",
      title: "Transparent PNG",
      description: "Remove background completely",
    });
  }

  return rows.slice(0, 10);
}

export function pickVariationStyleIds(
  primaryStyleId: StudioStyleId,
  category: ProductCategory,
  analysis?: ProductAnalysis,
): [StudioStyleId, StudioStyleId, StudioStyleId] {
  const pool = getRecommendedStyleIds(category, analysis);
  const resolved =
    primaryStyleId === "ai_recommended"
      ? ((analysis?.recommendedStyleId as StudioStyleId) ?? pool[0] ?? "white_studio")
      : primaryStyleId;

  const altA = pool.find((id) => id !== resolved) ?? "minimal";
  const altB = pool.find((id) => id !== resolved && id !== altA) ?? "marble";

  return [resolved, altA, altB];
}
