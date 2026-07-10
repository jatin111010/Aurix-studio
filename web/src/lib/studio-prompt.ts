/**
 * Build Photoroom prompts for studio variations.
 */

import { enhanceCustomBackgroundPrompt } from "@/lib/background-prompt";
import type { ProductAnalysis } from "@/lib/studio-analysis";
import {
  CAMERA_ANGLES,
  LIGHTING_PRESETS,
  QUALITY_PRESETS,
  STUDIO_STYLES,
  type CameraAngleId,
  type LightingId,
  type QualityId,
  type StudioChoices,
  type StudioStyleId,
} from "@/lib/studio-options";
import {
  assemblePhotoroomPrompt,
  generateProductScenePlans,
} from "@/lib/studio-scene-prompts";

const BASE_SUFFIX =
  "photorealistic commercial packshot, product resting naturally on the surface with soft contact shadow at the base, sharp product focus, shallow depth of field, premium advertising quality";

const MOOD_MODIFIERS = {
  classic: "balanced centered hero composition",
  elevated: "slightly elevated camera angle, airy negative space",
  dramatic: "rich contrast, cinematic depth, subtle vignette",
} as const;

export type VariationPlan = {
  label: "A" | "B" | "C";
  styleId: StudioStyleId;
  styleLabel: string;
  backgroundPrompt: string;
  padding: number;
  mood: string;
};

function resolveStyleId(
  styleId: StudioStyleId,
  analysis?: ProductAnalysis,
): StudioStyleId {
  if (styleId === "ai_recommended") {
    return analysis?.recommendedStyleId ?? "white_studio";
  }
  return styleId;
}

function resolveAngleId(
  angleId: CameraAngleId,
  analysis?: ProductAnalysis,
): CameraAngleId {
  if (angleId === "ai_recommended") {
    return analysis?.recommendedAngleId ?? "front";
  }
  return angleId;
}

function resolveLightingId(
  lightingId: LightingId,
  analysis?: ProductAnalysis,
): LightingId {
  if (lightingId === "ai_recommended") {
    return analysis?.recommendedLightingId ?? "soft";
  }
  return lightingId;
}

function buildGenericScenePrompt(
  styleId: StudioStyleId,
  angleId: CameraAngleId,
  lightingId: LightingId,
  qualityId: QualityId,
  moodModifier: string,
  productSummary?: string,
): string {
  const style = STUDIO_STYLES[styleId];
  const angle = CAMERA_ANGLES[angleId];
  const lighting = LIGHTING_PRESETS[lightingId];
  const quality = QUALITY_PRESETS[qualityId];

  const productLead = productSummary
    ? `the product is ${productSummary}, `
    : "";

  const parts = [
    productLead + style.scenePrompt,
    moodModifier,
    angle.promptSuffix,
    lighting.promptSuffix,
    quality.promptSuffix,
    BASE_SUFFIX,
  ].filter(Boolean);

  return parts.join(", ");
}

export async function buildVariationPlans(
  choices: StudioChoices,
  inputImageUrl?: string,
): Promise<VariationPlan[]> {
  const analysis = choices.analysis;
  const qualityId = choices.qualityId ?? "standard";
  const primaryStyle = resolveStyleId(choices.styleId, analysis);
  const angleId = resolveAngleId(choices.angleId, analysis);
  const baseLighting = resolveLightingId(choices.lightingId, analysis);
  const productSummary = analysis?.summary;
  const styleLabel = STUDIO_STYLES[primaryStyle].label;

  const moods: Array<keyof typeof MOOD_MODIFIERS> = [
    "classic",
    "elevated",
    "dramatic",
  ];
  const labels: Array<"A" | "B" | "C"> = ["A", "B", "C"];
  const quality = QUALITY_PRESETS[qualityId];

  const lightingCycle: LightingId[] = [
    baseLighting,
    baseLighting === "soft" ? "bright" : "soft",
    baseLighting === "dramatic" ? "luxury" : "dramatic",
  ];

  if (choices.customPrompt) {
    const customBase = await enhanceCustomBackgroundPrompt(choices.customPrompt);
    return labels.map((label, i) => ({
      label,
      styleId: primaryStyle,
      styleLabel: `${styleLabel} — ${LIGHTING_PRESETS[lightingCycle[i]].label}`,
      backgroundPrompt: `${customBase}, ${MOOD_MODIFIERS[moods[i]]}, ${CAMERA_ANGLES[angleId].promptSuffix}, ${LIGHTING_PRESETS[lightingCycle[i]].promptSuffix}, ${BASE_SUFFIX}`,
      padding: quality.padding + i * 0.01,
      mood: moods[i],
    }));
  }

  // AI vision: product-specific realistic scenes from the actual photo
  if (inputImageUrl && analysis) {
    const scenePlans = await generateProductScenePlans(
      inputImageUrl,
      analysis,
      choices.styleId,
    );

    return labels.map((label, i) => {
      const plan = scenePlans[i];
      const light = lightingCycle[i];
      const padding =
        i === 0
          ? quality.padding
          : i === 1
            ? Math.max(0.1, quality.padding - 0.01)
            : Math.min(0.14, quality.padding + 0.01);

      return {
        label,
        styleId: primaryStyle,
        styleLabel: `${styleLabel} — ${plan.label}`,
        backgroundPrompt: assemblePhotoroomPrompt(
          plan.sceneCore,
          plan.mood,
          angleId,
          light,
          qualityId,
          {
            mainProduct: analysis.mainProduct,
            productClarity: plan.productClarity || analysis.productClarity,
            productSummary,
          },
        ),
        padding,
        mood: plan.mood,
      };
    });
  }

  // Fallback without image/analysis
  return labels.map((label, i) => {
    const light = lightingCycle[i];
    const padding =
      i === 0
        ? quality.padding
        : i === 1
          ? Math.max(0.1, quality.padding - 0.01)
          : Math.min(0.14, quality.padding + 0.01);

    return {
      label,
      styleId: primaryStyle,
      styleLabel: `${styleLabel} — ${LIGHTING_PRESETS[light].label}`,
      backgroundPrompt: buildGenericScenePrompt(
        primaryStyle,
        angleId,
        light,
        qualityId,
        MOOD_MODIFIERS[moods[i]],
        productSummary,
      ),
      padding,
      mood: moods[i],
    };
  });
}

export function getResolvedStyleLabel(choices: StudioChoices): string {
  const id = resolveStyleId(choices.styleId, choices.analysis);
  return STUDIO_STYLES[id]?.label ?? "Studio";
}
