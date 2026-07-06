/**
 * Turns merchant ideas into Photoroom-friendly studio scene prompts.
 */

const STUDIO_SUFFIX =
  "professional product photography, soft commercial lighting, sharp focus, clean composition, high quality ecommerce photo";

export function enhancePresetPrompt(preset: string): string {
  return `${preset}, ${STUDIO_SUFFIX}`;
}

/** Expand a short customer phrase into a strong Photoroom scene description. */
export async function enhanceCustomBackgroundPrompt(
  userText: string,
): Promise<string> {
  const cleaned = userText.trim().slice(0, 200);
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    return `${cleaned}, ${STUDIO_SUFFIX}`;
  }

  try {
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
            content: `You write Photoroom AI background prompts for Indian product photos.
Output ONE line only (max 25 words). Describe ONLY the surface/scene behind the product.
Include: surface material, lighting mood, professional studio quality.
Do NOT mention text, logos, people, or the product itself.`,
          },
          {
            role: "user",
            content: `Merchant wants: "${cleaned}"`,
          },
        ],
        max_tokens: 80,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      return `${cleaned}, ${STUDIO_SUFFIX}`;
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const line = json.choices?.[0]?.message?.content?.trim();
    if (!line || line.length < 8) {
      return `${cleaned}, ${STUDIO_SUFFIX}`;
    }
    return `${line.replace(/^["']|["']$/g, "")}, ${STUDIO_SUFFIX}`;
  } catch {
    return `${cleaned}, ${STUDIO_SUFFIX}`;
  }
}
