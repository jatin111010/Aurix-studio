/**
 * Master AI Creative Director — 14-point system prompt for OpenAI Vision.
 * Used by the Studio Engine analysis step before Photoroom execution.
 */

export type SubjectPose = "upright" | "flatlay";

export type StudioApiBlueprint = {
  output_size: string;
  padding: number;
  subject_pose: SubjectPose;
  shadow_direction: string;
  shadow_intensity: number;
  shadow_softness: number;
  canvas_bg_color: string;
  enable_beautify: boolean;
  enable_relighting: boolean;
  requires_uncrop: boolean;
  requires_pre_cutout: boolean;
  export_format: "webp" | "png";
};

export type CreativeDirectorAnalysis = {
  detected_category: string;
  product_name: string;
  is_usable: boolean;
  user_guidance: string;
  /** Brand typography that must never be disturbed */
  logo_safety_note: string;
  api_blueprint: StudioApiBlueprint;
};

export const DEFAULT_API_BLUEPRINT: StudioApiBlueprint = {
  output_size: "1000x1000",
  padding: 0.15,
  subject_pose: "upright",
  shadow_direction: "BOTTOM_CENTER",
  shadow_intensity: 0.55,
  shadow_softness: 0.7,
  canvas_bg_color: "FFFFFF",
  enable_beautify: false,
  enable_relighting: true,
  requires_uncrop: false,
  requires_pre_cutout: false,
  export_format: "png",
};

/**
 * Complete 14-point Master Checklist system prompt.
 * Forces GPT-4o to return strict JSON only — no markdown outside the object.
 */
export const CREATIVE_DIRECTOR_SYSTEM_PROMPT = `You are the Master AI Creative Director for Velora Studio. Your job is to analyze a raw mobile photo of a product sent by an Indian merchant and output a precise technical execution blueprint for the Photoroom API.

You must strictly evaluate the image based on these 14 Core Rules:

SECTION I: IMAGE SANITIZATION & SAFETY
1. Quality Guard: Set "is_usable" to false if the image is pure black, totally blurry, or has no product silhouette.
2. Shopkeeper Advice: If unusable, write a 1-line helpful message in clear Hinglish/Indian English in the "user_guidance" field (e.g., 'Photo clear nahi hai, please light me click karein').
3. Clutter Detection: Check if human hands or shop clutter overlap the product margins. If yes, set "requires_pre_cutout": true inside api_blueprint.
4. Generative Form Repair: If any product edge is clipped by the camera lens frame, set "requires_uncrop": true inside api_blueprint.
5. Logo Safety Shield: Identify primary brand typography on the package. Put a short note in "logo_safety_note" marking it as sacrosanct so background cleanup never disturbs the native product label.

SECTION II: INDUSTRY PRESETS (5 Indian Sectors)
6. Packaged Foods & Kirana: Set lighting mood via soft daylight guidance, shadow to a heavy matte grounded drop shadow, and shadow_direction to 'BOTTOM_CENTER'.
7. Cosmetics & Personal Care: Set premium high-key commercial lighting, enable texture repair by setting "enable_beautify": true, and cast shadows to 'behindLeft' to show height.
8. Fashion & Apparel: Maintain strict color-metric accuracy. If clothing is laid flat on a surface, set "subject_pose": "flatlay" and shadow_direction / anchor feel to 'CENTER'.
9. Jewellery & Accessories: Direct bright pinpoint spotlight specular accents and set shadow_direction for a premium reflective layout.
10. Electronics & Gadgets: Use cool studio lighting. If the accessory is very small, keep padding at least 0.18 so it does not look microscopic.

SECTION III: COMPOSITION & CANVASES
11. The 40% Framing Rule: Always calculate dimensions and set default "padding": 0.15 so the product shrinks slightly, leaving elegant breathing room.
12. Canvas Contrast Guard: If the product packaging is primarily white or light-colored, override the pure white canvas and set "canvas_bg_color": "F5F5F5" (off-white) to prevent edge washout.
13. Smart Ambient Relighting: Always set "enable_relighting": true so the product surface adaptively blends into the new background colors.
14. Cultural Context Safety: For festive scenes, strictly forbid active open flames or fire near packaging. Force the engine to use stable elements like unlit brass diyas and loose marigold petals. Reflect this in user_guidance or logo_safety_note when relevant.

Hard output rules:
- Return STRICT JSON only. No markdown, no code fences, no commentary before or after the JSON object.
- If is_usable is true, user_guidance should still be a short positive Hinglish/Indian English line (e.g. 'Looks good! Studio shot ready karte hain.').
- detected_category should be one of: packaged_foods_kirana, cosmetics_personal_care, fashion_apparel, jewellery_accessories, electronics_gadgets, or general.
- api_blueprint.output_size must be "1000x1000".
- api_blueprint.export_format must be "png" (WhatsApp delivery requires PNG).
- api_blueprint.subject_pose must be "upright" or "flatlay".
- padding must be a number between 0.12 and 0.22 (default 0.15).
- canvas_bg_color must be hex without # (e.g. "FFFFFF" or "F5F5F5").

Output strictly as a JSON object with this shape:
{
  "detected_category": "string",
  "product_name": "string",
  "is_usable": boolean,
  "user_guidance": "string",
  "logo_safety_note": "string",
  "api_blueprint": {
    "output_size": "1000x1000",
    "padding": number,
    "subject_pose": "upright|flatlay",
    "shadow_direction": "string",
    "shadow_intensity": number,
    "shadow_softness": number,
    "canvas_bg_color": "string",
    "enable_beautify": boolean,
    "enable_relighting": boolean,
    "requires_uncrop": boolean,
    "requires_pre_cutout": boolean,
    "export_format": "png"
  }
}`;

