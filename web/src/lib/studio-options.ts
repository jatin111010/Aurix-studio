/** Studio Shot style, camera, lighting, and quality presets. */

import type { VeloraLang } from "@/lib/velora-voice";

export type StudioStyleId =
  | "ai_recommended"
  | "white_studio"
  | "luxury_black"
  | "luxury_white"
  | "marble"
  | "wooden"
  | "minimal"
  | "festival"
  | "kitchen"
  | "reflection"
  | "gold"
  | "dark"
  | "floating"
  | "concrete"
  | "outdoor"
  | "living_room"
  | "modern_home"
  | "office"
  | "lifestyle"
  | "fashion_studio"
  | "ecommerce"
  | "diecut";

export type CameraAngleId =
  | "ai_recommended"
  | "front"
  | "angle_45"
  | "top"
  | "closeup"
  | "floating";

export type LightingId =
  | "ai_recommended"
  | "soft"
  | "bright"
  | "luxury"
  | "warm"
  | "dramatic";

export type QualityId = "standard" | "hd" | "ultra";

export type StudioStyle = {
  id: StudioStyleId;
  label: string;
  description: string;
  scenePrompt: string;
};

export const STUDIO_STYLES: Record<StudioStyleId, StudioStyle> = {
  ai_recommended: {
    id: "ai_recommended",
    label: "AI Recommended",
    description: "Best match for your product",
    scenePrompt: "",
  },
  white_studio: {
    id: "white_studio",
    label: "White Studio",
    description: "Clean Amazon / e-commerce look",
    scenePrompt:
      "pure white seamless studio backdrop, soft diffused commercial lighting, ecommerce product photo",
  },
  luxury_black: {
    id: "luxury_black",
    label: "Luxury Black",
    description: "Premium dark moody studio",
    scenePrompt:
      "polished black marble surface, moody premium luxury lighting, high-end product photography",
  },
  luxury_white: {
    id: "luxury_white",
    label: "Luxury White",
    description: "Elegant bright premium",
    scenePrompt:
      "bright white studio with soft gold accent lighting, luxury cosmetic product photography",
  },
  marble: {
    id: "marble",
    label: "Marble",
    description: "Elegant stone surface",
    scenePrompt:
      "elegant white Carrara marble surface with subtle grey veins, premium studio lighting",
  },
  wooden: {
    id: "wooden",
    label: "Wooden",
    description: "Warm natural wood table",
    scenePrompt:
      "warm natural oak wood table with soft grain texture, cozy natural daylight",
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    description: "Simple modern clean",
    scenePrompt:
      "minimal light grey studio backdrop, clean modern aesthetic, soft shadows",
  },
  festival: {
    id: "festival",
    label: "Festival",
    description: "Warm festive Indian vibe",
    scenePrompt:
      "warm golden diwali fairy lights bokeh background, festive indian celebration mood",
  },
  kitchen: {
    id: "kitchen",
    label: "Kitchen",
    description: "Fresh kitchen counter",
    scenePrompt:
      "modern clean kitchen countertop, bright natural light, food product photography",
  },
  reflection: {
    id: "reflection",
    label: "Reflection",
    description: "Glossy reflective surface",
    scenePrompt:
      "glossy black reflective surface with subtle mirror reflection, premium studio lighting",
  },
  gold: {
    id: "gold",
    label: "Gold",
    description: "Warm gold luxury tones",
    scenePrompt:
      "warm champagne gold gradient backdrop, luxury jewelry product photography lighting",
  },
  dark: {
    id: "dark",
    label: "Dark",
    description: "Tech & electronics mood",
    scenePrompt:
      "dark charcoal studio backdrop, cool blue accent rim lighting, tech product photography",
  },
  floating: {
    id: "floating",
    label: "Floating",
    description: "Product floating in space",
    scenePrompt:
      "soft gradient studio backdrop, product floating with soft shadow beneath, clean commercial look",
  },
  concrete: {
    id: "concrete",
    label: "Concrete",
    description: "Modern urban minimal",
    scenePrompt:
      "smooth grey concrete surface, modern minimalist urban style, balanced studio light",
  },
  outdoor: {
    id: "outdoor",
    label: "Outdoor",
    description: "Natural daylight scene",
    scenePrompt:
      "outdoor natural daylight, soft bokeh greenery background, lifestyle product shot",
  },
  living_room: {
    id: "living_room",
    label: "Living Room",
    description: "Home interior lifestyle",
    scenePrompt:
      "modern living room interior, soft natural window light, lifestyle furniture product photo",
  },
  modern_home: {
    id: "modern_home",
    label: "Modern Home",
    description: "Contemporary home setting",
    scenePrompt:
      "contemporary home interior with neutral tones, warm ambient lighting, decor product photography",
  },
  office: {
    id: "office",
    label: "Office",
    description: "Professional workspace",
    scenePrompt:
      "clean modern office desk setting, professional ambient lighting, business product photo",
  },
  lifestyle: {
    id: "lifestyle",
    label: "Lifestyle",
    description: "Natural lifestyle scene",
    scenePrompt:
      "lifestyle setting with soft natural light, authentic everyday scene, product hero shot",
  },
  fashion_studio: {
    id: "fashion_studio",
    label: "Fashion Studio",
    description: "Editorial fashion look",
    scenePrompt:
      "fashion editorial studio with soft blush tones, elegant diffused lighting, apparel product shot",
  },
  ecommerce: {
    id: "ecommerce",
    label: "E-commerce",
    description: "Amazon / Flipkart ready",
    scenePrompt:
      "pure white background, professional ecommerce product photography, even lighting, catalog ready",
  },
  diecut: {
    id: "diecut",
    label: "Transparent PNG",
    description: "Remove background completely",
    scenePrompt: "",
  },
};

