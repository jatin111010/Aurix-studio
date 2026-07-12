/**
 * Studio Prompt Director — deep product understanding + 5 unique professional scene prompts.
 * Every new product photo gets a fresh set of creative directions (not recycled presets).
 */

export type ProductBrief = {
  brandName: string;
  productName: string;
  productType: string;
  industryType: string;
  category: string;
  packaging: string;
  premiumLevel: "budget" | "mid" | "premium" | "luxury";
  colors: string[];
  /** Rich merchant-facing description */
  description: string;
  /** Technical notes for Photoroom / Creative Director */
  visualDetails: string;
  photoQuality: "clean" | "messy" | "cluttered";
  mainProduct: string;
  photoIssues: string[];
};

export type StudioPromptOption = {
  /** 1–5 */
  id: number;
  /** Short WhatsApp list title (≤24 chars) */
  title: string;
  /** Short list description (≤72 chars) */
  teaser: string;
  /** Full professional Photoroom background.prompt */
  fullPrompt: string;
  mood: string;
};

export type StudioPromptPack = {
  brief: ProductBrief;
  prompts: StudioPromptOption[];
  /** One-line Hinglish/English note for the merchant */
  guidance: string;
};

const FALLBACK_BRIEF: ProductBrief = {
  brandName: "Unknown",
  productName: "Product",
  productType: "packaged goods",
  industryType: "general retail",
  category: "general",
  packaging: "standard packaging",
  premiumLevel: "mid",
  colors: [],
  description: "A retail product suitable for e-commerce studio photography.",
  visualDetails: "Keep the main product centered, packaging text sharp, clean cutout.",
  photoQuality: "messy",
  mainProduct: "the main product in the photo",
  photoIssues: ["phone photo may include clutter"],
};

function fallbackPrompts(brief: ProductBrief): StudioPromptOption[] {
  const name = brief.productName || "product";
  return [
    {
      id: 1,
      title: "1. Clean White",
      teaser: "Amazon-ready pure white studio",
      mood: "catalog",
      fullPrompt: `Professional e-commerce catalog photo of ${name}. Seamless pure white infinity backdrop, soft even studio softbox lighting from front-left, subtle contact shadow under the product, product dead-center occupying about 35-40% of frame, packaging text razor sharp, no props, no people, no watermark.`,
    },
    {
      id: 2,
      title: "2. Marble Luxury",
      teaser: "Premium marble surface look",
      mood: "luxury",
      fullPrompt: `Premium lifestyle product photo of ${name} on elegant white Carrara marble with soft grey veins. Soft daylight from a large window on the left, gentle specular highlights, one small unlit brass accent prop on the right only if it fits the category, product centered with generous margin, photorealistic commercial quality.`,
    },
    {
      id: 3,
      title: "3. Warm Wood",
      teaser: "Natural oak table lifestyle",
      mood: "warm",
      fullPrompt: `Warm natural lifestyle shot of ${name} standing on a light oak wood table. Soft warm afternoon side light, shallow but readable background of a clean modern kitchen wall, soft contact shadow, product centered, no clutter, no hands, professional Indian e-commerce photography.`,
    },
    {
      id: 4,
      title: "4. Moody Dark",
      teaser: "Dark premium dramatic light",
      mood: "dramatic",
      fullPrompt: `Moody luxury studio photo of ${name} on polished dark charcoal stone. Dramatic rim light from behind-left, soft fill from front, rich contrast, elegant empty negative space, product dead-center with breathing room, high-end cosmetics/perfume catalog style, no text overlays.`,
    },
    {
      id: 5,
      title: "5. Lifestyle Home",
      teaser: "Modern home shelf scene",
      mood: "lifestyle",
      fullPrompt: `Modern Indian home lifestyle photo of ${name} on a clean wooden console shelf. Soft daylight, exactly two blurred green leaves in a small vase far left background, product planted firmly on the surface with contact shadow, centered composition, detailed visible room background without blur overload, Instagram-ready commercial look.`,
    },
  ];
}

