/**
 * Core Studio Engine — shared by WhatsApp + POST /api/process-studio-request
 *
 * Modes:
 *  - catalog → pure white ecommerce packshot
 *  - ad      → GPT-4o vibe prompt → Photoroom AI background (model v3)
 */

import { getPhotoroomApiKey, getPhotoroomMode } from "@/lib/photoroom";
import { uploadOutputPng } from "@/lib/storage";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const PHOTOROOM_EDIT_URL = "https://image-api.photoroom.com/v2/edit";

export type StudioEngineMode = "catalog" | "ad";

export type StudioEngineAnalysis = {
  product_name: string;
  product_type: string;
  image_issues: string[];
  user_guidance: string;
  is_usable: boolean;
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

async function analyzeProduct(imageUrl: string): Promise<StudioEngineAnalysis> {
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
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `You are an e-commerce product staging analyst for Indian WhatsApp sellers.

Analyze the product photo and return ONLY a clean JSON object with these exact keys:
{
  "product_name": "short name of the main sellable product",
  "product_type": "category like dry fruits gift box, cosmetic bottle, snack pack, etc.",
  "image_issues": ["up to 4 short issues, or empty array if clean"],
  "user_guidance": "one short line in simple Indian English — e.g. 'Looks good!' or 'Image is a bit dark, try taking it in daylight!'",
  "is_usable": true
}

Rules:
- Focus on the MAIN product only (ignore clutter, hands, messy background when judging usability).
- is_usable=false only if the product is unreadable, fully cut off, extremely dark, or not a product photo.
- user_guidance must always be friendly and short.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this product photo for e-commerce studio staging.",
            },
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

  const parsed = JSON.parse(raw) as Partial<StudioEngineAnalysis>;

  return {
    product_name: String(parsed.product_name || "product").slice(0, 120),
    product_type: String(parsed.product_type || "general").slice(0, 80),
    image_issues: Array.isArray(parsed.image_issues)
      ? parsed.image_issues.slice(0, 4).map(String)
      : [],
    user_guidance: String(
      parsed.user_guidance || "Looks good! Preparing your studio shot…",
    ).slice(0, 180),
    is_usable: Boolean(parsed.is_usable),
  };
}

async function generateAdBackgroundPrompt(
  analysis: StudioEngineAnalysis,
  userVibeText?: string,
): Promise<string> {
  const vibe = (userVibeText || "").trim().slice(0, 160);

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireOpenAiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.65,
      max_tokens: 350,
      messages: [
        {
          role: "system",
          content: `You are a commercial product photographer writing ONE Photoroom background.prompt for a social-media ad shoot.

Rules:
- Describe ONLY the set: surface, realistic matching props, visible detailed background, lighting direction, and soft contact shadow.
- No hands, no people, no brand names, no logos, no watermarks.
- Product text/packaging must remain sharp and readable.
- Product sits centered and fills about 40% of the frame — leave breathing room around it.
- Background must be fully detailed and visible (no blur, no bokeh, no empty gradient).
- Output ONE paragraph only (50–80 words). No JSON. No quotes around the whole answer.`,
        },
        {
          role: "user",
          content: `Product: ${analysis.product_name}
Type: ${analysis.product_type}
Issues to fix: ${analysis.image_issues.join("; ") || "none"}
User vibe: ${vibe || "premium clean commercial look"}

Write the Photoroom background prompt now.`,
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
  return prompt.replace(/^["']|["']$/g, "");
}

async function callPhotoroomEdit(
  fields: Record<string, string>,
): Promise<Buffer> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }

  const response = await fetch(PHOTOROOM_EDIT_URL, {
    method: "POST",
    headers: {
      "x-api-key": getPhotoroomApiKey(),
      "pr-ai-background-model-version": "3",
    },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Photoroom ${getPhotoroomMode()} error ${response.status}: ${detail || response.statusText}`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
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

  const analysis = await analyzeProduct(imageUrl);

  if (!analysis.is_usable) {
    return {
      ok: false,
      usable: false,
      user_guidance: analysis.user_guidance,
      analysis,
    };
  }

  let backgroundPrompt: string | null = null;
  let png: Buffer;

  if (mode === "catalog") {
    png = await callPhotoroomEdit({
      imageUrl,
      removeBackground: "true",
      "background.color": "FFFFFF",
      padding: "0.15",
      "shadow.mode": "ai.soft",
      "textRemoval.mode": "artificial",
    });
  } else {
    backgroundPrompt = await generateAdBackgroundPrompt(analysis, userVibeText);
    png = await callPhotoroomEdit({
      imageUrl,
      removeBackground: "true",
      "background.prompt": backgroundPrompt,
      padding: "0.15",
      "shadow.mode": "ai.soft",
      "textRemoval.mode": "artificial",
    });
  }

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
