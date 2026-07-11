# Velora Studio — Build Summary

**Product:** WhatsApp AI Product Studio for Indian merchants  
**Date:** 11 July 2026  
**Deploy:** https://velora-studio-six.vercel.app  

---

## 1. Business Idea

Velora Studio helps Indian shop owners turn a phone product photo into **professional studio shots and social ads — entirely on WhatsApp**, without Canva, Photoshop, or a designer.

**One-liner:** B2B WhatsApp SaaS for Indian merchants — send a product photo → get catalog-ready images + marketing posts → pay with credits/plans.

### Who it is for
- Kirana / dry fruits / cosmetics / fashion / local D2C sellers  
- Merchants who live on WhatsApp and need “looks premium” photos fast  
- Languages: Hinglish, Hindi, English  

### What you sell

| Product | Job |
|--------|-----|
| **Studio Shot** | Clean product photo for catalog / WhatsApp / marketplace |
| **Social Ad Post** | Ready-to-post marketing creative (headline, offer, CTA) |

**Monetization:** free trials → studio/ad credits → subscription plans (Razorpay)

---

## 2. What We Built

### A. WhatsApp Bot (core product)
- Welcome / language selection (Hinglish, Hindi, English)
- Photo upload → mode choice: **Studio shot** or **Social ad**
- Credit balance checks (`balance`, `plans`)
- Paywall + Razorpay plans
- Stuck-generation recovery (`cancel` / auto-unlock after ~90s)
- Progressive image delivery (images arrive one-by-one)

### B. Studio Shot (major focus)
End-to-end creative director flow:

1. Merchant sends product photo  
2. AI analyzes the photo (GPT-4o Vision)  
3. Style list (AI Recommended + category-matched styles + Transparent PNG)  
4. Optional angle → lighting → quality  
5. Generation of **3 variations**  
6. Post-actions: Regenerate / Another style / Enhance / Create ad / Done  

**Studio intelligence includes:**
- Main product detection from messy phone photos  
- Photo quality / issues (messy, cluttered, dark, etc.)  
- Product-matched realistic scene prompts  
- Framing guidance (~40% product in frame, visible background)  
- Isolate-first cutout for messy photos (when needed)  

**Studio Engine (new core):**
- `catalog` mode → pure white ecommerce packshot  
- `ad` mode → GPT-4o photography prompt → Photoroom AI background  
- Connected to WhatsApp + `POST /api/process-studio-request`  
- Optional standalone Express engine in `/studio-engine`  

### C. Social Ad Post
- Separate ad interview flow (style, purpose, offer, CTA, headline, message, background)
- Canva-style 1080×1080 composites  
- 6 themes (luxury, minimal, festival, grocery, fashion, electronics)  
- Google Fonts + Fabric.js / Sharp compositing  
- Brand color extraction from product cutout  

### D. Platform / Infrastructure
- Next.js app on Vercel  
- Supabase (users, conversations, generations, credits)  
- Photoroom Image Editing API (sandbox / production)  
- OpenAI GPT-4o (studio vision + scene prompts)  
- OpenAI GPT-4o-mini (ads / short text helpers)  
- Meta WhatsApp Cloud API  
- Razorpay payments  

---

## 3. How Studio Shot Works Now

```
Photo
  → OpenAI GPT-4o Vision (analyze product + usability)
  → User picks style / angle / lighting / quality
  → Studio Engine:
       • White Studio / E-commerce → catalog + 2 lifestyle ads
       • Other styles → 3× ad shoots with style vibes
       • Transparent PNG → die-cut only
  → Photoroom (model v3) renders images
  → WhatsApp receives Variation A → B → C
  → 1 studio credit consumed for the set
```

### Reliability fixes included
- Vercel webhook `maxDuration` raised (up to 300s)  
- Progressive delivery so slow 3rd image doesn’t block everything  
- Stuck `generating` session auto-recovery  
- Photoroom parameter fixes (no invalid textRemoval; no AI background + shadow conflict)  

---

## 4. Tech Stack

| Layer | Choice |
|------|--------|
| App | Next.js 16 (App Router) on Vercel |
| Bot | WhatsApp Cloud API |
| DB / Auth storage | Supabase |
| Image AI | Photoroom Image Editing API |
| Language / Vision AI | OpenAI GPT-4o / GPT-4o-mini |
| Ads canvas | Fabric.js + Sharp + Google Fonts |
| Payments | Razorpay |
| Optional engine | Express (`studio-engine/`) |

### Important env vars
- `OPENAI_API_KEY`
- `PHOTOROOM_API_KEY` / `PHOTOROOM_MODE`
- `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID`
- Supabase URL + service role key  
- Razorpay keys  
- Optional: `STUDIO_ENGINE_URL` (external Express)

---

## 5. Key Project Modules

### Studio
- `studio-analysis.ts` — GPT-4o product / messy-photo analysis  
- `studio-scene-prompts.ts` — professional photoshoot prompts  
- `studio-engine-core.ts` — catalog / ad engine  
- `studio-generation.ts` — WhatsApp variation pipeline  
- `studio-whatsapp.ts` — conversation UX  
- `studio-options.ts` / `studio-recommendations.ts` — styles & lists  

### Ads
- `ad-whatsapp.ts`, `ad-composite.ts`, `ad-templates.ts`, `ad-brief.ts`, `ad-colors.ts`

### Shared
- `whatsapp-handler.ts`, `photoroom.ts`, `conversation.ts`, `paywall.ts`, `users.ts`

### Engine
- `studio-engine/server.js` — Express `POST /process-studio-request`  
- `web/src/app/api/process-studio-request/route.ts` — Next.js API  

---

## 6. Current Status

### Done
- Full WhatsApp Studio + Ad product loops  
- Credits / plans / paywall  
- Studio quality upgrades (product-aware scenes, framing, gpt-4o)  
- Studio Engine connected to WhatsApp  
- Timeout + stuck-session handling  
- Photoroom failure fixes for generation errors  

### Active stage
**Polish Studio quality until merchants would pay for it.**

### Biggest remaining quality limiter
`PHOTOROOM_MODE=sandbox` → watermarked previews.  
Production Photoroom key removes watermarks and unlocks sellable output.

### Not built yet
- Referrals  
- Analytics dashboard  
- Merchant web dashboard  
- Packaging dieline → 3D mockup (dropped earlier)  

---

## 7. What We Taught GPT (Studio)

1. **Analyze the raw photo** — find main product, note issues, usability, ideal setting  
2. **Write professional photoshoot prompts** with:
   - Exact surface  
   - Matching visible props (e.g. cashew bowl for dry fruits)  
   - Visible detailed background (no blur/bokeh)  
   - Lighting + natural contact shadow  
   - Product ~35–40% of frame (not full-bleed)  
3. **Catalog vs Ad branching** in Studio Engine  
4. Fixed suffixes enforce: sharp packaging, no hands, realistic commercial look  

Photoroom is the camera studio; GPT is the creative director.

---

## 8. Next Recommended Steps

1. Redeploy latest fixes to Vercel and retest Studio generation  
2. Switch Vercel to `PHOTOROOM_MODE=production` with live Photoroom Plus key  
3. Collect 10–20 real merchant photos and tune prompts from results  
4. Soft launch to first sellers  
5. Later: analytics, referrals, merchant dashboard  

---

## 9. Summary Verdict

Velora Studio is a **working WhatsApp-native product photography + ad creation SaaS** for Indian merchants.  
Core loops are live. Current work is **Studio quality, reliability, and production Photoroom** before serious go-to-market.

---

*Document generated for Aurix / Velora Studio project status.*
