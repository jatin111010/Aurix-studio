/**
 * Build Photoroom prompts for studio variations.
 */

import { enhanceCustomBackgroundPrompt } from "@/lib/background-prompt";
import type { ProductAnalysis } from "@/lib/studio-analysis";
import { pickVariationStyleIds } from "@/lib/studio-recommendations";
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

const BASE_SUFFIX =
  "professional product photography, sharp focus, clean composition, natural shadows, premium commercial quality";

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

function buildScenePrompt(
  styleId: StudioStyleId,
  angleId: CameraAngleId,
  lightingId: LightingId,
  qualityId: QualityId,
  moodModifier: string,
): string {
  const style = STUDIO_STYLES[styleId];
  const angle = CAMERA_ANGLES[angleId];
  const lighting = LIGHTING_PRESETS[lightingId];
  const quality = QUALITY_PRESETS[qualityId];

  const parts = [
    style.scenePrompt,
    moodModifier,
    angle.promptSuffix,
    lighting.promptSuffix,
    quality.promptSuffix,
    BASE_SUFFIX,
  ].filter(Boolean);

  return parts.join(", ");
}

const MOOD_MODIFIERS = {
  classic: "balanced hero composition, centered product",
  elevated: "slightly elevated perspective, airy spacing",
  dramatic: "rich contrast mood, cinematic depth",
} as const;

export async function buildVariationPlans(
  choices: StudioChoices,
): Promise<VariationPlan[]> {
  const analysis = choices.analysis;
  const qualityId = choices.qualityId ?? "standard";
  const primaryStyle = resolveStyleId(choices.styleId, analysis);
  const angleId = resolveAngleId(choices.angleId, analysis);
  const lightingId = resolveLightingId(choices.lightingId, analysis);
  const category = analysis?.category ?? "general";

  const [styleA, styleB, styleC] = pickVariationStyleIds(
    choices.styleId,
    category,
    analysis,
  );

  const styles: Array<{ id: StudioStyleId; mood: keyof typeof MOOD_MODIFIERS }> = [
    { id: styleA, mood: "classic" },
    { id: styleB, mood: "elevated" },
    { id: styleC, mood: "dramatic" },
  ];

  const lightingCycle: LightingId[] = [
    lightingId,
    lightingId === "soft" ? "bright" : "soft",
    lightingId === "dramatic" ? "luxury" : "dramatic",
  ];

  const labels: Array<"A" | "B" | "C"> = ["A", "B", "C"];
  const quality = QUALITY_PRESETS[qualityId];

  if (choices.customPrompt) {
    const customBase = await enhanceCustomBackgroundPrompt(choices.customPrompt);
    return labels.map((label, i) => ({
      label,
      styleId: primaryStyle,
      styleLabel: "Custom scene",
      backgroundPrompt: `${customBase}, ${MOOD_MODIFIERS[styles[i].mood]}, ${CAMERA_ANGLES[angleId].promptSuffix}, ${LIGHTING_PRESETS[lightingCycle[i]].promptSuffix}`,
      padding: quality.padding + i * 0.01,
      mood: styles[i].mood,
    }));
  }

  return labels.map((label, i) => {
    const styleId = styles[i].id;
    const light = lightingCycle[i];
    const padding =
      i === 0
        ? quality.padding
        : i === 1
          ? Math.max(0.08, quality.padding - 0.02)
          : Math.min(0.14, quality.padding + 0.02);

    return {
      label,
      styleId,
      styleLabel: STUDIO_STYLES[styleId].label,
      backgroundPrompt: buildScenePrompt(
        styleId,
        angleId,
        light,
        qualityId,
        MOOD_MODIFIERS[styles[i].mood],
      ),
      padding,
      mood: styles[i].mood,
    };
  });
}

export function getResolvedStyleLabel(choices: StudioChoices): string {
  const id = resolveStyleId(choices.styleId, choices.analysis);
  return STUDIO_STYLES[id]?.label ?? "Studio";
}
