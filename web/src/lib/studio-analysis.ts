/**
 * AI product analysis for Studio Shot — silent creative director intelligence.
 * Handles messy phone photos: finds the main product, notes issues, guides cleanup.
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

export type PhotoQuality = "clean" | "messy" | "cluttered";

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
  /** How messy / poorly framed the merchant photo is */
  photoQuality: PhotoQuality;
  /** What the main sellable product is (ignore clutter, hands, props) */
  mainProduct: string;
  /** Issues in the source photo that studio must fix */
  photoIssues: string[];
  /** How to present the product clearly in the final packshot */
  productClarity: string;
  /** Prefer isolating the subject before scene generation */
  isolateFirst: boolean;
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

const VALID_PHOTO_QUALITY = new Set<string>(["clean", "messy", "cluttered"]);

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
  photoQuality: "messy",
  mainProduct: "the main packaged product in the photo",
  photoIssues: ["phone photo may include clutter or awkward framing"],
  productClarity:
    "center the main product upright, keep packaging sharp, product covers about 40% of the frame with space around it",
  isolateFirst: true,
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
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a professional product photographer and creative director for Indian WhatsApp sellers.

Merchants often send MESSY phone photos: wrong angle, cluttered background, hands, table junk, tilted product, poor lighting, multiple objects.

Your job:
1. Look at the photo as it is
2. Identify the MAIN sellable product (ignore clutter, hands, extra props, background mess)
3. Note what is wrong with the photo
4. Recommend how to present that product clearly in a premium studio packshot
5. Suggest style / angle / lighting / ideal real-world setting

Return JSON only:
{
  "category": "food|cosmetics|perfume|electronics|jewelry|shoes|furniture|fashion|kitchen|home_decor|beverages|medicine|luxury|general",
  "summary": "one natural sentence describing the MAIN product for a shop owner — NOT technical",
  "packagingType": "box|bottle|jar|bag|pouch|device|garment|etc",
  "premiumLevel": "budget|mid|premium|luxury",
  "brandColors": ["color names, max 3"],
  "hasReflection": boolean,
  "hasTransparency": boolean,
  "recommendedStyleId": "white_studio|luxury_black|luxury_white|marble|wooden|minimal|festival|kitchen|reflection|gold|dark|floating|concrete|outdoor|living_room|modern_home|office|lifestyle|fashion_studio|ecommerce",
  "recommendedAngleId": "front|angle_45|top|closeup|floating",
  "recommendedLightingId": "soft|bright|luxury|warm|dramatic",
  "idealSetting": "short realistic photo location for this exact product",
  "photoQuality": "clean|messy|cluttered",
  "mainProduct": "short phrase naming only the main sellable item to keep, e.g. green GroAurum raisins box",
  "photoIssues": ["up to 4 short issues, e.g. cluttered table, tilted angle, busy background, hand in frame"],
  "productClarity": "one sentence: how to present the main product clearly — upright, centered, sharp label, covers about 40% of frame with space around it, no clutter",
  "isolateFirst": true
}

Rules:
- photoQuality=clean only if product is already well-framed on a simple background
- photoQuality=messy for awkward angle / soft focus / poor light
- photoQuality=cluttered if extra objects, hands, messy room, or competing subjects
- isolateFirst=true whenever photoQuality is messy or cluttered, or multiple objects are visible
- Always focus on the MAIN product a customer would buy`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this merchant product photo. Find the main product, note photo problems, and guide a premium studio reshoot.",
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 520,
        temperature: 0.25,
      }),
    });

    if (!response.ok) return FALLBACK;

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) return FALLBACK;

    const parsed = JSON.parse(raw) as Partial<ProductAnalysis> & {
      isolateFirst?: boolean;
    };
    const category = VALID_CATEGORIES.has(parsed.category ?? "")
      ? (parsed.category as ProductCategory)
      : "general";

    const styleId = (parsed.recommendedStyleId ?? "white_studio") as StudioStyleId;
    const styleLabel =
      STUDIO_STYLES[styleId]?.label ?? STUDIO_STYLES.white_studio.label;

    const photoQuality = VALID_PHOTO_QUALITY.has(parsed.photoQuality ?? "")
      ? (parsed.photoQuality as PhotoQuality)
      : "messy";

    const photoIssues = Array.isArray(parsed.photoIssues)
      ? parsed.photoIssues.slice(0, 4).map(String)
      : FALLBACK.photoIssues;

    const isolateFirst =
      typeof parsed.isolateFirst === "boolean"
        ? parsed.isolateFirst
        : photoQuality !== "clean";

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
      photoQuality,
      mainProduct: parsed.mainProduct?.slice(0, 120) ?? FALLBACK.mainProduct,
      photoIssues,
      productClarity:
        parsed.productClarity?.slice(0, 200) ?? FALLBACK.productClarity,
      isolateFirst,
    };
  } catch {
    return FALLBACK;
  }
}
