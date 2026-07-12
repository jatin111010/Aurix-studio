/**
 * Core Studio Engine — shared by WhatsApp + POST /api/process-studio-request
 *
 * Modes:
 *  - catalog → solid canvas packshot (blueprint-driven)
 *  - ad      → GPT-4o vibe prompt → Photoroom AI background (model v3)
 *
 * Step 1 always runs the Master Creative Director analysis (precision framing + shadows).
 */

import {
  AD_BACKGROUND_SYSTEM_PROMPT,
  CREATIVE_DIRECTOR_SYSTEM_PROMPT,
  CREATIVE_DIRECTOR_USER_TEXT,
  blueprintToPhotoroomFields,
  formatPhotoroomPadding,
  lockPaddingForSilhouette,
  normalizeCreativeDirectorAnalysis,
  type CreativeDirectorAnalysis,
  type StudioApiBlueprint,
} from "@/lib/studio-analysis-prompt";
import {
  diecutImage,
  editImageFromFields,
  getPhotoroomMode,
} from "@/lib/photoroom";
import { uploadOutputPng } from "@/lib/storage";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export type StudioEngineMode = "catalog" | "ad";

/** Back-compat shape used by WhatsApp / API responses */
export type StudioEngineAnalysis = {
  product_name: string;
  product_type: string;
  image_issues: string[];
  user_guidance: string;
  is_usable: boolean;
  detected_category?: string;
  logo_safety_note?: string;
  api_blueprint?: StudioApiBlueprint;
  director?: CreativeDirectorAnalysis;
};

export type StudioEngineMarketing = {
  headline: string;
  caption: string;
  vibe: string;
  backgroundPrompt?: string;
};

export type StudioEngineResult =
  | {
      ok: false;
      usable: false;
      user_guidance: string;
      analysis: StudioEngineAnalysis;
    }
  | {
      ok: true;
      usable: true;
      mode: StudioEngineMode;
      outputUrl: string;
      png: Buffer;
      user_guidance: string;
      analysis: StudioEngineAnalysis;
      marketing: StudioEngineMarketing;
      backgroundPrompt: string | null;
      photoroomMode: string;
    };

export type ProcessStudioRequestInput = {
  imageUrl: string;
  mode: StudioEngineMode;
  userVibeText?: string;
  /** When set (WhatsApp user id), upload to Supabase storage */
  uploadUserId?: string;
};

function requireOpenAiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return key;
}

function toEngineAnalysis(
  director: CreativeDirectorAnalysis,
): StudioEngineAnalysis {
  const issues: string[] = [];
  if (director.api_blueprint.requires_pre_cutout) {
    issues.push("hands or clutter near product — pre-cutout required");
  }
  if (director.api_blueprint.requires_uncrop) {
    issues.push("product edge clipped — uncrop recommended");
  }

  return {
    product_name: director.product_name,
    product_type: director.detected_category,
    image_issues: issues,
    user_guidance: director.user_guidance,
    is_usable: director.is_usable,
    detected_category: director.detected_category,
    logo_safety_note: director.logo_safety_note,
    api_blueprint: director.api_blueprint,
    director,
  };
}

/**
 * STEP 1 — Master AI Creative Director (precision framing + grounded shadows)
 */
async function analyzeProductWithCreativeDirector(
  imageUrl: string,
): Promise<CreativeDirectorAnalysis> {
  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireOpenAiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 800,
        messages: [
          {
            role: "system",
            content: CREATIVE_DIRECTOR_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              { type: "text", text: CREATIVE_DIRECTOR_USER_TEXT },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`OpenAI analysis failed ${response.status}: ${detail}`);
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) throw new Error("OpenAI analysis returned an empty response");

    let parsed: Partial<CreativeDirectorAnalysis> & {
      api_blueprint?: Partial<StudioApiBlueprint>;
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("OpenAI analysis returned invalid JSON");
    }

    return normalizeCreativeDirectorAnalysis(parsed);
  } catch (error) {
    console.error("Creative director analysis failed:", error);
    throw error;
  }
}

