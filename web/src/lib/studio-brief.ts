/**
 * Studio Prompt Director — deep product understanding + 5 unique professional scene prompts.
 * Every new product photo gets a fresh set of creative directions (not recycled presets).
 * Rejects unusable source photos (hand-held, half-cropped, too blurry, etc.).
 */

export type ProductSizeClass =
  | "tiny"
  | "small"
  | "medium"
  | "large"
  | "extra_large";

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
  /**
   * Assumed real-world size so scenes don't make big products look tiny
   * (or tiny products look huge).
   */
  sizeClass: ProductSizeClass;
  /** Approximate height in cm (assumed from product type + visual cues) */
  estimatedHeightCm: number;
  /** Approximate width in cm */
  estimatedWidthCm: number;
  /** Approximate depth/length in cm */
  estimatedDepthCm: number;
  /** Human size note e.g. "large gift box ~25cm tall" */
  sizeNote: string;
  /**
   * How much of the frame the product should occupy given its real size
   * (e.g. large boxes need more frame share so they don't look tiny).
   */
  frameFillPercent: number;
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
  /** false = stop and ask for a better photo (no credit used) */
  isPhotoUsable: boolean;
  /** Merchant-facing reject message when isPhotoUsable is false */
  rejectMessage?: string;
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
  sizeClass: "medium",
  estimatedHeightCm: 15,
  estimatedWidthCm: 10,
  estimatedDepthCm: 8,
  sizeNote: "medium retail pack ~15cm tall",
  frameFillPercent: 38,
};

function sizeScaleLine(brief: ProductBrief): string {
  const fill = Math.min(55, Math.max(28, brief.frameFillPercent || 38));
  return (
    `Real-world scale: this is a ${brief.sizeClass} product ` +
    `(~${brief.estimatedHeightCm}cm H × ${brief.estimatedWidthCm}cm W × ${brief.estimatedDepthCm}cm D — ${brief.sizeNote}). ` +
    `Surface and props must match that scale. Product must occupy about ${fill}% of the frame — ` +
    `never look toy-sized if large, never fill the whole frame if tiny.`
  );
}

function withScaleInPrompt(fullPrompt: string, brief: ProductBrief): string {
  const scale = sizeScaleLine(brief);
  if (/Real-world scale:|frameFill|cm H/i.test(fullPrompt)) {
    return fullPrompt.slice(0, 900);
  }
  return `${fullPrompt.trim()} ${scale}`.slice(0, 900);
}

