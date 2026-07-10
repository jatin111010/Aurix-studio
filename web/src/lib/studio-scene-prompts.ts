/**
 * Product-aware Photoroom scene prompts — professional photoshoot stages
 * with visible backgrounds, real props, lighting, and shadows.
 */

import type { ProductAnalysis } from "@/lib/studio-analysis";
import {
  CAMERA_ANGLES,
  LIGHTING_PRESETS,
  QUALITY_PRESETS,
  STUDIO_STYLES,
  type CameraAngleId,
  type LightingId,
  type QualityId,
  type StudioStyleId,
} from "@/lib/studio-options";

const PHOTOROOM_SUFFIX =
  "professional commercial product photoshoot, photorealistic, sharp focus throughout, background fully visible and detailed not blurred, natural soft contact shadow under the product, realistic studio lighting, packaging text sharp and readable, looks like a real photographer shot this, no AI blur, no empty gradient backdrop, no hands, no watermarks";

export type ProductScenePlan = {
  label: string;
  lightingId: LightingId;
  sceneCore: string;
  /** How to present the isolated product clearly */
  productClarity: string;
  mood: "classic" | "elevated" | "dramatic";
};

const MOOD_SUFFIX = {
  classic: "centered hero product composition, camera at eye level",
  elevated: "slightly elevated three-quarter view, generous table space around product",
  dramatic: "rich contrast lighting, premium advertising composition",
} as const;

const MOODS: Array<keyof typeof MOOD_SUFFIX> = ["classic", "elevated", "dramatic"];

function resolveStyleId(
  styleId: StudioStyleId,
  analysis?: ProductAnalysis,
): StudioStyleId {
  if (styleId === "ai_recommended") {
    return analysis?.recommendedStyleId ?? "white_studio";
  }
  return styleId;
}

function categoryProps(category: ProductAnalysis["category"]): string {
  const hints: Record<ProductAnalysis["category"], string> = {
    food:
      "wooden kitchen table with a small ceramic bowl of matching dry fruits or ingredients clearly visible beside the product, warm window light, soft natural shadow",
    cosmetics:
      "marble vanity with cotton pads and a small flower vase clearly visible beside the product, soft daylight, gentle shadow under the bottle",
    perfume:
      "dark wood perfume counter with silk cloth and a crystal tray clearly visible, elegant side lighting, soft reflection shadow",
    electronics:
      "modern desk with a notebook and charging cable clearly visible beside the device, cool daylight, crisp contact shadow",
    jewelry:
      "velvet jewelry tray on marble with a small ring box clearly visible, boutique spotlight, soft shadow",
    shoes:
      "wooden floor with a plant pot and sneaker box clearly visible in frame, natural daylight, grounded shadow",
    furniture:
      "styled living room corner with cushion and side lamp clearly visible, warm ambient light, natural floor shadow",
    fashion:
      "boutique fitting area with fabric swatch and hanger clearly visible, soft fashion lighting, natural shadow",
    kitchen:
      "kitchen counter with wooden cutting board and spice jar clearly visible beside the product, bright window light, soft shadow",
    home_decor:
      "styled side table with a book and small plant clearly visible, warm home lighting, natural shadow",
    beverages:
      "cafe table with a glass and coaster clearly visible beside the bottle, cool daylight, condensation-friendly lighting",
    medicine:
      "clean white pharmacy counter with a prescription pad clearly visible, bright even light, soft shadow",
    luxury:
      "premium gift table with ribbon spool and tissue paper clearly visible, warm gold accent light, elegant shadow",
    general:
      "styled product table with one complementary prop clearly visible, professional softbox lighting, natural contact shadow",
  };
  return hints[category] ?? hints.general;
}

function fallbackScenes(
  analysis: ProductAnalysis,
  styleId: StudioStyleId,
): ProductScenePlan[] {
  const style = STUDIO_STYLES[styleId];
  const props = categoryProps(analysis.category);
  const setting = analysis.idealSetting?.trim();
  const brandTone =
    analysis.brandColors.length > 0
      ? `tones that complement ${analysis.brandColors.join(" and ")}`
      : "natural warm tones";

  const cores = [
    `professional photoshoot on ${setting ?? "a real kitchen or product table"}, ${props}, ${brandTone}, background walls and props fully visible and sharp`,
    `professional retail display photoshoot, ${props}, ${brandTone}, clean shop counter, background fully visible, soft directional light from the left`,
    `premium advertising photoshoot, ${style.scenePrompt || "styled product table"}, ${props}, ${brandTone}, background detailed and sharp, elegant side lighting with soft contact shadow`,
  ];

  const labels = ["Kitchen table", "Retail counter", "Premium shoot"];

  return MOODS.map((mood, i) => ({
    label: labels[i],
    lightingId: "soft" as LightingId,
    sceneCore: cores[i].replace(/,\s*,/g, ","),
    productClarity:
      analysis.productClarity ||
      "main product upright and centered, packaging sharp and readable, no clutter on the product itself",
    mood,
  }));
}

