/**
 * OpenAI — Velora salesperson voice for ad copy (Hindi / Hinglish / English).
 */

import {
  DEFAULT_LANG,
  openAiLanguageInstruction,
  type VeloraLang,
} from "@/lib/velora-voice";

export type AdCopyContent = {
  headline: string;
  subheadline: string;
  badge: string;
  cta: string;
};

function fallbackCopy(
  brief: {
    purpose: string;
    badge: string;
    cta: string;
  },
  lang: VeloraLang,
): AdCopyContent {
  if (lang === "hi") {
    return {
      headline: `${brief.purpose} — आज ही ऑर्डर करें`,
      subheadline: "ताज़ी quality · सीमित समय ऑफर",
      badge: brief.badge || "ऑफर",
      cta: brief.cta,
    };
  }
  if (lang === "hinglish") {
    return {
      headline: `${brief.purpose} — aaj hi order karein`,
      subheadline: "Fresh quality · limited time offer",
      badge: brief.badge || "OFFER",
      cta: brief.cta,
    };
  }
  return {
    headline: `${brief.purpose} — order today`,
    subheadline: "Fresh quality · limited time offer",
    badge: brief.badge || "SPECIAL OFFER",
    cta: brief.cta,
  };
}

export async function generateAdCopyFromBrief(brief: {
  purpose: string;
  style: string;
  badge: string;
  cta: string;
  lang?: VeloraLang;
}): Promise<AdCopyContent> {
  const lang = brief.lang ?? DEFAULT_LANG;
  const base = fallbackCopy(brief, lang);
  const key = process.env.OPENAI_API_KEY;

  if (!key) return base;

  const langRule = openAiLanguageInstruction(lang);

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
          content: `You are a warm, experienced salesperson at Velora Studio — a WhatsApp service that helps Indian shop owners make product photos and social ads.

Your job: write short ad text that feels human and local, like a helpful person texting on WhatsApp — NOT like corporate marketing or US-style ads.

Rules:
- ${langRule}
- headline: max 8 words, catchy but honest (product/offer focused)
- subheadline: max 12 words, supportive detail
- badge and cta: copy EXACTLY from the user message — do not change them
- Never use phrases like "unleash", "trends", "elevate", "transform your business"
- Sound like a real Indian shop assistant: friendly, clear, trustworthy
- Return JSON only: {"headline":"...","subheadline":"...","badge":"...","cta":"..."}`,
        },
        {
          role: "user",
          content: `Ad purpose: ${brief.purpose}
Visual style: ${brief.style}
Offer badge (use exactly): ${brief.badge || "none"}
CTA button (use exactly): ${brief.cta}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    }),
  });

  if (!response.ok) return base;

  try {
    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) return base;

    const parsed = JSON.parse(raw) as Partial<AdCopyContent>;
    return {
      headline: parsed.headline?.slice(0, 60) || base.headline,
      subheadline: parsed.subheadline?.slice(0, 80) || base.subheadline,
      badge: brief.badge.slice(0, 24),
      cta: brief.cta.slice(0, 24),
    };
  } catch {
    return base;
  }
}
