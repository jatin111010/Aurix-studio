/**
 * Velora Studio — core Express engine
 * POST /process-studio-request
 *
 * Modes:
 *  - catalog → pure white ecommerce packshot
 *  - ad      → AI vibe background (Photoroom Studio model v3)
 */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const FormData = require("form-data");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 4040);
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(
  /\/$/,
  "",
);
const OUTPUT_DIR = path.join(__dirname, "outputs");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

app.use("/outputs", express.static(OUTPUT_DIR));

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const PHOTOROOM_EDIT_URL = "https://image-api.photoroom.com/v2/edit";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function photoroomHeaders() {
  return {
    "x-api-key": requireEnv("PHOTOROOM_API_KEY"),
    "pr-ai-background-model-version": "3",
  };
}

/**
 * STEP 1 — GPT-4o Vision product analysis
 */
async function analyzeProduct(imageUrl) {
  const apiKey = requireEnv("OPENAI_API_KEY");

  const response = await axios.post(
    OPENAI_URL,
    {
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
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 60_000,
    },
  );

  const raw = response.data?.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI analysis returned an empty response");
  }

  const parsed = JSON.parse(raw);

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

/**
 * STEP 2 (ad mode) — GPT-4o commercial photography prompt
 */
async function generateAdBackgroundPrompt(analysis, userVibeText) {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const vibe = (userVibeText || "").trim().slice(0, 120);

  const response = await axios.post(
    OPENAI_URL,
    {
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
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 60_000,
    },
  );

  const prompt = response.data?.choices?.[0]?.message?.content?.trim();
  if (!prompt || prompt.length < 20) {
    throw new Error("OpenAI failed to generate an ad background prompt");
  }

  return prompt.replace(/^["']|["']$/g, "");
}

/**
 * Photoroom Image Editing API — returns PNG Buffer
 */
async function callPhotoroomEdit(fields) {
  const form = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    form.append(key, String(value));
  }

  const response = await axios.post(PHOTOROOM_EDIT_URL, form, {
    headers: {
      ...photoroomHeaders(),
      ...form.getHeaders(),
    },
    responseType: "arraybuffer",
    timeout: 120_000,
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    const detail = Buffer.from(response.data || []).toString("utf8");
    throw new Error(
      `Photoroom error ${response.status}: ${detail || response.statusText}`,
    );
  }

  return Buffer.from(response.data);
}

async function saveOutputImage(buffer) {
  const filename = `studio-${uuidv4()}.png`;

  // Optional S3 path — enabled only when bucket + credentials exist
  if (
    process.env.S3_BUCKET &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  ) {
    try {
      // Lazy require so local/dev works without AWS SDK installed
      // eslint-disable-next-line global-require, import/no-extraneous-dependencies
      const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
      const region = process.env.AWS_REGION || "ap-south-1";
      const client = new S3Client({ region });
      const key = `studio-outputs/${filename}`;

      await client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: "image/png",
        }),
      );

      return `https://${process.env.S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;
    } catch (error) {
      console.error("S3 upload failed, falling back to local disk:", error.message);
    }
  }

  const filePath = path.join(OUTPUT_DIR, filename);
  await fs.promises.writeFile(filePath, buffer);
  return `${PUBLIC_BASE_URL}/outputs/${filename}`;
}

function buildMarketingText(mode, analysis, userVibeText, backgroundPrompt) {
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
    backgroundPrompt,
  };
}

/**
 * Core endpoint
 */
app.post("/process-studio-request", async (req, res) => {
  try {
    const { imageUrl, mode, userVibeText } = req.body || {};

    if (!imageUrl || typeof imageUrl !== "string") {
      return res.status(400).json({
        ok: false,
        error: "imageUrl is required",
      });
    }

    if (mode !== "catalog" && mode !== "ad") {
      return res.status(400).json({
        ok: false,
        error: 'mode must be "catalog" or "ad"',
      });
    }

    // STEP 1 — Product analysis
    const analysis = await analyzeProduct(imageUrl);

    if (!analysis.is_usable) {
      return res.status(200).json({
        ok: false,
        usable: false,
        user_guidance: analysis.user_guidance,
        analysis,
      });
    }

    let backgroundPrompt = null;
    let imageBuffer;

    if (mode === "catalog") {
      // Pure white ecommerce shoot
      imageBuffer = await callPhotoroomEdit({
        imageUrl,
        removeBackground: "true",
        "background.color": "FFFFFF",
        padding: "0.15",
        "shadow.mode": "ai.soft",
        "textRemoval.mode": "artificial",
      });
    } else {
      // Social ad shoot — expand vibe into Photoroom prompt first
      backgroundPrompt = await generateAdBackgroundPrompt(
        analysis,
        userVibeText,
      );

      imageBuffer = await callPhotoroomEdit({
        imageUrl,
        removeBackground: "true",
        "background.prompt": backgroundPrompt,
        padding: "0.15",
        "shadow.mode": "ai.soft",
        "textRemoval.mode": "artificial",
      });
    }

    const outputUrl = await saveOutputImage(imageBuffer);
    const marketing = buildMarketingText(
      mode,
      analysis,
      userVibeText,
      backgroundPrompt,
    );

    return res.status(200).json({
      ok: true,
      usable: true,
      mode,
      outputUrl,
      user_guidance: analysis.user_guidance,
      analysis,
      marketing,
      backgroundPrompt,
    });
  } catch (error) {
    console.error("process-studio-request failed:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Studio processing failed",
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "velora-studio-engine",
    openai: Boolean(process.env.OPENAI_API_KEY),
    photoroom: Boolean(process.env.PHOTOROOM_API_KEY),
  });
});

app.listen(PORT, () => {
  console.log(`Velora Studio engine listening on ${PUBLIC_BASE_URL}`);
  console.log(`POST ${PUBLIC_BASE_URL}/process-studio-request`);
});
