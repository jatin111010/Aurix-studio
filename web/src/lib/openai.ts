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
