/**
 * OpenAI ad copy for Fabric.js social post templates.
 */

export type AdCopyContent = {
  headline: string;
  subheadline: string;
  badge: string;
  cta: string;
};

const FALLBACK: AdCopyContent = {
  headline: "Festival Sale — Shop Now",
  subheadline: "Premium quality · Limited time offer",
  badge: "15% OFF",
  cta: "Order on WhatsApp",
};

export async function generateAdCopyFromBrief(brief: {
  purpose: string;
  style: string;
  badge: string;
  cta: string;
}): Promise<AdCopyContent> {
  const key = process.env.OPENAI_API_KEY;
  const base: AdCopyContent = {
    headline: `${brief.purpose} — Shop Today`,
    subheadline: "Premium quality · Order now",
    badge: brief.badge || "SPECIAL OFFER",
    cta: brief.cta,
  };

  if (!key) return base;

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
          content: `Write Indian e-commerce WhatsApp ad copy. Return JSON only:
{"headline":"max 8 words main message","subheadline":"max 12 words supporting line"}
Use the user's offer badge and CTA exactly as provided in the user message for badge and cta fields.`,
        },
        {
          role: "user",
          content: `Purpose: ${brief.purpose}. Visual style: ${brief.style}. Offer badge: ${brief.badge || "none"}. CTA button: ${brief.cta}.`,
        },
      ],
      max_tokens: 120,
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

/** @deprecated use generateAdCopyFromBrief via ad interview */
export async function generateAdCopy(
  productHint?: string,
): Promise<AdCopyContent> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return productHint
      ? {
          ...FALLBACK,
          headline: `${productHint} — Limited Offer`,
        }
      : FALLBACK;
  }

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
          content: `You write short Indian e-commerce WhatsApp ad copy. Return JSON only:
{"headline":"max 8 words","subheadline":"max 12 words","badge":"max 4 words e.g. 15% OFF","cta":"max 4 words e.g. Shop Now"}`,
        },
        {
          role: "user",
          content: productHint ?? "product promotion for local Indian shop",
        },
      ],
      max_tokens: 120,
    }),
  });

  if (!response.ok) {
    return FALLBACK;
  }

  try {
    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) return FALLBACK;

    const parsed = JSON.parse(raw) as Partial<AdCopyContent>;
    return {
      headline: parsed.headline?.slice(0, 60) || FALLBACK.headline,
      subheadline: parsed.subheadline?.slice(0, 80) || FALLBACK.subheadline,
      badge: parsed.badge?.slice(0, 24) || FALLBACK.badge,
      cta: parsed.cta?.slice(0, 24) || FALLBACK.cta,
    };
  } catch {
    return FALLBACK;
  }
}
