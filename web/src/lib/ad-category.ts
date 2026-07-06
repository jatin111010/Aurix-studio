/**
 * Product category detection + category-based layout profiles.
 */

import type { AdTemplateId } from "@/lib/ad-templates";

export type ProductCategory =
  | "grocery"
  | "fashion"
  | "electronics"
  | "beauty"
  | "home"
  | "general";

export type LayoutProfile = {
  productCenterY: number;
  productMaxWidthRatio: number;
  productMaxHeightRatio: number;
  headerHeight: number;
  productZoneTop: number;
  productZoneBottom: number;
};

export const CATEGORY_LAYOUTS: Record<ProductCategory, LayoutProfile> = {
  grocery: {
    productCenterY: 0.54,
    productMaxWidthRatio: 0.76,
    productMaxHeightRatio: 0.5,
    headerHeight: 252,
    productZoneTop: 252,
    productZoneBottom: 880,
  },
  fashion: {
    productCenterY: 0.51,
    productMaxWidthRatio: 0.64,
    productMaxHeightRatio: 0.56,
    headerHeight: 288,
    productZoneTop: 288,
    productZoneBottom: 900,
  },
  electronics: {
    productCenterY: 0.55,
    productMaxWidthRatio: 0.78,
    productMaxHeightRatio: 0.48,
    headerHeight: 276,
    productZoneTop: 276,
    productZoneBottom: 895,
  },
  beauty: {
    productCenterY: 0.52,
    productMaxWidthRatio: 0.66,
    productMaxHeightRatio: 0.54,
    headerHeight: 284,
    productZoneTop: 284,
    productZoneBottom: 905,
  },
  home: {
    productCenterY: 0.56,
    productMaxWidthRatio: 0.72,
    productMaxHeightRatio: 0.5,
    headerHeight: 268,
    productZoneTop: 268,
    productZoneBottom: 890,
  },
  general: {
    productCenterY: 0.54,
    productMaxWidthRatio: 0.7,
    productMaxHeightRatio: 0.52,
    headerHeight: 276,
    productZoneTop: 276,
    productZoneBottom: 895,
  },
};

const CATEGORY_THEME_MAP: Record<ProductCategory, AdTemplateId> = {
  grocery: "grocery",
  fashion: "fashion",
  electronics: "electronics",
  beauty: "luxury",
  home: "minimal",
  general: "minimal",
};

export function getLayoutProfile(category: ProductCategory): LayoutProfile {
  return CATEGORY_LAYOUTS[category] ?? CATEGORY_LAYOUTS.general;
}

export function suggestThemeForCategory(
  category: ProductCategory,
): AdTemplateId {
  return CATEGORY_THEME_MAP[category] ?? "minimal";
}

export function normalizeTemplateId(id?: string): AdTemplateId {
  if (id === "bold") return "electronics";
  const valid: AdTemplateId[] = [
    "luxury",
    "minimal",
    "festival",
    "grocery",
    "fashion",
    "electronics",
  ];
  if (id && valid.includes(id as AdTemplateId)) {
    return id as AdTemplateId;
  }
  return "minimal";
}

export function resolveTemplateId(
  userChoice: string | undefined,
  category: ProductCategory,
): AdTemplateId {
  if (userChoice) return normalizeTemplateId(userChoice);
  return suggestThemeForCategory(category);
}

const VALID_CATEGORIES = new Set<string>([
  "grocery",
  "fashion",
  "electronics",
  "beauty",
  "home",
  "general",
]);

export async function detectProductCategory(
  imageUrl: string,
): Promise<ProductCategory> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "general";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Classify the product in this photo for ad layout.
Reply with ONE word only: grocery, fashion, electronics, beauty, home, or general.
- grocery: food, snacks, spices, beverages, daily essentials
- fashion: clothing, shoes, accessories, jewelry
- electronics: phones, gadgets, appliances, cables
- beauty: cosmetics, skincare, perfume, personal care
- home: furniture, decor, kitchenware, linens
- general: anything else`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "What product category is this?" },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!response.ok) return "general";

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content?.trim().toLowerCase() ?? "";
    const word = raw.split(/\s+/)[0]?.replace(/[^a-z]/g, "");
    if (word && VALID_CATEGORIES.has(word)) {
      return word as ProductCategory;
    }
    return "general";
  } catch {
    return "general";
  }
}
