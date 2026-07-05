/**
 * Razorpay payment links (Phase 4).
 */

import { PLANS, type PlanId } from "@/lib/config";

export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
  );
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

  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: plan.priceInr * 100,
      currency: "INR",
      accept_partial: false,
      description: `Velora Studio — ${plan.name} plan`,
      customer: { contact: phone },
      notify: { sms: true, email: false },
      reminder_enable: true,
      notes: { user_id: userId, plan_id: planId },
    }),
  });

  if (!res.ok) {
    throw new Error(`Razorpay payment link failed: ${await res.text()}`);
  }

  const json = (await res.json()) as { short_url: string };
  return json.short_url;
}