function clampTitle(text: string, max = 24): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function clampTeaser(text: string, max = 72): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function normalizeBrief(raw: Partial<ProductBrief>): ProductBrief {
  const premium = String(raw.premiumLevel || "mid").toLowerCase();
  const photoQ = String(raw.photoQuality || "messy").toLowerCase();
  return {
    brandName: String(raw.brandName || FALLBACK_BRIEF.brandName).slice(0, 80),
    productName: String(raw.productName || FALLBACK_BRIEF.productName).slice(0, 120),
    productType: String(raw.productType || FALLBACK_BRIEF.productType).slice(0, 80),
    industryType: String(raw.industryType || FALLBACK_BRIEF.industryType).slice(0, 80),
    category: String(raw.category || "general").slice(0, 40),
    packaging: String(raw.packaging || FALLBACK_BRIEF.packaging).slice(0, 120),
    premiumLevel: (["budget", "mid", "premium", "luxury"].includes(premium)
      ? premium
      : "mid") as ProductBrief["premiumLevel"],
    colors: Array.isArray(raw.colors)
      ? raw.colors.map((c) => String(c).slice(0, 40)).slice(0, 6)
      : [],
    description: String(raw.description || FALLBACK_BRIEF.description).slice(0, 500),
    visualDetails: String(raw.visualDetails || FALLBACK_BRIEF.visualDetails).slice(
      0,
      400,
    ),
    photoQuality: (["clean", "messy", "cluttered"].includes(photoQ)
      ? photoQ
      : "messy") as ProductBrief["photoQuality"],
    mainProduct: String(raw.mainProduct || FALLBACK_BRIEF.mainProduct).slice(0, 160),
    photoIssues: Array.isArray(raw.photoIssues)
      ? raw.photoIssues.map((i) => String(i).slice(0, 120)).slice(0, 6)
      : FALLBACK_BRIEF.photoIssues,
  };
}

function normalizePrompts(
  raw: unknown,
  brief: ProductBrief,
): StudioPromptOption[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return fallbackPrompts(brief);
  }

  const mapped: StudioPromptOption[] = [];
  for (let i = 0; i < Math.min(5, raw.length); i += 1) {
    const item = raw[i] as Partial<StudioPromptOption>;
    const fullPrompt = String(item.fullPrompt || "").trim();
    if (fullPrompt.length < 40) continue;
    mapped.push({
      id: i + 1,
      title: clampTitle(String(item.title || `${i + 1}. Look`).replace(/^\d+\.\s*/, `${i + 1}. `)),
      teaser: clampTeaser(String(item.teaser || item.mood || "Professional studio look")),
      fullPrompt: fullPrompt.slice(0, 900),
      mood: String(item.mood || "studio").slice(0, 40),
    });
  }

  while (mapped.length < 5) {
    const fb = fallbackPrompts(brief)[mapped.length];
    mapped.push(fb);
  }

  return mapped.slice(0, 5).map((p, idx) => ({
    ...p,
    id: idx + 1,
    title: clampTitle(
      p.title.match(/^\d+\./) ? p.title : `${idx + 1}. ${p.title}`,
    ),
  }));
}

/**
 * Deep product read + 5 unique professional Photoroom scene prompts.
 * Call once per new product image. Seed forces variety across sessions.
 */
