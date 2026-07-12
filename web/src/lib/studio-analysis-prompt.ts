/**
 * Master AI Creative Director — precision composition + Photoroom blueprint.
 * Used by Studio Engine analysis before Photoroom execution.
 */

export type SubjectPose = "upright" | "flatlay";

/** Compact vs tall/open silhouettes drive locked padding (0.18 vs 0.20). */
export type ProductSilhouette = "compact" | "tall_open_asymmetrical";

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
  /** Drives hardcoded padding lock: open lids / tall boxes → 0.20 */
  silhouette: ProductSilhouette;
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

/** Locked padding for compact products (still ≤40% frame). */
export const PADDING_COMPACT = 0.18;
/** Locked padding for tall / open / asymmetrical silhouettes (open lids). */
export const PADDING_TALL_OPEN = 0.22;

export const DEFAULT_API_BLUEPRINT: StudioApiBlueprint = {
  output_size: "1000x1000",
  padding: PADDING_TALL_OPEN,
  subject_pose: "upright",
  silhouette: "tall_open_asymmetrical",
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
 * Strict prop-specificity rules shared by analysis + lifestyle background prompts.
 * Prevents Photoroom from inventing repetitive abstract yellow circles / clutter.
 */
export const PROP_SPECIFICITY_RULES = `STRICT PROP SPECIFICITY (mandatory):
- NEVER use generic open-ended plurals like "marigolds", "candles", "decorations", "flowers", "props", "accents", "ornaments", "festive elements", "yellow decorations".
- NEVER invent abstract shapes, circles, dots, blobs, confetti, or repetitive yellow motifs on the table.
- Every prop must have an EXACT small count (1, 2, or 3) and a CLEAR position (left side, right side, behind product, front-left corner).
- BAD: "Premium gift display with candles and scattered yellow decorations"
- GOOD: "Premium lifestyle display on high-end marble surface, featuring exactly two unlit brass diyas placed neatly on the right side, and three individual orange marigold petals elegantly resting near the front-left corner of the table."
- Prefer a clean surface with at most 2–3 real physical props total.
- Cultural / festive: only unlit brass diyas and individual marigold petals — never open flames or fire near packaging.`;

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
10. Electronics & Gadgets: cool studio lighting; subject_pose "upright"; silhouette usually "compact".

SECTION III: COMPOSITION, PERSPECTIVE & CANVAS (CRITICAL)
11. Visible border margin rule (anti over-scale): Product (including open lids) must NEVER touch the absolute top/bottom borders. Keep a clearly visible gap on all sides. Product should occupy about 35–40% of the 1000x1000 canvas.
    - padding is a float between 0.18 and 0.25 depending on product height to ensure a visible margin gap at the borders.
    - Set api_blueprint.silhouette = "tall_open_asymmetrical" for open gift boxes, open lids, tall vertical packs, or irregular silhouettes → engine will FORCE padding = 0.22
    - Set api_blueprint.silhouette = "compact" for closed boxes, bottles, jars → engine will FORCE padding = 0.18
    - Always also set api_blueprint.padding to 0.22 (tall/open) or 0.18 (compact) to match silhouette — do not invent values outside 0.18–0.25
12. Center alignment: Keep the subject vertically and horizontally centered so the breathing-room gap is distributed evenly at top and bottom (never pushed upward against the top border).
13. Grounded perspective (anti floating): Product sits ON a physical surface with contact shadow. Not tilted floating cutouts.
14. Canvas Contrast Guard: If packaging is primarily white/light, set canvas_bg_color to "F5F5F5".
15. Smart Ambient Relighting: enable_relighting true by default; packaging text must remain crisp.
16. Cultural Context Safety: festive scenes — unlit brass diyas and individual marigold petals only; no open flames.

${PROP_SPECIFICITY_RULES}

shadow_direction MUST be one of:
"behindLeft" | "behindRight" | "behind" | "left" | "right" | "BOTTOM_CENTER" | "CENTER"

subject_pose MUST be "upright" or "flatlay".
silhouette MUST be "compact" or "tall_open_asymmetrical".

Hard output rules:
- Return STRICT JSON only. No markdown, no code fences, no commentary outside the JSON object.
- If is_usable is true, user_guidance is still a short positive Hinglish/Indian English line.
- detected_category: packaged_foods_kirana | cosmetics_personal_care | fashion_apparel | jewellery_accessories | electronics_gadgets | general
- api_blueprint.output_size = "1000x1000"
- api_blueprint.export_format = "png"
- shadow_intensity and shadow_softness are floats from 0.0 to 1.0
- padding: a float between 0.18 and 0.25 depending on product height to ensure a visible margin gap at the borders (engine locks open/tall boxes to 0.22 and compact products to 0.18)

Output strictly as a JSON object with this shape:
{
  "detected_category": "string",
  "product_name": "string",
  "is_usable": boolean,
  "user_guidance": "string",
  "logo_safety_note": "string",
  "api_blueprint": {
    "output_size": "1000x1000",
    "padding": 0.22,
    "silhouette": "compact|tall_open_asymmetrical",
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
  "Analyze this merchant product photo as a precision commercial photographer. Detect if the silhouette is tall/open/asymmetrical (e.g. open gift box lid). Enforce visible top/bottom margin gaps with padding between 0.18 and 0.25 (open boxes → 0.22). Keep subject centered. Return strict JSON only.";

/**
 * Lifestyle / ad background prompt writer — exact counts & positions only.
 */
export const AD_BACKGROUND_SYSTEM_PROMPT = `You are a commercial product photographer writing ONE Photoroom background.prompt for an Indian e-commerce social shoot.

Rules:
- Describe ONLY the environment: surface material, 1–3 precise props, visible detailed background, lighting direction.
- Product must look PLANTED on the surface (not floating/tilted). Mention a clear table/counter contact plane.
- Product centered both horizontally and vertically, occupying about 35–40% of the frame with generous empty margin so lids/tops never touch the frame border (open boxes need ~22% padding margin).
- Background fully detailed and visible — no blur, no bokeh, no empty gradient.
- No hands, people, brand names, logos, watermarks, or abstract generative shapes.
- No repetitive yellow circles, dots, blobs, confetti, or random decorative scatter.

${PROP_SPECIFICITY_RULES}

Output ONE paragraph only (55–85 words). No JSON. No quotes around the whole answer.`;

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

export function mapSubjectPoseOverride(pose: SubjectPose): string {
  return pose === "flatlay" ? "flatlay" : "upright";
}

/**
 * Hard-lock padding so tall/open lids never touch frame borders.
 * compact → 0.18 | tall_open_asymmetrical → 0.22
 * Never trust model-invented padding for final Photoroom calls.
 */
export function lockPaddingForSilhouette(
  silhouette: ProductSilhouette | string | undefined,
  productNameHint?: string,
): number {
  const hint = `${silhouette ?? ""} ${productNameHint ?? ""}`.toLowerCase();
  const looksTallOpen =
    silhouette === "tall_open_asymmetrical" ||
    /\b(open|lid|gift\s*box|hamper|tall|asymmetr)/i.test(hint);

  return looksTallOpen ? PADDING_TALL_OPEN : PADDING_COMPACT;
}

/** Format padding for Photoroom multipart — fixed 2 decimals, never empty. */
export function formatPhotoroomPadding(padding: number): string {
  const locked =
    padding === PADDING_COMPACT || padding === PADDING_TALL_OPEN
      ? padding
      : padding >= 0.2
        ? PADDING_TALL_OPEN
        : PADDING_COMPACT;
  return locked.toFixed(2);
}

/** Clamp / normalize model JSON into a safe blueprint for Photoroom. */
export function normalizeCreativeDirectorAnalysis(
  raw: Partial<CreativeDirectorAnalysis> & {
    api_blueprint?: Partial<StudioApiBlueprint>;
  },
): CreativeDirectorAnalysis {
  const bp: Partial<StudioApiBlueprint> = raw.api_blueprint ?? {};

  const pose: SubjectPose =
    bp.subject_pose === "flatlay" ? "flatlay" : "upright";

  const silhouette: ProductSilhouette =
    bp.silhouette === "compact" ? "compact" : "tall_open_asymmetrical";

  // Engine authority: overwrite any model padding with locked 0.18 / 0.22
  const padding = lockPaddingForSilhouette(silhouette, String(raw.product_name || ""));

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
      silhouette,
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
 * Padding is always re-locked and formatted to avoid overwrite / stringify bugs.
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
  const lockedPadding = lockPaddingForSilhouette(
    blueprint.silhouette,
    undefined,
  );
  // Prefer blueprint.padding only if it already matches a lock value
  const paddingValue =
    blueprint.padding === PADDING_COMPACT ||
    blueprint.padding === PADDING_TALL_OPEN
      ? blueprint.padding
      : lockedPadding;

  const fields: Record<string, string> = {
    removeBackground: "true",
    padding: formatPhotoroomPadding(paddingValue),
    // Even top/bottom gap — do not push product toward the top border
    verticalAlignment: "center",
    horizontalAlignment: "center",
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
    // Keep expand, but prop-specific prompt already forbids abstract clutter
    fields["expandPrompt.mode"] = "ai.auto";
  }

  // Production polish: always bind lighting.mode = ai.auto when relighting
  if (blueprint.enable_relighting) {
    fields["lighting.mode"] = "ai.auto";
  }

  if (blueprint.enable_beautify) {
    fields["beautify.mode"] = "ai.auto";
  }

  if (blueprint.requires_uncrop) {
    fields["uncrop.mode"] = "ai.auto";
  }

  // Photoroom valid enum is ai.artificial (user shorthand "artificial")
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

  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || String(v).trim() === "") {
      delete fields[k];
    }
  }

  // Final guard: padding must always exist as "0.18" or "0.22" and stay centered
  fields.padding = formatPhotoroomPadding(paddingValue);
  fields.verticalAlignment = "center";
  fields.horizontalAlignment = "center";

  return fields;
}
