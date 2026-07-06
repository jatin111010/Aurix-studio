/**
 * AI product analysis for Studio Shot — silent creative director intelligence.
 */

import type { CameraAngleId, LightingId, StudioStyleId } from "@/lib/studio-options";
import { STUDIO_STYLES } from "@/lib/studio-options";

export type ProductCategory =
  | "food"
  | "cosmetics"
  | "perfume"
  | "electronics"
  | "jewelry"
  | "shoes"
  | "furniture"
  | "fashion"
  | "kitchen"
  | "home_decor"
  | "beverages"
  | "medicine"
  | "luxury"
  | "general";

export type PremiumLevel = "budget" | "mid" | "premium" | "luxury";

export type ProductAnalysis = {
  category: ProductCategory;
  /** Natural description for the user — never technical */
  summary: string;
  packagingType: string;
  premiumLevel: PremiumLevel;
  brandColors: string[];
  hasReflection: boolean;
  hasTransparency: boolean;
  recommendedStyleId: StudioStyleId;
  recommendedStyleLabel: string;
  recommendedAngleId: CameraAngleId;
  recommendedLightingId: LightingId;
  /** Where this product is naturally photographed in real life */
  idealSetting?: string;
};

const VALID_CATEGORIES = new Set<string>([
  "food",
  "cosmetics",
  "perfume",
  "electronics",
  "jewelry",
  "shoes",
  "furniture",
  "fashion",
  "kitchen",
  "home_decor",
  "beverages",
  "medicine",
  "luxury",
  "general",
]);

const FALLBACK: ProductAnalysis = {
  category: "general",
  summary: "a quality product with clean packaging",
  packagingType: "standard",
  premiumLevel: "mid",
  brandColors: [],
  hasReflection: false,
  hasTransparency: false,
  recommendedStyleId: "white_studio",
  recommendedStyleLabel: STUDIO_STYLES.white_studio.label,
  recommendedAngleId: "front",
  recommendedLightingId: "soft",
};

export async function analyzeProduct(
  imageUrl: string,
): Promise<ProductAnalysis> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return FALLBACK;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a professional product photographer analyzing a product for studio photography.

Return JSON only:
{
  "category": "food|cosmetics|perfume|electronics|jewelry|shoes|furniture|fashion|kitchen|home_decor|beverages|medicine|luxury|general",
  "summary": "one natural sentence describing the product for a shop owner, e.g. premium dry fruits gift box with luxury green branding — NOT technical",
  "packagingType": "box|bottle|jar|bag|pouch|device|garment|etc",
  "premiumLevel": "budget|mid|premium|luxury",
  "brandColors": ["color names, max 3"],
  "hasReflection": boolean,
  "hasTransparency": boolean,
  "recommendedStyleId": "white_studio|luxury_black|luxury_white|marble|wooden|minimal|festival|kitchen|reflection|gold|dark|floating|concrete|outdoor|living_room|modern_home|office|lifestyle|fashion_studio|ecommerce",
  "recommendedAngleId": "front|angle_45|top|closeup|floating",
  "recommendedLightingId": "soft|bright|luxury|warm|dramatic",
  "idealSetting": "one short phrase for the most realistic real-world photo location for this exact product, e.g. premium dry fruit gift display on wooden kitchen counter, or cosmetic bottle on marble vanity — NOT generic"
}`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this product for studio photography recommendations." },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 380,
        temperature: 0.3,
      }),
    });

    if (!response.ok) return FALLBACK;

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) return FALLBACK;

    const parsed = JSON.parse(raw) as Partial<ProductAnalysis>;
    const category = VALID_CATEGORIES.has(parsed.category ?? "")
      ? (parsed.category as ProductCategory)
      : "general";

    const styleId = (parsed.recommendedStyleId ?? "white_studio") as StudioStyleId;
    const styleLabel =
      STUDIO_STYLES[styleId]?.label ?? STUDIO_STYLES.white_studio.label;

    return {
      category,
      summary: parsed.summary?.slice(0, 160) ?? FALLBACK.summary,
      packagingType: parsed.packagingType ?? "standard",
      premiumLevel: parsed.premiumLevel ?? "mid",
      brandColors: Array.isArray(parsed.brandColors)
        ? parsed.brandColors.slice(0, 3).map(String)
        : [],
      hasReflection: Boolean(parsed.hasReflection),
      hasTransparency: Boolean(parsed.hasTransparency),
      recommendedStyleId: styleId in STUDIO_STYLES ? styleId : "white_studio",
      recommendedStyleLabel: styleLabel,
      recommendedAngleId: (parsed.recommendedAngleId ?? "front") as CameraAngleId,
      recommendedLightingId: (parsed.recommendedLightingId ?? "soft") as LightingId,
      idealSetting: parsed.idealSetting?.slice(0, 120),
    };
  } catch {
    return FALLBACK;
  }
}
