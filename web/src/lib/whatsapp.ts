/**
 * Meta Cloud API helpers (Phase 2).
 * Works with direct Meta API; BSP webhooks can adapt the same payload shape.
 */

const GRAPH = "https://graph.facebook.com";

function getConfig() {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  if (!token || !phoneNumberId) {
    throw new Error("WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not set");
  }
  return { token, phoneNumberId, version };
}

/** Live check: token + phone number ID work together on Meta's API. */
export async function verifyWhatsAppCredentials(): Promise<{
  ok: boolean;
  error?: string;
  hint?: string;
}> {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";

  if (!token || !phoneNumberId) {
    return { ok: false, error: "missing_env", hint: "Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID on Vercel." };
  }

  if (token.length < 80) {
    return {
      ok: false,
      error: "token_format",
      hint: "WHATSAPP_TOKEN looks too short — use the long Access Token from WhatsApp → API Setup, not App Secret or App ID.",
    };
  }

  try {
    const res = await fetch(
      `${GRAPH}/${version}/${phoneNumberId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = await res.text();

    if (res.ok) {
      return { ok: true };
    }

    if (body.includes("OAuthException") || body.includes("code\":190")) {
      return {
        ok: false,
        error: "auth_failed",
        hint:
          "Token invalid or does not match this Phone number ID. Re-copy BOTH from the same Meta app → WhatsApp → API Setup, update Vercel, redeploy. Regenerating the token invalidates the old one immediately.",
      };
    }

    return { ok: false, error: `http_${res.status}`, hint: body.slice(0, 200) };
  } catch (e) {
    return {
      ok: false,
      error: "network",
      hint: e instanceof Error ? e.message : "Could not reach Meta API",
    };
  }
}

export async function sendText(to: string, body: string): Promise<void> {
  const { token, phoneNumberId, version } = getConfig();
  const res = await fetch(
    `${GRAPH}/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`WhatsApp sendText failed: ${await res.text()}`);
  }
}

export async function sendImage(
  to: string,
  imageUrl: string,
  caption?: string,
): Promise<void> {
  const { token, phoneNumberId, version } = getConfig();
  const res = await fetch(
    `${GRAPH}/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "image",
        image: { link: imageUrl, caption },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`WhatsApp sendImage failed: ${await res.text()}`);
  }
}

/** Upload PNG to Meta and send — reliable vs public URL links. */
export async function sendImagePng(
  to: string,
  png: Buffer,
  caption?: string,
): Promise<void> {
  const { token, phoneNumberId, version } = getConfig();

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "image/png");
  form.append(
    "file",
    new Blob([new Uint8Array(png)], { type: "image/png" }),
    "velora-result.png",
  );

  const uploadRes = await fetch(
    `${GRAPH}/${version}/${phoneNumberId}/media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );

  if (!uploadRes.ok) {
    throw new Error(`WhatsApp media upload failed: ${await uploadRes.text()}`);
  }

  const uploadJson = (await uploadRes.json()) as { id?: string };
  if (!uploadJson.id) {
    throw new Error("WhatsApp media upload missing id");
  }

  const sendRes = await fetch(
    `${GRAPH}/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "image",
        image: { id: uploadJson.id, caption },
      }),
    },
  );

  if (!sendRes.ok) {
    throw new Error(`WhatsApp sendImagePng failed: ${await sendRes.text()}`);
  }
}

export async function sendButtons(
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[],
): Promise<void> {
  const { token, phoneNumberId, version } = getConfig();
  const res = await fetch(
    `${GRAPH}/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: bodyText },
          action: {
            buttons: buttons.slice(0, 3).map((b) => ({
              type: "reply",
              reply: { id: b.id, title: b.title.slice(0, 20) },
            })),
          },
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`WhatsApp sendButtons failed: ${await res.text()}`);
  }
}

export async function sendList(
  to: string,
  bodyText: string,
  buttonLabel: string,
  rows: { id: string; title: string; description?: string }[],
): Promise<void> {
  const { token, phoneNumberId, version } = getConfig();
  const res = await fetch(
    `${GRAPH}/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: bodyText },
          action: {
            button: buttonLabel.slice(0, 20),
            sections: [
              {
                title: "Options",
                rows: rows.slice(0, 10).map((r) => ({
                  id: r.id,
                  title: r.title.slice(0, 24),
                  description: r.description?.slice(0, 72),
                })),
              },
            ],
          },
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`WhatsApp sendList failed: ${await res.text()}`);
  }
}

/** Download media received via WhatsApp webhook (image id from Meta). */
export async function downloadMedia(
  mediaId: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const { token, version } = getConfig();

  const metaRes = await fetch(`${GRAPH}/${version}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) {
    throw new Error(`WhatsApp media meta failed: ${await metaRes.text()}`);
  }

  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!meta.url) throw new Error("WhatsApp media missing url");

  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!fileRes.ok) {
    throw new Error(`WhatsApp media download failed: ${fileRes.status}`);
  }

  return {
    buffer: Buffer.from(await fileRes.arrayBuffer()),
    mimeType: meta.mime_type ?? "image/jpeg",
  };
}

function mimeToExt(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

export { mimeToExt };
