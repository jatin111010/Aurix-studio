/**
 * Meta Cloud API helpers (Phase 2).
 * Works with direct Meta API; BSP webhooks can adapt the same payload shape.
 */

const GRAPH = "https://graph.facebook.com";

function getConfig() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  if (!token || !phoneNumberId) {
    throw new Error("WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not set");
  }
  return { token, phoneNumberId, version };
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
