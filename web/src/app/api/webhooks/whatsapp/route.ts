import { after, NextRequest, NextResponse } from "next/server";
import { processWhatsAppWebhook } from "@/lib/whatsapp-handler";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Meta webhook verification */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? "velora_verify_token";

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * Incoming WhatsApp messages — full studio flow (Phase 2).
 * Returns 200 immediately; generation runs in after().
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    after(async () => {
      try {
        await processWhatsAppWebhook(payload);
      } catch (error) {
        console.error("WhatsApp webhook background error", error);
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp webhook error", error);
    return NextResponse.json({ ok: true });
  }
}
