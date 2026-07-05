/**
 * Razorpay payment links (Phase 4).
 */

import { PLANS, type PlanId } from "@/lib/config";

export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
  );
}

export function isRazorpayWebhookConfigured(): boolean {
  return Boolean(
    isRazorpayConfigured() && process.env.RAZORPAY_WEBHOOK_SECRET,
  );
}

function getAppUrl(): string | null {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return null;
}

export function getRazorpayWebhookUrl(): string | null {
  const appUrl = getAppUrl();
  return appUrl ? `${appUrl}/api/webhooks/razorpay` : null;
}

/** Normalize phone for Razorpay customer contact (+91…). */
export function formatPhoneForRazorpay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export async function createSubscriptionPaymentLink(
  planId: PlanId,
  phone: string,
  userId: string,
): Promise<string> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured");
  }

  const plan = PLANS[planId];
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const appUrl = getAppUrl();

  const body: Record<string, unknown> = {
    amount: plan.priceInr * 100,
    currency: "INR",
    accept_partial: false,
    description: `Velora Studio — ${plan.name} plan (monthly)`,
    customer: { contact: formatPhoneForRazorpay(phone) },
    notify: { sms: true, email: false },
    reminder_enable: true,
    notes: { user_id: userId, plan_id: planId },
  };

  if (appUrl) {
    body.callback_url = `${appUrl}/?payment=success`;
    body.callback_method = "get";
  }

  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Razorpay payment link failed: ${await res.text()}`);
  }

  const json = (await res.json()) as { short_url: string; id?: string };

  return json.short_url;
}
