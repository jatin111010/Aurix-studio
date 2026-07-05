import { FREE_IMAGES, PLANS } from "@/lib/config";
import { createSubscriptionPaymentLink, isRazorpayConfigured } from "@/lib/razorpay";
import { sendButtons, sendText } from "@/lib/whatsapp";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function getUserQuota(userId: string): Promise<{
  freeRemaining: number;
  studioBalance: number;
  adBalance: number;
}> {
  const supabase = getSupabaseAdmin();

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("free_used")
    .eq("id", userId)
    .single();
  if (userError) throw userError;

  const { data: credits, error: creditsError } = await supabase
    .from("credits")
    .select("studio_balance, ad_balance")
    .eq("user_id", userId)
    .single();
  if (creditsError) throw creditsError;

  return {
    freeRemaining: Math.max(0, FREE_IMAGES - (user.free_used as number)),
    studioBalance: credits.studio_balance as number,
    adBalance: credits.ad_balance as number,
  };
}

export function formatQuotaMessage(quota: {
  freeRemaining: number;
  studioBalance: number;
  adBalance: number;
}): string {
  const parts: string[] = [];
  if (quota.freeRemaining > 0) {
    parts.push(`${quota.freeRemaining} free studio image${quota.freeRemaining === 1 ? "" : "s"} left`);
  }
  if (quota.studioBalance > 0) {
    parts.push(`${quota.studioBalance} studio credits`);
  }
  if (quota.adBalance > 0) {
    parts.push(`${quota.adBalance} ad credits`);
  }
  if (parts.length === 0) {
    return "No credits remaining. Choose a plan below to continue.";
  }
  return `Balance: ${parts.join(" · ")}`;
}

export async function sendPaywallMessage(
  to: string,
  userId: string,
): Promise<void> {
  const planLines = Object.values(PLANS)
    .map(
      (p) =>
        `• ${p.name} — ₹${p.priceInr}/mo (${p.studioCredits} studio + ${p.adCredits} ad)`,
    )
    .join("\n");

  await sendText(
    to,
    `You've used your free images. Subscribe to keep creating studio shots:\n\n${planLines}\n\nTap a plan below to pay via Razorpay.`,
  );

  await sendButtons(to, "Choose your plan:", [
    { id: "plan_starter", title: `Starter ₹${PLANS.starter.priceInr}` },
    { id: "plan_growth", title: `Growth ₹${PLANS.growth.priceInr}` },
    { id: "plan_pro", title: `Pro ₹${PLANS.pro.priceInr}` },
  ]);
}

export async function handlePlanSelection(
  to: string,
  userId: string,
  planId: "starter" | "growth" | "pro",
): Promise<void> {
  if (!isRazorpayConfigured()) {
    const plan = PLANS[planId];
    await sendText(
      to,
      `Payments are not live yet. ${plan.name} plan: ₹${plan.priceInr}/mo — ${plan.studioCredits} studio + ${plan.adCredits} ad credits. We'll enable Razorpay soon.`,
    );
    return;
  }

  const link = await createSubscriptionPaymentLink(planId, to, userId);
  await sendText(
    to,
    `Here's your payment link for the ${PLANS[planId].name} plan (₹${PLANS[planId].priceInr}/mo):\n\n${link}\n\nCredits activate automatically after payment.`,
  );
}