export async function createStudioPromptPack(
  imageUrl: string,
): Promise<StudioPromptPack> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    const brief = FALLBACK_BRIEF;
    return {
      brief,
      prompts: fallbackPrompts(brief),
      guidance: "Photo mil gayi — 5 professional looks ready hain.",
    };
  }

  const varietySeed = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        temperature: 0.95,
        messages: [
          {
            role: "system",
            content: `You are the Master Product Intelligence + Studio Prompt Director for Velora Studio (Indian WhatsApp sellers).

STEP 1 — UNDERSTAND THE PRODUCT COMPLETELY
Study the merchant phone photo carefully. Identify:
- brandName (from packaging text if visible, else "Unknown")
- productName (specific sellable item)
- productType (e.g. gift box, face cream, spice jar)
- industryType (e.g. confectionery, cosmetics, jewellery, kirana FMCG)
- category (food|cosmetics|perfume|electronics|jewelry|shoes|furniture|fashion|kitchen|home_decor|beverages|medicine|luxury|general)
- packaging, premiumLevel (budget|mid|premium|luxury), colors[]
- description: 2–3 sentences describing the product for a shopkeeper
- visualDetails: what must stay true in the final shot (shape, lid open/closed, label text, materials)
- photoQuality (clean|messy|cluttered), mainProduct, photoIssues[]

STEP 2 — WRITE FIVE BIG PROFESSIONAL SCENE PROMPTS
After you fully understand the product, invent FIVE DIFFERENT high-end commercial photography prompts tailored specifically to THIS product and industry.

Each prompt must be a rich paragraph (70–140 words) describing ALL of:
- exact surface / backdrop materials
- lighting direction, quality, color temperature
- camera framing feel (product ~35–40% of frame, dead-center, generous margin)
- 0–3 specific physical props with EXACT counts and positions (never vague plurals)
- mood / commercial use (Amazon catalog, Instagram, gift listing, premium shelf)
- grounded contact shadow — product planted on a surface, never floating
- no people, hands, watermarks, logos added, brand text overlays, or abstract yellow circles

Rules for variety (CRITICAL):
- All 5 looks must feel different (e.g. clean catalog, luxury marble, warm lifestyle, dramatic dark, festive/cultural OR outdoor/modern — pick what fits THIS industry)
- NEVER recycle the same template wording across sessions
- Variety seed for this run: ${varietySeed} — use it to invent fresh creative directions
- title: max 22 chars including number like "1. Marble Glow"
- teaser: max 70 chars, shopkeeper-friendly
- fullPrompt: English, Photoroom background.prompt ready
- Prefer Indian market realism when relevant (marble, brass diya unlit, marigold petals counted, kitchen counter, gift table)

Return STRICT JSON only:
{
  "brief": { ...product fields above... },
  "guidance": "short Hinglish or English line for the merchant",
  "prompts": [
    { "title": "1. …", "teaser": "…", "mood": "…", "fullPrompt": "…" },
    ... exactly 5 items
  ]
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this product photo in full detail, then create 5 fresh professional studio prompts uniquely suited to it. Return JSON only.",
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Studio prompt pack OpenAI error", await response.text());
      const brief = FALLBACK_BRIEF;
      return {
        brief,
        prompts: fallbackPrompts(brief),
        guidance: "5 professional looks ready — pick one.",
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      const brief = FALLBACK_BRIEF;
      return {
        brief,
        prompts: fallbackPrompts(brief),
        guidance: "5 professional looks ready — pick one.",
      };
    }

    const parsed = JSON.parse(content) as {
      brief?: Partial<ProductBrief>;
      guidance?: string;
      prompts?: unknown;
    };

    const brief = normalizeBrief(parsed.brief ?? {});
    return {
      brief,
      prompts: normalizePrompts(parsed.prompts, brief),
      guidance: String(
        parsed.guidance || "Product samajh liya — 5 professional looks ready hain.",
      ).slice(0, 200),
    };
  } catch (error) {
    console.error("createStudioPromptPack failed", error);
    const brief = FALLBACK_BRIEF;
    return {
      brief,
      prompts: fallbackPrompts(brief),
      guidance: "5 professional looks ready — pick one.",
    };
  }
}

/** Merchant-facing product summary for WhatsApp. */
export function formatProductBriefMessage(
  brief: ProductBrief,
  lang: "en" | "hi" | "hinglish",
): string {
  const brand =
    brief.brandName && brief.brandName !== "Unknown"
      ? brief.brandName
      : null;
  const colors =
    brief.colors.length > 0 ? brief.colors.join(", ") : "—";

  if (lang === "hi") {
    return [
      `*Product समझ लिया* ✅`,
      ``,
      brand ? `*Brand:* ${brand}` : null,
      `*Product:* ${brief.productName}`,
      `*Type:* ${brief.productType}`,
      `*Industry:* ${brief.industryType}`,
      `*Packaging:* ${brief.packaging}`,
      `*Level:* ${brief.premiumLevel}`,
      `*Colors:* ${colors}`,
      ``,
      brief.description,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (lang === "hinglish") {
    return [
      `*Product samajh liya* ✅`,
      ``,
      brand ? `*Brand:* ${brand}` : null,
      `*Product:* ${brief.productName}`,
      `*Type:* ${brief.productType}`,
      `*Industry:* ${brief.industryType}`,
      `*Packaging:* ${brief.packaging}`,
      `*Level:* ${brief.premiumLevel}`,
      `*Colors:* ${colors}`,
      ``,
      brief.description,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `*Product understood* ✅`,
    ``,
    brand ? `*Brand:* ${brand}` : null,
    `*Product:* ${brief.productName}`,
    `*Type:* ${brief.productType}`,
    `*Industry:* ${brief.industryType}`,
    `*Packaging:* ${brief.packaging}`,
    `*Level:* ${brief.premiumLevel}`,
    `*Colors:* ${colors}`,
    ``,
    brief.description,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Numbered prompt list body (full text) for WhatsApp before the picker. */
export function formatPromptChoicesMessage(
  prompts: StudioPromptOption[],
  lang: "en" | "hi" | "hinglish",
): string {
  const header =
    lang === "hi"
      ? "इस product के लिए *5 professional looks* बनाए — एक चुनें, या अपना prompt लिखें:"
      : lang === "hinglish"
        ? "Is product ke liye *5 professional looks* banaye — ek choose karo, ya apna prompt likho:"
        : "I created *5 professional looks* for this product — pick one, or write your own prompt:";

  const blocks = prompts.map((p) => {
    const body =
      p.fullPrompt.length > 280
        ? `${p.fullPrompt.slice(0, 277)}…`
        : p.fullPrompt;
    return `*${p.id}. ${p.title.replace(/^\d+\.\s*/, "")}*\n_${p.teaser}_\n${body}`;
  });

  return [header, "", ...blocks].join("\n\n");
}
