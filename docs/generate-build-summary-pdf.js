/**
 * Generate Velora Studio build summary PDF
 */
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const outPath = path.join(__dirname, "Velora_Studio_Build_Summary.pdf");
const doc = new PDFDocument({
  size: "A4",
  margins: { top: 56, bottom: 56, left: 56, right: 56 },
  info: {
    Title: "Velora Studio — Build Summary",
    Author: "Aurix / Velora Studio",
    Subject: "What we have built so far",
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

// Cover
doc.fillColor(accent).font("Helvetica-Bold").fontSize(24).text("Velora Studio");
doc.moveDown(0.2);
doc.fillColor(ink).font("Helvetica-Bold").fontSize(14).text("Build Summary — What We Made");
doc.moveDown(0.4);
small("WhatsApp AI Product Studio for Indian merchants");
small("Date: 11 July 2026");
small("Deploy: https://velora-studio-six.vercel.app");
doc.moveDown(0.6);

h1("1. Business Idea");
p(
  "Velora Studio helps Indian shop owners turn a phone product photo into professional studio shots and social ads — entirely on WhatsApp, without Canva, Photoshop, or a designer.",
);
p(
  "One-liner: B2B WhatsApp SaaS for Indian merchants — send a product photo → get catalog-ready images + marketing posts → pay with credits/plans.",
);
h2("Who it is for");
bullet("Kirana / dry fruits / cosmetics / fashion / local D2C sellers");
bullet("Merchants who live on WhatsApp and need premium-looking photos fast");
bullet("Languages: Hinglish, Hindi, English");
doc.moveDown(0.3);
h2("What you sell");
bullet("Studio Shot — clean product photo for catalog / WhatsApp / marketplace");
bullet("Social Ad Post — ready-to-post marketing creative (headline, offer, CTA)");
bullet("Monetization — free trials → credits → Razorpay subscription plans");

h1("2. What We Built");
h2("A. WhatsApp Bot");
bullet("Welcome + language selection");
bullet("Photo upload → Studio shot or Social ad");
bullet("Credits, balance, plans, paywall (Razorpay)");
bullet("Stuck-generation recovery (cancel / auto-unlock)");
bullet("Progressive image delivery (A → B → C one by one)");

h2("B. Studio Shot");
p("Creative director flow:");
bullet("1. Merchant sends product photo");
bullet("2. GPT-4o Vision analyzes the photo");
bullet("3. Style list (AI Recommended + category styles + Transparent PNG)");
bullet("4. Optional angle → lighting → quality");
bullet("5. Generate 3 variations");
bullet("6. Post-actions: Regenerate / Another style / Enhance / Create ad / Done");
doc.moveDown(0.25);
p("Studio intelligence: main-product detection from messy photos, photo issues, product-matched scenes, framing (~40% product in frame), isolate-first cutout when needed.");
p("Studio Engine: catalog (white packshot) and ad (GPT-4o vibe → Photoroom). Connected to WhatsApp + POST /api/process-studio-request. Optional Express engine in /studio-engine.");

h2("C. Social Ad Post");
bullet("Ad interview flow (style, purpose, offer, CTA, headline, message, background)");
bullet("Canva-style 1080×1080 composites");
bullet("6 themes: luxury, minimal, festival, grocery, fashion, electronics");
bullet("Google Fonts + Fabric.js / Sharp + brand color extraction");

h2("D. Platform");
bullet("Next.js on Vercel · Supabase · Photoroom · OpenAI · Meta WhatsApp · Razorpay");

h1("3. How Studio Shot Works Now");
p(
  "Photo → GPT-4o Vision analysis → user picks style/angle/lighting/quality → Studio Engine (catalog or 3× ad vibes) → Photoroom model v3 → WhatsApp receives variations → 1 studio credit for the set.",
);
h2("Reliability fixes");
bullet("Webhook maxDuration up to 300s");
bullet("Progressive delivery");
bullet("Stuck generating session recovery");
bullet("Photoroom fixes (invalid textRemoval removed; no AI background + shadow conflict)");

h1("4. Tech Stack");
bullet("App: Next.js 16 (App Router) on Vercel");
bullet("Bot: WhatsApp Cloud API");
bullet("DB: Supabase");
bullet("Image AI: Photoroom Image Editing API");
bullet("Language/Vision: OpenAI GPT-4o (studio) / GPT-4o-mini (ads helpers)");
bullet("Ads canvas: Fabric.js + Sharp + Google Fonts");
bullet("Payments: Razorpay");
bullet("Optional engine: Express (studio-engine/)");

h1("5. Key Modules");
h2("Studio");
small("studio-analysis.ts · studio-scene-prompts.ts · studio-engine-core.ts · studio-generation.ts · studio-whatsapp.ts · studio-options.ts");
h2("Ads");
small("ad-whatsapp.ts · ad-composite.ts · ad-templates.ts · ad-brief.ts · ad-colors.ts");
h2("Shared");
small("whatsapp-handler.ts · photoroom.ts · conversation.ts · paywall.ts · users.ts");

h1("6. Current Status");
h2("Done");
bullet("Full WhatsApp Studio + Ad loops");
bullet("Credits / plans / paywall");
bullet("Studio quality upgrades + gpt-4o");
bullet("Studio Engine connected to WhatsApp");
bullet("Timeout + stuck-session handling");
bullet("Photoroom generation failure fixes");

h2("Active stage");
p("Polish Studio quality until merchants would pay for it.");

h2("Biggest remaining limiter");
p("PHOTOROOM_MODE=sandbox → watermarked previews. Production Photoroom key unlocks sellable output.");

h2("Not built yet");
bullet("Referrals · Analytics dashboard · Merchant web dashboard");
bullet("Packaging dieline → 3D mockup (dropped earlier)");

h1("7. What We Taught GPT (Studio)");
bullet("Analyze raw photo: main product, issues, usability, ideal setting");
bullet("Write photoshoot prompts: surface, visible props, detailed background, lighting, shadow");
bullet("Product ~35–40% of frame — not full-bleed");
bullet("Catalog vs Ad branching in Studio Engine");
bullet("Sharp packaging, no hands, realistic commercial look");
p("GPT = creative director. Photoroom = camera studio.");

h1("8. Next Recommended Steps");
bullet("1. Redeploy latest fixes and retest Studio generation");
bullet("2. Switch to PHOTOROOM_MODE=production with live Plus key");
bullet("3. Collect 10–20 real merchant photos and tune prompts");
bullet("4. Soft launch to first sellers");
bullet("5. Later: analytics, referrals, merchant dashboard");

h1("9. Summary Verdict");
p(
  "Velora Studio is a working WhatsApp-native product photography + ad creation SaaS for Indian merchants. Core loops are live. Current work is Studio quality, reliability, and production Photoroom before serious go-to-market.",
);

doc.moveDown(1);
small("Document generated for Aurix / Velora Studio project status.");
small("File: docs/Velora_Studio_Build_Summary.pdf");

doc.end();

stream.on("finish", () => {
  console.log("PDF written:", outPath);
});
