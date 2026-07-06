/**
 * Parse natural-language studio intent from user messages.
 */

import type { ProductAnalysis } from "@/lib/studio-analysis";
import type {
  CameraAngleId,
  LightingId,
  QualityId,
  StudioStyleId,
} from "@/lib/studio-options";

export type StudioIntent = {
  styleId?: StudioStyleId;
  angleId?: CameraAngleId;
  lightingId?: LightingId;
  qualityId?: QualityId;
  diecut?: boolean;
  customPrompt?: string;
  skipToGenerate?: boolean;
};

const STYLE_PATTERNS: Array<{ re: RegExp; styleId: StudioStyleId }> = [
  { re: /remove\s*background|transparent|die[\s-]?cut|no\s*background|png/i, styleId: "diecut" },
  { re: /white\s*background|white\s*studio|amazon|flipkart|e[\s-]?commerce|shopify|catalog/i, styleId: "ecommerce" },
  { re: /luxury\s*black|black\s*luxury|dark\s*luxury/i, styleId: "luxury_black" },
  { re: /luxury\s*white/i, styleId: "luxury_white" },
  { re: /marble/i, styleId: "marble" },
  { re: /wood|wooden/i, styleId: "wooden" },
  { re: /minimal/i, styleId: "minimal" },
  { re: /festival|diwali|rakhi|holi/i, styleId: "festival" },
  { re: /kitchen/i, styleId: "kitchen" },
  { re: /reflection|reflective|glossy/i, styleId: "reflection" },
  { re: /gold|golden/i, styleId: "gold" },
  { re: /concrete/i, styleId: "concrete" },
  { re: /outdoor/i, styleId: "outdoor" },
  { re: /living\s*room/i, styleId: "living_room" },
  { re: /office/i, styleId: "office" },
  { re: /fashion/i, styleId: "fashion_studio" },
  { re: /floating/i, styleId: "floating" },
  { re: /luxury/i, styleId: "luxury_black" },
];

const ANGLE_PATTERNS: Array<{ re: RegExp; angleId: CameraAngleId }> = [
  { re: /top\s*view|flat\s*lay|overhead/i, angleId: "top" },
  { re: /45|three\s*quarter|angled/i, angleId: "angle_45" },
  { re: /close[\s-]?up|macro|detail/i, angleId: "closeup" },
  { re: /floating/i, angleId: "floating" },
  { re: /front/i, angleId: "front" },
];

const LIGHTING_PATTERNS: Array<{ re: RegExp; lightingId: LightingId }> = [
  { re: /dramatic|cinematic/i, lightingId: "dramatic" },
  { re: /bright|high[\s-]?key/i, lightingId: "bright" },
  { re: /warm|golden/i, lightingId: "warm" },
  { re: /luxury|premium/i, lightingId: "luxury" },
  { re: /soft/i, lightingId: "soft" },
];

export function parseStudioIntent(
  text: string,
  analysis?: ProductAnalysis,
): StudioIntent {
  const lower = text.trim().toLowerCase();
  const intent: StudioIntent = {};

  for (const { re, styleId } of STYLE_PATTERNS) {
    if (re.test(lower)) {
      if (styleId === "diecut") {
        intent.diecut = true;
        intent.styleId = "diecut";
        intent.skipToGenerate = true;
      } else {
        intent.styleId = styleId;
      }
      break;
    }
  }

  for (const { re, angleId } of ANGLE_PATTERNS) {
    if (re.test(lower)) {
      intent.angleId = angleId;
      break;
    }
  }

  for (const { re, lightingId } of LIGHTING_PATTERNS) {
    if (re.test(lower)) {
      intent.lightingId = lightingId;
      break;
    }
  }

  if (/ultra|4k|premium\s*quality/i.test(lower)) {
    intent.qualityId = "ultra";
  } else if (/\bhd\b|high\s*res/i.test(lower)) {
    intent.qualityId = "hd";
  }

  if (/generate|create|make\s*it|go\s*ahead|start/i.test(lower) && intent.styleId) {
    intent.skipToGenerate = true;
  }

  if (/make\s*it\s*luxury/i.test(lower) && !intent.styleId) {
    intent.styleId = analysis?.premiumLevel === "luxury" ? "gold" : "luxury_black";
  }

  if (!intent.styleId && lower.length >= 8 && !intent.diecut) {
    const sceneHints = /backdrop|background|scene|counter|table|studio/i;
    if (sceneHints.test(lower)) {
      intent.customPrompt = text.trim().slice(0, 200);
      intent.skipToGenerate = true;
    }
  }

  return intent;
}

export function mergeIntentWithAnalysis(
  intent: StudioIntent,
  analysis: ProductAnalysis,
): {
  styleId: StudioStyleId;
  angleId: CameraAngleId;
  lightingId: LightingId;
  qualityId: QualityId;
} {
  return {
    styleId: intent.styleId ?? "ai_recommended",
    angleId: intent.angleId ?? analysis.recommendedAngleId ?? "ai_recommended",
    lightingId:
      intent.lightingId ?? analysis.recommendedLightingId ?? "ai_recommended",
    qualityId: intent.qualityId ?? "standard",
  };
}
