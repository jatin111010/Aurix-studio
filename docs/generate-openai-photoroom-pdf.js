/**
 * Generate PDF: OpenAI's job in Velora Studio + how it instructs Photoroom
 */
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const outPath = path.join(__dirname, "Velora_OpenAI_Photoroom_Guide.pdf");
const doc = new PDFDocument({
  size: "A4",
  margins: { top: 56, bottom: 56, left: 56, right: 56 },
  info: {
    Title: "Velora Studio — OpenAI & Photoroom Guide",
    Author: "Aurix / Velora Studio",
    Subject: "What OpenAI does and how it tells Photoroom what to render",
  },
});

const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

const ink = "#1a1a1a";
const muted = "#555555";
const accent = "#0f6b4c";

function h1(text) {
  doc.moveDown(0.4);
  doc.fillColor(accent).font("Helvetica-Bold").fontSize(18).text(text);
  doc.moveDown(0.3);
  doc
    .strokeColor("#d0d0d0")
    .lineWidth(1)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.5);
  doc.fillColor(ink);
}

function h2(text) {
  doc.moveDown(0.35);
  doc.fillColor(accent).font("Helvetica-Bold").fontSize(13).text(text);
  doc.moveDown(0.25);
  doc.fillColor(ink);
}

function p(text) {
  doc.font("Helvetica").fontSize(10).fillColor(ink).text(text, {
    align: "left",
    lineGap: 2,
  });
  doc.moveDown(0.35);
}

function bullet(text) {
  doc.font("Helvetica").fontSize(10).fillColor(ink).text(`•  ${text}`, {
    indent: 8,
    lineGap: 1.5,
  });
}

function small(text) {
  doc.font("Helvetica").fontSize(9).fillColor(muted).text(text, { lineGap: 1.5 });
  doc.moveDown(0.2);
}

function mono(text) {
  doc.font("Courier").fontSize(8.5).fillColor(ink).text(text, {
    lineGap: 1.2,
  });
  doc.moveDown(0.25);
}

// Cover
doc.fillColor(accent).font("Helvetica-Bold").fontSize(24).text("Velora Studio");
doc.moveDown(0.2);
doc
  .fillColor(ink)
  .font("Helvetica-Bold")
  .fontSize(14)
  .text("OpenAI Job + How OpenAI Tells Photoroom");
doc.moveDown(0.4);
small("Studio Shot pipeline — Creative Director, prompts, and Photoroom API fields");
small("Date: 12 July 2026");
small("Deploy: https://velora-studio-six.vercel.app");
doc.moveDown(0.5);

h1("1. Simple Idea");
p(
  "OpenAI is the brain. Photoroom is the camera studio. WhatsApp is the shop counter.",
);
bullet(
  "Merchant sends a product photo on WhatsApp and answers style / angle / lighting / quality.",
);
bullet(
  "OpenAI looks at the photo, understands the product, and writes technical instructions.",
);
bullet(
  "Velora converts those instructions into Photoroom API form fields + a background scene prompt.",
);
bullet("Photoroom removes background, centers the product, adds scene/shadows, and returns a PNG.");
bullet("Velora sends the finished images back on WhatsApp (A → B → C) and charges 1 studio credit.");
doc.moveDown(0.4);

h1("2. Who Does What");
h2("OpenAI (GPT-4o / gpt-4o-mini)");
bullet("Sees the merchant photo (Vision).");
bullet("Decides if the photo is usable.");
bullet("Detects product type, open box vs compact, left/right alignment in source.");
bullet("Writes api_blueprint (padding, shadows, canvas color, uncrop, etc.).");
bullet("Writes lifestyle background.prompt text (table, props, lighting feel).");
bullet("Helps recommend style / angle / lighting during the WhatsApp interview.");
doc.moveDown(0.25);