async function generateAdBackgroundPrompt(
  analysis: StudioEngineAnalysis,
  userVibeText?: string,
): Promise<string> {
  const vibe = (userVibeText || "").trim().slice(0, 160);
  const blueprint = analysis.api_blueprint;
  const paddingHint = formatPhotoroomPadding(
    lockPaddingForSilhouette(
      blueprint?.silhouette,
      analysis.product_name,
    ),
  );

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireOpenAiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.45,
      max_tokens: 320,
      messages: [
        {
          role: "system",
          content: AD_BACKGROUND_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Product: ${analysis.product_name}
Type / category: ${analysis.detected_category || analysis.product_type}
Silhouette: ${blueprint?.silhouette || "tall_open_asymmetrical"}
Subject pose: ${blueprint?.subject_pose || "upright"}
Composition lock: product ~35–40% of frame; Photoroom padding will be ${paddingHint} so lids must not touch the top border.
Logo safety: ${analysis.logo_safety_note || "keep packaging text sharp"}
Issues to fix: ${analysis.image_issues.join("; ") || "none"}
User vibe: ${vibe || "premium clean commercial marble lifestyle"}

Write ONE Photoroom background.prompt now with exact prop counts and positions only.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI prompt failed ${response.status}: ${detail}`);
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const prompt = json.choices?.[0]?.message?.content?.trim();
  if (!prompt || prompt.length < 20) {
    throw new Error("OpenAI failed to generate an ad background prompt");
  }
  return sanitizeLifestylePrompt(prompt.replace(/^["']|["']$/g, ""));
}

/** Strip generic plural prop wording that causes abstract yellow scatter. */
function sanitizeLifestylePrompt(prompt: string): string {
  return prompt
    .replace(/\bscattered\s+yellow\s+decorations?\b/gi, "three individual orange marigold petals on the front-left")
    .replace(/\byellow\s+decorations?\b/gi, "three individual orange marigold petals")
    .replace(/\bmarigolds\b/gi, "three individual orange marigold petals")
    .replace(/\bcandles\b/gi, "exactly two unlit brass diyas on the right side")
    .replace(/\bdecorations\b/gi, "two small props")
    .replace(/\bfestive elements\b/gi, "exactly two unlit brass diyas")
    .replace(/\babstract\b/gi, "realistic")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Execute Photoroom with blueprint fields.
 * Retry ladder: full overrides → no textRemoval → no shadow overrides → minimal.
 */
async function renderWithBlueprint(options: {
  mode: StudioEngineMode;
  blueprint: StudioApiBlueprint;
  imageUrl: string;
  cutoutPng: Buffer | null;
  backgroundPrompt?: string;
}): Promise<Buffer> {
  const { mode, blueprint, imageUrl, cutoutPng, backgroundPrompt } = options;

  const primary = blueprintToPhotoroomFields(blueprint, {
    mode,
    imageUrl: cutoutPng ? undefined : imageUrl,
    backgroundPrompt,
    applyShadowOverrides: true,
  });

  const withoutTextRemoval = { ...primary };
  delete withoutTextRemoval["textRemoval.mode"];

  const withoutShadow: Record<string, string> = { ...withoutTextRemoval };
  delete withoutShadow["shadow.mode"];
  delete withoutShadow["shadow.subjectPoseOverride"];
  delete withoutShadow["shadow.directionOverride"];
  delete withoutShadow["shadow.intensityOverride"];
  delete withoutShadow["shadow.softnessOverride"];

  const minimal: Record<string, string> = {
    removeBackground: "true",
    padding: formatPhotoroomPadding(
      lockPaddingForSilhouette(blueprint.silhouette, undefined),
    ),
    outputSize: blueprint.output_size || "1000x1000",
    "export.format": "png",
    "lighting.mode": "ai.auto",
    "textRemoval.mode": "ai.artificial",
  };
  if (!cutoutPng) minimal.imageUrl = imageUrl;
  if (mode === "catalog") {
    minimal["background.color"] = blueprint.canvas_bg_color || "FFFFFF";
  } else if (backgroundPrompt) {
    minimal["background.prompt"] = backgroundPrompt.slice(0, 220);
  }

  const attempts = [primary, withoutTextRemoval, withoutShadow, minimal];

  let lastError: unknown;
  for (const fields of attempts) {
    try {
      return await editImageFromFields(
        fields,
        cutoutPng ?? undefined,
        "product.png",
      );
    } catch (error) {
      lastError = error;
      console.error("Photoroom attempt failed, trying safer payload:", error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Photoroom render failed after retries");
}

function buildMarketing(
  mode: StudioEngineMode,
  analysis: StudioEngineAnalysis,
  userVibeText: string | undefined,
  backgroundPrompt: string | null,
): StudioEngineMarketing {
  if (mode === "catalog") {
    return {
      headline: analysis.product_name,
      caption: `${analysis.product_name} — clean catalog shot ready for WhatsApp & marketplace.`,
      vibe: "pure white studio",
    };
  }

  return {
    headline: analysis.product_name,
    caption: `${analysis.product_name} — ${analysis.product_type} styled for social ads.`,
    vibe: (userVibeText || "premium commercial").trim(),
    backgroundPrompt: backgroundPrompt ?? undefined,
  };
}

/**
 * Core engine entry — used by WhatsApp + HTTP API.
 */
export async function processStudioRequest(
  input: ProcessStudioRequestInput,
): Promise<StudioEngineResult> {
  const { imageUrl, mode, userVibeText, uploadUserId } = input;

  if (!imageUrl) throw new Error("imageUrl is required");
  if (mode !== "catalog" && mode !== "ad") {
    throw new Error('mode must be "catalog" or "ad"');
  }

  const director = await analyzeProductWithCreativeDirector(imageUrl);
  const analysis = toEngineAnalysis(director);

  if (!analysis.is_usable) {
    return {
      ok: false,
      usable: false,
      user_guidance: analysis.user_guidance,
      analysis,
    };
  }

  const blueprint = director.api_blueprint;
  let cutoutPng: Buffer | null = null;

  if (blueprint.requires_pre_cutout) {
    cutoutPng = await diecutImage({
      imageUrl,
      padding: 0.03,
    });
  }

  let backgroundPrompt: string | null = null;
  if (mode === "ad") {
    backgroundPrompt = await generateAdBackgroundPrompt(analysis, userVibeText);
  }

  const png = await renderWithBlueprint({
    mode,
    blueprint,
    imageUrl,
    cutoutPng,
    backgroundPrompt: backgroundPrompt ?? undefined,
  });

  const outputUrl = uploadUserId
    ? await uploadOutputPng(uploadUserId, png)
    : `data:image/png;base64,${png.toString("base64")}`;

  return {
    ok: true,
    usable: true,
    mode,
    outputUrl,
    png,
    user_guidance: analysis.user_guidance,
    analysis,
    marketing: buildMarketing(mode, analysis, userVibeText, backgroundPrompt),
    backgroundPrompt,
    photoroomMode: getPhotoroomMode(),
  };
}