function fallbackPrompts(brief: ProductBrief): StudioPromptOption[] {
  const name = brief.productName || "product";
  const scale = sizeScaleLine(brief);
  return [
    {
      id: 1,
      title: "1. Clean White",
      teaser: "Amazon-ready pure white studio",
      mood: "catalog",
      fullPrompt: withScaleInPrompt(
        `Professional e-commerce catalog photo of ${name}. Seamless pure white infinity backdrop, soft even studio softbox lighting from front-left, subtle contact shadow under the product, product dead-center, packaging text razor sharp, no props, no people, no watermark.`,
        brief,
      ),
    },
    {
      id: 2,
      title: "2. Marble Luxury",
      teaser: "Premium marble surface look",
      mood: "luxury",
      fullPrompt: withScaleInPrompt(
        `Premium lifestyle product photo of ${name} on elegant white Carrara marble with soft grey veins. Soft daylight from a large window on the left, gentle specular highlights, one small unlit brass accent prop on the right only if scale-appropriate, product centered with generous margin, photorealistic commercial quality. ${scale}`,
        brief,
      ),
    },
    {
      id: 3,
      title: "3. Warm Wood",
      teaser: "Natural oak table lifestyle",
      mood: "warm",
      fullPrompt: withScaleInPrompt(
        `Warm natural lifestyle shot of ${name} standing on a light oak wood table sized for this product. Soft warm afternoon side light, shallow but readable background of a clean modern kitchen wall, soft contact shadow, product centered, no clutter, no hands, professional Indian e-commerce photography.`,
        brief,
      ),
    },
    {
      id: 4,
      title: "4. Moody Dark",
      teaser: "Dark premium dramatic light",
      mood: "dramatic",
      fullPrompt: withScaleInPrompt(
        `Moody luxury studio photo of ${name} on polished dark charcoal stone. Dramatic rim light from behind-left, soft fill from front, rich contrast, elegant empty negative space, product dead-center with breathing room, high-end catalog style, no text overlays.`,
        brief,
      ),
    },
    {
      id: 5,
      title: "5. Lifestyle Home",
      teaser: "Modern home shelf scene",
      mood: "lifestyle",
      fullPrompt: withScaleInPrompt(
        `Modern Indian home lifestyle photo of ${name} on a clean wooden surface that fits its real size. Soft daylight, exactly two blurred green leaves in a small vase far left background only if props stay smaller than the product, product planted firmly with contact shadow, centered composition, Instagram-ready commercial look.`,
        brief,
      ),
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

function normalizeSizeClass(value: unknown): ProductSizeClass {
  const raw = String(value || "medium")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (
    raw === "tiny" ||
    raw === "small" ||
    raw === "medium" ||
    raw === "large" ||
    raw === "extra_large"
  ) {
    return raw;
  }
  if (raw.includes("extra") || raw.includes("xl") || raw.includes("huge")) {
    return "extra_large";
  }
  if (raw.includes("large") || raw.includes("big")) return "large";
  if (raw.includes("tiny") || raw.includes("mini")) return "tiny";
  if (raw.includes("small")) return "small";
  return "medium";
}

function defaultFrameFill(sizeClass: ProductSizeClass): number {
  switch (sizeClass) {
    case "tiny":
      return 28;
    case "small":
      return 34;
    case "medium":
      return 38;
    case "large":
      return 46;
    case "extra_large":
      return 52;
    default:
      return 38;
  }
}

function normalizeBrief(raw: Partial<ProductBrief>): ProductBrief {
  const premium = String(raw.premiumLevel || "mid").toLowerCase();
  const photoQ = String(raw.photoQuality || "messy").toLowerCase();
  const sizeClass = normalizeSizeClass(raw.sizeClass);
  const height = Number(raw.estimatedHeightCm);
  const width = Number(raw.estimatedWidthCm);
  const depth = Number(raw.estimatedDepthCm);
  const fill = Number(raw.frameFillPercent);

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
    sizeClass,
    estimatedHeightCm:
      Number.isFinite(height) && height > 0
        ? Math.min(200, Math.max(1, Math.round(height)))
        : FALLBACK_BRIEF.estimatedHeightCm,
    estimatedWidthCm:
      Number.isFinite(width) && width > 0
        ? Math.min(200, Math.max(1, Math.round(width)))
        : FALLBACK_BRIEF.estimatedWidthCm,
    estimatedDepthCm:
      Number.isFinite(depth) && depth > 0
        ? Math.min(200, Math.max(1, Math.round(depth)))
        : FALLBACK_BRIEF.estimatedDepthCm,
    sizeNote: String(raw.sizeNote || `${sizeClass} product`).slice(0, 120),
    frameFillPercent:
      Number.isFinite(fill) && fill >= 25 && fill <= 60
        ? Math.round(fill)
        : defaultFrameFill(sizeClass),
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
      fullPrompt: withScaleInPrompt(fullPrompt, brief),
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

function defaultRejectMessage(): string {
  return (
    "Yeh photo studio shot ke liye theek nahi hai. Better photo bhejo — " +
    "product seedha rakh ke, poora dikhe, clear light mein, haath/clutter ke bina. " +
    "Phir main best result de sakti hoon."
  );
}

/**
 * Deep product read + 5 unique professional Photoroom scene prompts.
 * Call once per new product image. Seed forces variety across sessions.
 * Returns isPhotoUsable=false when the source photo is too bad to shoot.
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
      isPhotoUsable: true,
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
        temperature: 0.85,
        messages: [
          {
            role: "system",
            content: `You are the Master Product Intelligence + Studio Prompt Director for Velora Studio (Indian WhatsApp sellers).

STEP 0 — PHOTO QUALITY GATE (do this FIRST)
Decide if the photo is good enough for a professional studio output.
Set isPhotoUsable = false when ANY of these are true:
- product is held in a hand / fingers covering the item
- only half / cropped / cut-off product (important edges missing)
- extremely blurry / dark / overexposed so label/shape is unclear
- multiple competing products with no clear main item
- photo is basically unusable for e-commerce (selfie with product, screenshot of screen, etc.)

If isPhotoUsable is false:
- Still fill brief with whatever you can detect
- Set rejectMessage in clear Hinglish/Indian English telling the merchant WHY and asking them to upload a BETTER photo (full product, flat surface, good light, no hand). Give 2–3 short tips.
- Set prompts to [] (empty)
- Do NOT invent studio prompts for bad photos

If the photo is a bit messy but the FULL product is clearly visible on a surface (no hand blocking), isPhotoUsable = true and continue.

STEP 1 — UNDERSTAND THE PRODUCT COMPLETELY (only if usable, or best-effort if not)
- brandName, productName, productType, industryType
- category (food|cosmetics|perfume|electronics|jewelry|shoes|furniture|fashion|kitchen|home_decor|beverages|medicine|luxury|general)
- packaging, premiumLevel (budget|mid|premium|luxury), colors[]
- description, visualDetails, photoQuality (clean|messy|cluttered), mainProduct, photoIssues[]

STEP 1B — ASSUME REAL-WORLD SIZE (CRITICAL for good results)
Estimate approximate physical size from product type + visual cues (even if no ruler):
- sizeClass: tiny | small | medium | large | extra_large
  Examples: lipstick/earrings=tiny, cream jar/spice pouch=small, facewash bottle/gift tin=medium, open gift box/hamper=large, big appliance box=extra_large
- estimatedHeightCm, estimatedWidthCm, estimatedDepthCm (numbers in cm)
- sizeNote: short human line e.g. "large open gift box ~28cm tall"
- frameFillPercent: how much of the 1000x1000 frame the product should fill
  tiny≈28, small≈34, medium≈38, large≈46, extra_large≈52
NEVER make a large product look like a miniature toy. NEVER make a tiny product fill the whole canvas.
Props and surfaces in prompts MUST match this real-world scale (small props next to large boxes look wrong — scale props down/up accordingly).

STEP 2 — WRITE FIVE BIG PROFESSIONAL SCENE PROMPTS (only if isPhotoUsable)
Each prompt 70–140 words covering:
- surface / backdrop sized for THIS product's real dimensions
- lighting direction, quality, color temperature
- camera framing with the correct frameFillPercent for sizeClass
- 0–3 props with EXACT counts + positions, scale-matched to product size
- grounded contact shadow, dead-center, no floating
- no people/hands/watermarks/abstract yellow clutter
- MUST mention the assumed size/scale so Photoroom keeps proportions realistic

Variety seed: ${varietySeed}
title max 22 chars like "1. Marble Glow"; teaser max 70 chars; fullPrompt English.

Return STRICT JSON only:
{
  "isPhotoUsable": true|false,
  "rejectMessage": "string (required when not usable)",
  "brief": {
    "brandName": "...",
    "productName": "...",
    "productType": "...",
    "industryType": "...",
    "category": "...",
    "packaging": "...",
    "premiumLevel": "mid",
    "colors": [],
    "description": "...",
    "visualDetails": "...",
    "photoQuality": "clean|messy|cluttered",
    "mainProduct": "...",
    "photoIssues": [],
    "sizeClass": "tiny|small|medium|large|extra_large",
    "estimatedHeightCm": 15,
    "estimatedWidthCm": 10,
    "estimatedDepthCm": 8,
    "sizeNote": "...",
    "frameFillPercent": 38
  },
  "guidance": "short merchant line when usable",
  "prompts": [ { "title": "1. …", "teaser": "…", "mood": "…", "fullPrompt": "…" } ]
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "First judge if this photo is good enough for a studio shoot. If not, reject with tips. If yes, analyze product + assume height/width/depth/size class, then create 5 size-aware professional studio prompts. Return JSON only.",
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
        isPhotoUsable: true,
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
        isPhotoUsable: true,
      };
    }

    const parsed = JSON.parse(content) as {
      brief?: Partial<ProductBrief>;
      guidance?: string;
      prompts?: unknown;
      isPhotoUsable?: boolean;
      rejectMessage?: string;
    };

    const brief = normalizeBrief(parsed.brief ?? {});
    const isPhotoUsable = parsed.isPhotoUsable !== false;

    if (!isPhotoUsable) {
      return {
        brief,
        prompts: [],
        guidance: "",
        isPhotoUsable: false,
        rejectMessage: String(
          parsed.rejectMessage || defaultRejectMessage(),
        ).slice(0, 600),
      };
    }

    return {
      brief,
      prompts: normalizePrompts(parsed.prompts, brief),
      guidance: String(
        parsed.guidance ||
          `Product samajh liya (~${brief.sizeNote}) — 5 professional looks ready hain.`,
      ).slice(0, 220),
      isPhotoUsable: true,
    };
  } catch (error) {
    console.error("createStudioPromptPack failed", error);
    const brief = FALLBACK_BRIEF;
    return {
      brief,
      prompts: fallbackPrompts(brief),
      guidance: "5 professional looks ready — pick one.",
      isPhotoUsable: true,
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
  const sizeLine = `${brief.sizeNote} (~${brief.estimatedHeightCm}×${brief.estimatedWidthCm}×${brief.estimatedDepthCm} cm)`;

  if (lang === "hi") {
    return [
      `*Product समझ लिया* ✅`,
      ``,
      brand ? `*Brand:* ${brand}` : null,
      `*Product:* ${brief.productName}`,
      `*Type:* ${brief.productType}`,
      `*Industry:* ${brief.industryType}`,
      `*Size (assume):* ${sizeLine}`,
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
      `*Size (assume):* ${sizeLine}`,
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
    `*Assumed size:* ${sizeLine}`,
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
