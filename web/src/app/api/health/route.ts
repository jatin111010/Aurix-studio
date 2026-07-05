import { NextResponse } from "next/server";
import { getPhotoroomMode } from "@/lib/photoroom";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "velora-studio",
    photoroomMode: getPhotoroomMode(),
    supabaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    photoroomConfigured: Boolean(process.env.PHOTOROOM_API_KEY),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    whatsappConfigured: Boolean(
      process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
    ),
    razorpayConfigured: Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
    ),
  });
}
