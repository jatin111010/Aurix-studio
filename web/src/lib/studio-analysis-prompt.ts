/**
 * Master AI Creative Director — precision composition + Photoroom blueprint.
 * Used by Studio Engine analysis before Photoroom execution.
 */

export type SubjectPose = "upright" | "flatlay";

/** Photoroom-native shadow.directionOverride values */
export type ShadowDirection =
  | "behindLeft"
  | "behindRight"
  | "behind"
  | "left"
  | "right"
  | "BOTTOM_CENTER"
  | "CENTER";

export type StudioApiBlueprint = {
  output_size: string;
  padding: number;
  subject_pose: SubjectPose;
  shadow_direction: ShadowDirection | string;
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
  // Higher padding → smaller product (~40% of frame). 0.15 alone still looked ~75%.
  padding: 0.2,
  subject_pose: "upright",
  shadow_direction: "behindLeft",
  shadow_intensity: 0.5,
  shadow_softness: 0.8,
  canvas_bg_color: "FFFFFF",
  enable_beautify: false,
  enable_relighting: true,
  requires_uncrop: false,
  requires_pre_cutout: false,
  export_format: "png",
};

/**
 * Complete Master Checklist + precision framing / grounded shadow rules.
 * Forces GPT-4o to return strict JSON only — no markdown outside the object.
 */
