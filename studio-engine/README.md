# Velora Studio Engine (Express)

Core backend for WhatsApp AI Product Studio.

## Setup

```bash
cd studio-engine
npm install
cp .env.example .env
# fill OPENAI_API_KEY + PHOTOROOM_API_KEY
npm run dev
```

## Endpoint

`POST /process-studio-request`

```json
{
  "imageUrl": "https://.../raw-product.jpg",
  "mode": "catalog",
  "userVibeText": "rose romance"
}
```

### Modes
- `catalog` → white background packshot (`background.color=FFFFFF`)
- `ad` → GPT-4o expands vibe → Photoroom `background.prompt`

### Success response
```json
{
  "ok": true,
  "usable": true,
  "mode": "ad",
  "outputUrl": "http://localhost:4040/outputs/studio-....png",
  "user_guidance": "Looks good!",
  "analysis": { "...": "..." },
  "marketing": { "...": "..." },
  "backgroundPrompt": "..."
}
```

### Unusable photo
```json
{
  "ok": false,
  "usable": false,
  "user_guidance": "Image is a bit dark, try taking it in daylight!"
}
```

## Connected to WhatsApp (Next.js)

WhatsApp Studio Shot now uses this same engine logic via:

- In-process: `web/src/lib/studio-engine-core.ts` (default on Vercel)
- Optional Express: set `STUDIO_ENGINE_URL=http://localhost:4040` in `web/.env.local`
- HTTP API on Next.js: `POST /api/process-studio-request`

Mapping:
- Style **White Studio / E-commerce** → `catalog` + 2 lifestyle `ad` vibes
- Other styles → 3× `ad` with style/scene vibes
- Unusable photo → WhatsApp gets `user_guidance` (no Photoroom charge path)
