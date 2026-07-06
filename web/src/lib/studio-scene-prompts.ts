/**
 * Product-aware Photoroom scene prompts — realistic backgrounds matched to what
 * the merchant photographed, not generic presets.
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
  "photorealistic commercial packshot, product resting naturally on the surface with soft contact shadow, sharp product focus, shallow depth of field";

export type ProductScenePlan = {
  label: string;
  lightingId: LightingId;
  sceneCore: string;
  mood: "classic" | "elevated" | "dramatic";
};

const MOOD_SUFFIX = {
  classic: "balanced centered hero composition",
  elevated: "slightly elevated angle, airy negative space",
  dramatic: "rich contrast, cinematic depth, subtle vignette",
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
      "subtle complementary food props softly blurred in background, natural grocery or gifting context",
    cosmetics:
      "spa-like vanity surface, soft petals or cotton accents blurred, beauty retail atmosphere",
    perfume:
      "luxury boutique display surface, silk fabric accent, premium fragrance counter mood",
    electronics:
      "modern desk or tech workspace surface, clean minimal gadgets blurred in distance",
    jewelry:
      "velvet or marble jewelry display tray, boutique lighting, elegant retail counter",
    shoes:
      "urban concrete or wooden floor surface, lifestyle sneaker store atmosphere",
    furniture:
      "styled living space corner, complementary decor softly blurred, home interior",
    fashion:
      "editorial studio with fabric draping, fashion boutique mood",
    kitchen:
      "kitchen counter with subtle cookware blurred, fresh cooking atmosphere",
    home_decor:
      "styled shelf or side table in modern Indian home, warm ambient decor",
    beverages:
      "bar counter or cafe table, condensation-friendly cool atmosphere, drink service mood",
    medicine:
      "clean clinical white pharmacy counter, trustworthy healthcare retail",
    luxury:
      "premium gift boutique display, gold accents, high-end Indian gifting mood",
    general:
      "professional retail display surface appropriate to the product category",
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
      ? `color palette harmonizing with ${analysis.brandColors.join(" and ")} tones`
      : "";

  const cores = [
    `${style.scenePrompt}, ${setting ?? props}, ${brandTone}, authentic lifestyle retail display`.replace(
      /,\s*,/g,
      ",",
    ),
    `${style.scenePrompt}, ${props}, ${brandTone}, clean modern shop counter atmosphere`.replace(
      /,\s*,/g,
      ",",
    ),
    `${style.scenePrompt}, ${setting ?? props}, ${brandTone}, premium gifting boutique display`.replace(
      /,\s*,/g,
      ",",
    ),
  ];

  const labels = ["Lifestyle", "Retail counter", "Premium display"];

  return MOODS.map((mood, i) => ({
    label: labels[i],
    lightingId: "soft" as LightingId,
    sceneCore: cores[i],
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
            content: `You are an expert commercial product photographer for Indian e-commerce and WhatsApp sellers.

Study the product photo and create 3 DIFFERENT PHOTOREALISTIC environments where this exact product would naturally be photographed for Indian e-commerce.

Merchant chose style direction: "${style.label}" — ${style.description}
Use this as the visual mood, but each scene should be a distinct real location.

Product context:
- Category: ${analysis.category}
- Description: ${analysis.summary}
- Packaging: ${analysis.packagingType}
- Premium level: ${analysis.premiumLevel}
- Brand colors: ${analysis.brandColors.join(", ") || "unknown"}
- Ideal real-world setting: ${analysis.idealSetting || "infer from product"}

Rules for each scene prompt (the "scene" field):
- Describe ONLY the physical environment: surface material, background, subtle blurred props
- Each of the 3 scenes must be a DIFFERENT realistic location (e.g. kitchen counter vs wooden gift table vs supermarket shelf)
- Props must match the product category — subtle, blurred, never blocking the product area
- Must look like a real photograph location, not a generic AI gradient
- Indian market context when relevant (gifting, kirana, festive hamper, premium retail)
- Do NOT describe lighting — only the physical setting
- Max 40 words per scene
- Do NOT mention text, logos, watermarks, people, hands, or the product name

Return JSON:
{
  "scenes": [
    { "label": "2-4 word location name", "scene": "physical environment description only" },
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
                text: "Create 3 realistic background scenes tailored to this product and the chosen style.",
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.55,
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
      scenes?: Array<{ label?: string; scene?: string }>;
    };
    const scenes = parsed.scenes?.filter((s) => s.scene && s.scene.length > 12);

    if (!scenes || scenes.length < 3) {
      return fallbackScenes(analysis, resolvedStyle);
    }

    return scenes.slice(0, 3).map((s, i) => ({
      label: (s.label ?? `Scene ${i + 1}`).slice(0, 32),
      lightingId: "soft" as LightingId,
      sceneCore: s.scene!.trim(),
      mood: MOODS[i],
    }));
  } catch {
    return fallbackScenes(analysis, resolvedStyle);
  }
}

export function assemblePhotoroomPrompt(
  sceneCore: string,
  mood: keyof typeof MOOD_SUFFIX,
  angleId: CameraAngleId,
  lightingId: LightingId,
  qualityId: QualityId,
  productSummary?: string,
): string {
  const angle = CAMERA_ANGLES[angleId];
  const lighting = LIGHTING_PRESETS[lightingId];
  const quality = QUALITY_PRESETS[qualityId];

  const productLead = productSummary
    ? `the product is ${productSummary}, `
    : "";

  return [
    productLead + sceneCore,
    MOOD_SUFFIX[mood],
    angle.promptSuffix,
    lighting.promptSuffix,
    quality.promptSuffix,
    PHOTOROOM_SUFFIX,
  ]
    .filter(Boolean)
    .join(", ");
}
