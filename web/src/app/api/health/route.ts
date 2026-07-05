import { NextResponse } from "next/server";
import { getPhotoroomMode } from "@/lib/photoroom";
import {
  getRazorpayWebhookUrl,
  isRazorpayConfigured,
  isRazorpayWebhookConfigured,
} from "@/lib/razorpay";
import { verifyWhatsAppCredentials } from "@/lib/whatsapp";

export const runtime = "nodejs";

function getAppUrl(): string | null {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return null;
}

export async function GET() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const photoroomConfigured = Boolean(process.env.PHOTOROOM_API_KEY);
  const whatsappConfigured = Boolean(
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
  );
  const razorpayConfigured = isRazorpayConfigured();
  const razorpayWebhookConfigured = isRazorpayWebhookConfigured();
  const verifyToken =
    process.env.WHATSAPP_VERIFY_TOKEN ?? "velora_verify_token";
  const appUrl = getAppUrl();
  const webhookUrl = appUrl ? `${appUrl}/api/webhooks/whatsapp` : null;
  const razorpayWebhookUrl = getRazorpayWebhookUrl();

  const missing: string[] = [];
  if (!photoroomConfigured) missing.push("PHOTOROOM_API_KEY");
  if (!supabaseConfigured) {
    missing.push(
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  if (!whatsappConfigured) {
    missing.push("WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID");
  }
  if (!appUrl) missing.push("NEXT_PUBLIC_APP_URL");
  if (!razorpayConfigured) {
    missing.push("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET");
  }
  if (!razorpayWebhookConfigured) {
    missing.push("RAZORPAY_WEBHOOK_SECRET");
  }

  const phase2Ready =
    photoroomConfigured &&
    supabaseConfigured &&
    whatsappConfigured &&
    Boolean(webhookUrl);

  const phase4Ready =
    phase2Ready && razorpayConfigured && razorpayWebhookConfigured;

  const whatsappCheck = whatsappConfigured
    ? await verifyWhatsAppCredentials()
    : { ok: false, error: "missing_env" as const };

  return NextResponse.json({
    ok: true,
    service: "velora-studio",
    phase: phase4Ready ? 4 : phase2Ready ? 3 : 1,
    photoroomMode: getPhotoroomMode(),
    supabaseConfigured,
    photoroomConfigured,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    whatsappConfigured,
    whatsappTokenValid: whatsappCheck.ok,
    whatsappAuthError: whatsappCheck.error ?? null,
    whatsappAuthHint: whatsappCheck.hint ?? null,
    razorpayConfigured,
    razorpayWebhookConfigured,
    phase2Ready,
    phase4Ready,
    appUrl,
    webhookUrl,
    razorpayWebhookUrl,
    verifyToken,
    missing: [...new Set(missing)],
  });
}
