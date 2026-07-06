/**
 * OpenAI — structured marketing copy for premium social ads.
 */

import type { ProductCategory } from "@/lib/ad-category";
import {
  DEFAULT_LANG,
  openAiLanguageInstruction,
  type VeloraLang,
} from "@/lib/velora-voice";

export type AdCopyContent = {
  headline: string;
  subheadline: string;
  offer: string;
  badge: string;
  cta: string;
};

function fallbackCopy(
  brief: {
    purpose: string;
    offer: string;
    cta: string;
  },
  lang: VeloraLang,
): AdCopyContent {
  const offer = brief.offer;
  if (lang === "hi") {
    return {
      headline: `${brief.purpose} — आज ही ऑर्डर करें`,
      subheadline: "प्रीमियम क्वालिटी · सीमित समय ऑफर",
      offer,
      badge: offer,
      cta: brief.cta,
    };
  }
  if (lang === "hinglish") {
    return {
      headline: `${brief.purpose} — aaj hi order karein`,
      subheadline: "Premium quality · limited time offer",
      offer,
      badge: offer,
      cta: brief.cta,
    };
  }
  return {
    headline: `${brief.purpose} — shop today`,
    subheadline: "Premium quality · limited time offer",
    offer,
    badge: offer,
    cta: brief.cta,
  };
}

export async function generateAdCopyFromBrief(brief: {
  purpose: string;
  style: string;
  offer: string;
  cta: string;
  category?: ProductCategory;
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
          content: `You write premium social-media ad copy for Indian shop owners on WhatsApp/Instagram.
Sound like a professional Canva ad — clear, confident, locally relatable. NOT corporate jargon.

Rules:
- ${langRule}
- headline: max 7 words, punchy product benefit
- subheadline: max 14 words, supporting detail or urgency
- offer: copy EXACTLY from user (e.g. "20% OFF", "BEST SELLER", "NEW ARRIVAL") — empty string if none
- cta: copy EXACTLY from user — do not change
- Never use: "unleash", "elevate", "transform", "revolutionary"
- Return JSON only: {"headline":"...","subheadline":"...","offer":"...","cta":"..."}`,
        },
        {
          role: "user",
          content: `Purpose: ${brief.purpose}
Visual theme: ${brief.style}
Product category: ${brief.category ?? "general"}
Offer badge (use exactly, or ""): ${brief.offer || "none"}
CTA button (use exactly): ${brief.cta}`,
        },
      ],
      max_tokens: 180,
      temperature: 0.65,
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
    const offer = brief.offer.slice(0, 24);
    return {
      headline: parsed.headline?.slice(0, 60) || base.headline,
      subheadline: parsed.subheadline?.slice(0, 90) || base.subheadline,
      offer,
      badge: offer,
      cta: brief.cta.slice(0, 28),
    };
  } catch {
    return base;
  }
}
