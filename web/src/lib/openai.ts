/**
 * OpenAI conversation + ad copy (Phase 3).
 * Stub until OPENAI_API_KEY is configured.
 */

export type DesignChoices = {
  backgroundId: string;
  backgroundPrompt: string;
  mode: "studio" | "ad";
  adHeadline?: string;
};

export async function generateAdCopy(productHint?: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return productHint
      ? `${productHint} — Limited offer, shop now!`
      : "Festival Sale — 15% OFF";
  }

  // Phase 3: call OpenAI Chat/Assistants API
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Write one short catchy Indian e-commerce ad headline (max 8 words). No quotes.",
        },
        {
          role: "user",
          content: productHint ?? "product promotion",
        },
      ],
      max_tokens: 40,
    }),
  });

  if (!response.ok) {
    return "Festival Sale — 15% OFF";
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content?.trim() || "Festival Sale — 15% OFF";
}