export const CREATIVE_DIRECTOR_SYSTEM_PROMPT = `You are the Master AI Creative Director and precision commercial photographer for Velora Studio.
Analyze a raw mobile photo of a product from an Indian merchant and output a precise technical execution blueprint for the Photoroom API.

You must strictly evaluate the image based on these Core Rules:

SECTION I: IMAGE SANITIZATION & SAFETY
1. Quality Guard: Set "is_usable" to false if the image is pure black, totally blurry, or has no product silhouette.
2. Shopkeeper Advice: If unusable, write a 1-line helpful message in clear Hinglish/Indian English in "user_guidance" (e.g., 'Photo clear nahi hai, please light me click karein').
3. Clutter Detection: If human hands or shop clutter overlap product margins, set api_blueprint.requires_pre_cutout = true.
4. Generative Form Repair: If any product edge is clipped by the camera frame, set api_blueprint.requires_uncrop = true.
5. Logo Safety Shield: Identify primary brand typography. Put a short note in "logo_safety_note" — packaging text is sacrosanct and must stay sharp; never recommend destroying label text.

SECTION II: INDUSTRY PRESETS (Indian sectors)
6. Packaged Foods & Kirana: soft daylight feel; solid grounded weight; shadow_direction "behind" or "BOTTOM_CENTER"; shadow_intensity ~0.55; shadow_softness ~0.75; subject_pose "upright".
7. Cosmetics & Personal Care: high-key commercial; enable_beautify true; shadow_direction "behindLeft"; shadow_intensity ~0.45; shadow_softness ~0.85; subject_pose "upright".
8. Fashion & Apparel: strict color accuracy; if clothing is laid flat set subject_pose "flatlay" and shadow_direction "behind"; otherwise upright.
9. Jewellery & Accessories: bright specular accents; shadow_direction "behindLeft"; shadow_intensity ~0.4; shadow_softness ~0.7; subject_pose often "flatlay" for small pieces.
10. Electronics & Gadgets: cool studio lighting; if tiny accessory use padding >= 0.22 so it is not microscopic; subject_pose "upright".

SECTION III: COMPOSITION, PERSPECTIVE & CANVAS (CRITICAL)
11. The 40% Framing Rule (anti over-scale): Product must NEVER fill more than ~40% of the final 1000x1000 canvas.
    - Default padding: 0.20
    - Tall / vertical boxes: padding 0.18 (still keep breathing room — do NOT use tiny padding)
    - Never set padding below 0.15
    - Never set padding above 0.28
12. Grounded perspective (anti floating): Assume the product sits ON a physical surface with a contact shadow. Prefer upright boxes that look planted, not tilted floating cutouts. Choose shadow_direction that anchors the base (behindLeft / behindRight / behind / BOTTOM_CENTER).
13. Canvas Contrast Guard: If packaging is primarily white/light, set canvas_bg_color to "F5F5F5" (not pure white) to prevent edge washout.
14. Smart Ambient Relighting: Set enable_relighting true by default so the product blends into the new scene — but packaging text must remain crisp (logo_safety_note).
15. Cultural Context Safety: For festive scenes forbid open flames near packaging; use unlit brass diyas and loose marigold petals only.

shadow_direction MUST be one of these Photoroom-native values when possible:
"behindLeft" | "behindRight" | "behind" | "left" | "right" | "BOTTOM_CENTER" | "CENTER"

subject_pose MUST be "upright" (boxes, bottles, vertical packs) or "flatlay" (laid-flat garments/jewelry).

Hard output rules:
- Return STRICT JSON only. No markdown, no code fences, no commentary outside the JSON object.
- If is_usable is true, user_guidance is still a short positive Hinglish/Indian English line.
- detected_category: packaged_foods_kirana | cosmetics_personal_care | fashion_apparel | jewellery_accessories | electronics_gadgets | general
- api_blueprint.output_size = "1000x1000"
- api_blueprint.export_format = "png"
- shadow_intensity and shadow_softness are floats from 0.0 to 1.0
- padding is a float (default 0.20) enforcing ≤40% product frame occupancy

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
    "shadow_direction": "behindLeft|behindRight|behind|left|right|BOTTOM_CENTER|CENTER",
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
  "Analyze this merchant product photo as a precision commercial photographer. Enforce ≤40% product framing, grounded contact shadows (not floating), and sharp packaging text. Return the Photoroom api_blueprint as strict JSON only.";

/** Map creative-director directions to Photoroom shadow.directionOverride values. */
export function mapShadowDirectionOverride(direction: string): string {
  const raw = direction.trim();
  const key = raw.toLowerCase().replace(/[_\s-]+/g, "");

  const map: Record<string, string> = {
    behindleft: "behindLeft",
    behindright: "behindRight",
    behind: "behind",
    left: "left",
    right: "right",
    bottomcenter: "behind",
    center: "behind",
    bottom: "behind",
  };

  return map[key] || "behindLeft";
}

/** Photoroom subjectPoseOverride expects upright/flatlay-compatible values. */
export function mapSubjectPoseOverride(pose: SubjectPose): string {
  return pose === "flatlay" ? "flatlay" : "upright";
}

/** Clamp / normalize model JSON into a safe blueprint for Photoroom. */
export function normalizeCreativeDirectorAnalysis(
  raw: Partial<CreativeDirectorAnalysis> & {
    api_blueprint?: Partial<StudioApiBlueprint>;
  },
): CreativeDirectorAnalysis {
  const bp: Partial<StudioApiBlueprint> = raw.api_blueprint ?? {};

  // Enforce breathing room: min 0.15, prefer ~0.20 so product ≤ ~40% of frame
  const padding =
    typeof bp.padding === "number" && Number.isFinite(bp.padding)
      ? Math.min(0.28, Math.max(0.15, bp.padding))
      : DEFAULT_API_BLUEPRINT.padding;

  const pose: SubjectPose =
    bp.subject_pose === "flatlay" ? "flatlay" : "upright";

  const canvas = String(bp.canvas_bg_color || "FFFFFF")
    .replace("#", "")
    .toUpperCase()
    .slice(0, 6);

  const shadowDirection = mapShadowDirectionOverride(
    String(bp.shadow_direction || DEFAULT_API_BLUEPRINT.shadow_direction),
  );

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
      raw.logo_safety_note ||
        "Preserve all package brand typography exactly — keep label text sharp",
    ).slice(0, 200),
    api_blueprint: {
      output_size: "1000x1000",
      padding,
      subject_pose: pose,
      shadow_direction: shadowDirection,
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

/**
 * Build Photoroom multipart field map from api_blueprint.
 * Skips empty values. Uses advanced shadow overrides + premium headers (applied separately).
 */
export function blueprintToPhotoroomFields(
  blueprint: StudioApiBlueprint,
  options: {
    mode: "catalog" | "ad";
    imageUrl?: string;
    backgroundPrompt?: string;
    /** When true, append advanced grounded shadow overrides */
    applyShadowOverrides?: boolean;
  },
): Record<string, string> {
  const fields: Record<string, string> = {
    removeBackground: "true",
    padding: String(blueprint.padding),
    outputSize: blueprint.output_size || "1000x1000",
    "export.format": "png",
  };

  if (options.imageUrl) {
    fields.imageUrl = options.imageUrl;
  }

  if (options.mode === "catalog") {
    fields["background.color"] = blueprint.canvas_bg_color || "FFFFFF";
  } else if (options.backgroundPrompt?.trim()) {
    fields["background.prompt"] = options.backgroundPrompt.trim();
    fields["expandPrompt.mode"] = "ai.auto";
  }

  // Preserve packaging text sharpness — avoid aggressive recolor bleed
  if (blueprint.enable_relighting) {
    fields["lighting.mode"] =
      options.mode === "ad"
        ? "ai.preserve-hue-and-saturation"
        : "ai.auto";
  }

  if (blueprint.enable_beautify) {
    fields["beautify.mode"] = "ai.auto";
  }

  if (blueprint.requires_uncrop) {
    fields["uncrop.mode"] = "ai.auto";
  }

  // Valid Photoroom enum is ai.artificial (not bare "artificial")
  // Only strip post-process overlays; packaging labels should remain
  fields["textRemoval.mode"] = "ai.artificial";

  if (options.applyShadowOverrides !== false) {
    fields["shadow.mode"] = "ai.auto-with-overrides";
    fields["shadow.subjectPoseOverride"] = mapSubjectPoseOverride(
      blueprint.subject_pose,
    );
    fields["shadow.directionOverride"] = mapShadowDirectionOverride(
      String(blueprint.shadow_direction),
    );
    fields["shadow.intensityOverride"] = String(blueprint.shadow_intensity);
    fields["shadow.softnessOverride"] = String(blueprint.shadow_softness);
  }

  // Drop empties
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || String(v).trim() === "") {
      delete fields[k];
    }
  }

  return fields;
}