h2("Photoroom (Image Editing API v2/edit)");
bullet("Cuts out the product (removeBackground).");
bullet("Places it dead-center with locked padding margins.");
bullet("Renders white catalog background OR AI lifestyle scene from background.prompt.");
bullet("Applies shadows, lighting, text removal, beautify when asked.");
bullet("Exports PNG (usually 1000×1000).");
doc.moveDown(0.25);

h2("Velora engine (our code)");
bullet("Asks WhatsApp questions and stores user choices.");
bullet("Calls OpenAI, then maps JSON → multipart Photoroom fields.");
bullet("Locks safety rules (center, padding 0.18/0.22) so model mistakes cannot break framing.");
bullet("Retries safer Photoroom payloads if an advanced field fails.");
doc.moveDown(0.4);

h1("3. Studio Shot Chain (Step by Step)");
p("1) Photo arrives on WhatsApp → language (if needed) → Mode: Studio shot.");
p(
  "2) OpenAI Call #1 — Product analysis (Vision). Used for WhatsApp intro + AI Recommended style/angle/lighting. Does NOT talk to Photoroom yet.",
);
p(
  "3) WhatsApp interview: Style → Angle → Lighting → Quality (diecut / AI recommended can skip some steps).",
);
p(
  "4) Generation starts. For each output image, OpenAI Call #2 — Creative Director (Vision) returns api_blueprint JSON.",
);
p(
  "5) For lifestyle images only: OpenAI Call #3 — Background prompt writer turns vibe (style + angle + lighting + quality) into one Photoroom background.prompt paragraph.",
);
p(
  "6) Engine builds Photoroom multipart form from blueprint + prompt → POST /v2/edit → PNG → WhatsApp.",
);
doc.moveDown(0.2);

h1("4. OpenAI Call #1 — Interview Analysis");
p("When: Right after merchant chooses Studio shot, before style list.");
p("Job: Understand the product so WhatsApp can recommend options.");
bullet("Model: gpt-4o (Vision + JSON)");
bullet("Returns: category, summary, recommended style/angle/lighting, photo issues, isolateFirst, etc.");
bullet("Goes to: WhatsApp copy + recommendation lists — NOT Photoroom API fields.");
doc.moveDown(0.35);

h1("5. OpenAI Call #2 — Creative Director (Brain for Photoroom)");
p(
  "When: Every catalog or lifestyle render (per image). This is the main way OpenAI “tells” Photoroom what to do.",
);
p("Job: Look at the photo like a commercial photographer and output a technical blueprint.");
bullet("Model: gpt-4o (Vision + strict JSON)");
bullet("Detects: silhouette (compact vs tall/open gift box), source_alignment (left/center/right), shadows, canvas color, uncrop, pre-cutout, beautify, relight.");
bullet("Engine then LOCKS padding: compact → 0.18 | open/tall → 0.22");
bullet("Engine ALWAYS forces output center — even if source photo was left-aligned.");
doc.moveDown(0.2);
p("Example api_blueprint shape OpenAI returns:");
mono(`{
  "detected_category": "jewellery_accessories",
  "product_name": "Open gift box",
  "is_usable": true,
  "user_guidance": "Looks good! Studio shot ready.",
  "logo_safety_note": "Keep brand text sharp",
  "api_blueprint": {
    "output_size": "1000x1000",
    "padding": 0.22,
    "silhouette": "tall_open_asymmetrical",
    "source_alignment": "left",
    "subject_pose": "upright",
    "shadow_direction": "behindLeft",
    "shadow_intensity": 0.5,
    "shadow_softness": 0.8,
    "canvas_bg_color": "FFFFFF",
    "enable_beautify": false,
    "enable_relighting": true,
    "requires_uncrop": false,
    "requires_pre_cutout": false,
    "export_format": "png"
  }
}`);
doc.moveDown(0.25);
p(
  "Note: User angle / lighting / quality choices are NOT inside this blueprint. Placement and shadows come from Creative Director + engine locks. Angle/lighting/quality mainly shape the lifestyle scene text (Call #3).",
);
doc.moveDown(0.2);