export async function generateProductScenePlans(
  imageUrl: string,
  analysis: ProductAnalysis,
  styleId: StudioStyleId,
): Promise<ProductScenePlan[]> {
  const resolvedStyle = resolveStyleId(styleId, analysis);
  const style = STUDIO_STYLES[resolvedStyle];
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    return fallbackScenes(analysis, resolvedStyle);
  }

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
            content: `You write PROFESSIONAL PRODUCT PHOTOSHOOT prompts for Photoroom AI backgrounds.

Goal: the final image must look like a REAL photographer shot it in a real location — NOT a blurry AI backdrop.

Merchant style direction: "${style.label}" — ${style.description}
(Use this as mood, but invent concrete real photoshoot sets.)

Product:
- Main product: ${analysis.mainProduct}
- Category: ${analysis.category}
- Summary: ${analysis.summary}
- Packaging: ${analysis.packagingType}
- Premium level: ${analysis.premiumLevel}
- Brand colors: ${analysis.brandColors.join(", ") || "unknown"}
- Ideal setting hint: ${analysis.idealSetting || "infer from product"}
- Photo issues to fix: ${analysis.photoIssues.join("; ") || "messy phone photo"}

Write 3 DIFFERENT full photoshoot scenes. Each "scene" must include ALL of:
1. Exact surface (e.g. oak kitchen table, white marble counter, walnut gift table)
2. 1–3 complementary props that match THIS product and are CLEARLY VISIBLE (not blurred)
   Example for raisins/dry fruits: small ceramic bowl of cashews, scattered almonds, linen napkin
   Example for cosmetics: cotton pads, tiny flower vase, glass dropper bottle
   Example for spices: wooden spoon, spice jar, cutting board
3. Visible background details (wall, window, shelf, tiles) — SHARP and readable, NOT blurry, NOT bokeh, NOT empty gradient
4. Lighting direction and quality (e.g. soft morning window light from the left, softbox key light, warm afternoon side light)
5. Natural contact shadow under the product

Hard rules:
- Background and props must be VISIBLE and detailed — never say blur, bokeh, shallow depth of field, out of focus, or soft background
- Props must relate to the actual product (food → food props, beauty → vanity props)
- Product stays the hero; props sit beside/behind, never covering packaging text
- Sound like a real Indian commercial photoshoot (home kitchen, kirana display, festive gift table, boutique counter when relevant)
- 45–70 words per scene
- Do NOT mention brand names, logos, watermarks, people, or hands

Also return productClarity: how the main product itself should look (upright, sharp label, etc.)

Return JSON only:
{
  "productClarity": "one sentence about product presentation",
  "scenes": [
    { "label": "2-4 word set name", "scene": "full photoshoot description with surface + visible props + visible background + lighting + shadow" },
    { "label": "...", "scene": "..." },
    { "label": "...", "scene": "..." }
  ]
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Look at this product. Write 3 professional photoshoot prompts with visible backgrounds, matching props, lighting, and shadows — like a real commercial shoot, not a blurry AI background.",
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 900,
        temperature: 0.65,
      }),
    });

    if (!response.ok) {
      return fallbackScenes(analysis, resolvedStyle);
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) return fallbackScenes(analysis, resolvedStyle);

    const parsed = JSON.parse(raw) as {
      productClarity?: string;
      scenes?: Array<{ label?: string; scene?: string }>;
    };
    const scenes = parsed.scenes?.filter((s) => s.scene && s.scene.length > 20);

    if (!scenes || scenes.length < 3) {
      return fallbackScenes(analysis, resolvedStyle);
    }

    const clarity =
      parsed.productClarity?.trim() ||
      analysis.productClarity ||
      "main product upright and centered, packaging sharp and readable, no clutter on the product itself";

    return scenes.slice(0, 3).map((s, i) => ({
      label: (s.label ?? `Scene ${i + 1}`).slice(0, 32),
      lightingId: "soft" as LightingId,
      sceneCore: stripBlurLanguage(s.scene!.trim()),
      productClarity: clarity.slice(0, 220),
      mood: MOODS[i],
    }));
  } catch {
    return fallbackScenes(analysis, resolvedStyle);
  }
}

/** Remove blur/bokeh wording if the model still slips it in. */
function stripBlurLanguage(scene: string): string {
  return scene
    .replace(/\b(softly\s+)?blurred\b/gi, "clearly visible")
    .replace(/\bbokeh\b/gi, "detailed background")
    .replace(/\bshallow depth of field\b/gi, "sharp focus throughout")
    .replace(/\bout of focus\b/gi, "in focus")
    .replace(/\bsoft background\b/gi, "detailed visible background")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function assemblePhotoroomPrompt(
  sceneCore: string,
  mood: keyof typeof MOOD_SUFFIX,
  angleId: CameraAngleId,
  lightingId: LightingId,
  qualityId: QualityId,
  options?: {
    mainProduct?: string;
    productClarity?: string;
    productSummary?: string;
  },
): string {
  const angle = CAMERA_ANGLES[angleId];
  const lighting = LIGHTING_PRESETS[lightingId];
  const quality = QUALITY_PRESETS[qualityId];

  const subject =
    options?.mainProduct ||
    options?.productSummary ||
    "the main product";

  return [
    `professional product photoshoot of ${subject}`,
    options?.productClarity,
    stripBlurLanguage(sceneCore),
    MOOD_SUFFIX[mood],
    angle.promptSuffix,
    lighting.promptSuffix,
    quality.promptSuffix,
    PHOTOROOM_SUFFIX,
  ]
    .filter(Boolean)
    .join(", ");
}