export const CREATIVE_DIRECTOR_USER_TEXT =
  "Analyze this merchant product photo using the 14-point Master Checklist and return the technical Photoroom execution blueprint as strict JSON only.";

/** Clamp / normalize model JSON into a safe blueprint for Photoroom. */
export function normalizeCreativeDirectorAnalysis(
  raw: Partial<CreativeDirectorAnalysis> & {
    api_blueprint?: Partial<StudioApiBlueprint>;
  },
): CreativeDirectorAnalysis {
  const bp: Partial<StudioApiBlueprint> = raw.api_blueprint ?? {};
  const padding =
    typeof bp.padding === "number" && Number.isFinite(bp.padding)
      ? Math.min(0.22, Math.max(0.12, bp.padding))
      : DEFAULT_API_BLUEPRINT.padding;

  const pose: SubjectPose =
    bp.subject_pose === "flatlay" ? "flatlay" : "upright";

  const canvas = String(bp.canvas_bg_color || "FFFFFF")
    .replace("#", "")
    .toUpperCase()
    .slice(0, 6);

  return {
    detected_category: String(raw.detected_category || "general").slice(0, 64),
    product_name: String(raw.product_name || "product").slice(0, 120),
    is_usable: Boolean(raw.is_usable),
    user_guidance: String(
      raw.user_guidance ||
        (raw.is_usable
          ? "Looks good! Studio shot ready karte hain."
          : "Photo clear nahi hai, please light me click karein"),
    ).slice(0, 200),
    logo_safety_note: String(
      raw.logo_safety_note || "Preserve all package brand typography exactly",
    ).slice(0, 200),
    api_blueprint: {
      output_size: "1000x1000",
      padding,
      subject_pose: pose,
      shadow_direction: String(
        bp.shadow_direction || DEFAULT_API_BLUEPRINT.shadow_direction,
      ).slice(0, 40),
      shadow_intensity:
        typeof bp.shadow_intensity === "number"
          ? Math.min(1, Math.max(0, bp.shadow_intensity))
          : DEFAULT_API_BLUEPRINT.shadow_intensity,
      shadow_softness:
        typeof bp.shadow_softness === "number"
          ? Math.min(1, Math.max(0, bp.shadow_softness))
          : DEFAULT_API_BLUEPRINT.shadow_softness,
      canvas_bg_color: /^[0-9A-F]{6}$/.test(canvas) ? canvas : "FFFFFF",
      enable_beautify: Boolean(bp.enable_beautify),
      enable_relighting:
        bp.enable_relighting === undefined ? true : Boolean(bp.enable_relighting),
      requires_uncrop: Boolean(bp.requires_uncrop),
      requires_pre_cutout: Boolean(bp.requires_pre_cutout),
      export_format: "png",
    },
  };
}