h1("6. OpenAI Call #3 — Lifestyle Background Prompt");
p("When: Lifestyle / ad-style images only (not solid white catalog packshot).");
p(
  "Job: Write ONE paragraph for Photoroom background.prompt — surface, exact props, lighting, centered product feel.",
);
bullet("Model: gpt-4o / helper text model");
bullet("Input vibe includes: user style label + angle/lighting/quality prompt suffixes + product context");
bullet("Rules: exact prop counts (e.g. two diyas), no abstract yellow clutter, product planted on a table");
bullet("Sent to Photoroom as: background.prompt (+ expandPrompt.mode = ai.auto)");
doc.moveDown(0.35);

h1("7. How OpenAI Instructions Become Photoroom Fields");
p(
  "OpenAI never calls Photoroom directly. Velora maps the blueprint JSON into multipart form-data for POST https://image-api.photoroom.com/v2/edit",
);
doc.moveDown(0.15);
p("Always sent (placement / safety):");
bullet("removeBackground = true");
bullet("referenceBox = subjectBox  (use cutout box, not original left/right photo framing)");
bullet("ignorePaddingAndSnapOnCroppedSides = false  (do not stick product to left edge)");
bullet("horizontalAlignment = center");
bullet("verticalAlignment = center");
bullet("padding = 0.18 or 0.22 (locked)");
bullet("position.mode = custom | position.padding | position.*Alignment = center");
bullet("outputSize = 1000x1000 | export.format = png");
bullet("textRemoval.mode = ai.artificial");
doc.moveDown(0.25);
p("From Creative Director blueprint:");
bullet("catalog mode → background.color = canvas_bg_color (e. and g. FFFFFF / F5F5F5)");
bullet("lifestyle mode → background.prompt = OpenAI scene paragraph");
bullet("enable_relighting → lighting.mode = ai.auto");
bullet("enable_beautify → beautify.mode = ai.auto");
bullet("requires_uncrop → uncrop.mode = ai.auto");
bullet("shadow.* overrides from shadow_direction / intensity / softness / subject_pose");
doc.moveDown(0.25);
p("If Photoroom rejects advanced fields, engine retries: drop textRemoval → drop shadows → minimal centered payload.");
doc.moveDown(0.35);

h1("8. Catalog vs Lifestyle vs Diecut");
bullet(
  "White studio / ecommerce: Image A = catalog (solid color from OpenAI canvas_bg_color). Images B & C = lifestyle (background.prompt from OpenAI).",
);
bullet("Other scene styles: up to 3 lifestyle images, each with its own OpenAI Creative Director + background prompt.");
bullet(
  "Diecut / transparent PNG: Photoroom cutout only — no Creative Director blueprint for scene.",
);
doc.moveDown(0.35);

h1("9. What User Answers Affect");
p("WhatsApp choices vs Photoroom:");
bullet("Language → UI text only");
bullet("Style → catalog vs lifestyle vs diecut + scene vibe");
bullet("Angle / Lighting / Quality → scene vibe text (then rewritten by OpenAI Call #3) — NOT Photoroom center/padding fields");
bullet("Creative Director (automatic) → Photoroom padding, center, shadows, canvas, uncrop, beautify");
doc.moveDown(0.35);

h1("10. One-Line Summary");
p(
  "OpenAI looks at the product photo and writes a technical shot list (api_blueprint) plus an optional scene description; Velora translates that into Photoroom form fields; Photoroom renders the studio PNG; WhatsApp delivers it to the merchant.",
);
doc.moveDown(0.5);
small("Key code: web/src/lib/studio-analysis.ts | studio-analysis-prompt.ts | studio-engine-core.ts | photoroom.ts | studio-whatsapp.ts");
small("File: docs/Velora_OpenAI_Photoroom_Guide.pdf");

doc.end();

stream.on("finish", () => {
  console.log("Wrote", outPath);
});