export const CAMERA_ANGLES: Record<
  CameraAngleId,
  { id: CameraAngleId; label: string; promptSuffix: string }
> = {
  ai_recommended: {
    id: "ai_recommended",
    label: "AI Recommended",
    promptSuffix: "",
  },
  front: {
    id: "front",
    label: "Front",
    promptSuffix: "front facing centered product shot",
  },
  angle_45: {
    id: "angle_45",
    label: "45°",
    promptSuffix: "three quarter 45 degree angle product photography",
  },
  top: {
    id: "top",
    label: "Top View",
    promptSuffix: "top down flat lay product photography",
  },
  closeup: {
    id: "closeup",
    label: "Close-up",
    promptSuffix: "close up hero product shot with detail focus",
  },
  floating: {
    id: "floating",
    label: "Floating",
    promptSuffix: "floating product with soft drop shadow beneath",
  },
};

export const LIGHTING_PRESETS: Record<
  LightingId,
  { id: LightingId; label: string; promptSuffix: string }
> = {
  ai_recommended: {
    id: "ai_recommended",
    label: "AI Recommended",
    promptSuffix: "",
  },
  soft: {
    id: "soft",
    label: "Soft",
    promptSuffix: "soft diffused studio lighting, gentle shadows",
  },
  bright: {
    id: "bright",
    label: "Bright",
    promptSuffix: "bright high-key studio lighting, airy clean look",
  },
  luxury: {
    id: "luxury",
    label: "Luxury",
    promptSuffix: "luxury premium studio lighting, rich highlights, elegant mood",
  },
  warm: {
    id: "warm",
    label: "Warm",
    promptSuffix: "warm golden hour studio lighting, inviting atmosphere",
  },
  dramatic: {
    id: "dramatic",
    label: "Dramatic",
    promptSuffix: "dramatic contrast lighting, cinematic product photography",
  },
};

export const QUALITY_PRESETS: Record<
  QualityId,
  { id: QualityId; label: string; description: string; padding: number; promptSuffix: string }
> = {
  standard: {
    id: "standard",
    label: "Standard",
    description: "Fast, great for WhatsApp",
    padding: 0.12,
    promptSuffix: "high quality product photo",
  },
  hd: {
    id: "hd",
    label: "HD",
    description: "Sharper detail & spacing",
    padding: 0.1,
    promptSuffix: "high resolution sharp commercial product photography",
  },
  ultra: {
    id: "ultra",
    label: "Ultra HD",
    description: "Premium catalog quality",
    padding: 0.08,
    promptSuffix: "ultra sharp premium catalog photography, maximum detail",
  },
};

export type StudioChoices = {
  mode: "studio";
  lang?: VeloraLang;
  styleId: StudioStyleId;
  resolvedStyleId?: StudioStyleId;
  angleId: CameraAngleId;
  lightingId: LightingId;
  qualityId: QualityId;
  customPrompt?: string;
  studioStyle: "scene" | "diecut";
  analysis?: import("@/lib/studio-analysis").ProductAnalysis;
};

export function isStudioStyleId(id: string): id is StudioStyleId {
  return id in STUDIO_STYLES;
}

export function isCameraAngleId(id: string): id is CameraAngleId {
  return id in CAMERA_ANGLES;
}

export function isLightingId(id: string): id is LightingId {
  return id in LIGHTING_PRESETS;
}

export function isQualityId(id: string): id is QualityId {
  return id in QUALITY_PRESETS;
}

export function getStudioChoices(
  choices: Record<string, unknown>,
): StudioChoices {
  return choices as StudioChoices;
}
