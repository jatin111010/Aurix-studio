import { PLANS, type PlanId } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserQuota, formatQuotaMessage } from "@/lib/paywall";
import { getUserLanguage } from "@/lib/user-prefs";
import { DEFAULT_LANG, say } from "@/lib/velora-voice";
import { sendText } from "@/lib/whatsapp";

export async function grantPlanCredits(
  userId: string,
  planId: PlanId,
  razorpayId: string | null,
): Promise<{ alreadyProcessed: boolean }> {
  if (razorpayId) {
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("razorpay_id", razorpayId)
      .maybeSingle();

    if (existing) {
      return { alreadyProcessed: true };
    }
  }

  const plan = PLANS[planId];
  const supabase = getSupabaseAdmin();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data: currentCredits } = await supabase
    .from("credits")
    .select("studio_balance, ad_balance")
    .eq("user_id", userId)
    .maybeSingle();

  const studioBalance =
    (currentCredits?.studio_balance as number | undefined ?? 0) +
    plan.studioCredits;
  const adBalance =
    (currentCredits?.ad_balance as number | undefined ?? 0) + plan.adCredits;

  await supabase.from("credits").upsert({
    user_id: userId,
    studio_balance: studioBalance,
    ad_balance: adBalance,
    plan_period_end: periodEnd.toISOString(),
  });

  await supabase.from("users").update({ plan: planId }).eq("id", userId);

  await supabase.from("payments").insert({
    user_id: userId,
    amount_inr: plan.priceInr,
    plan_id: planId,
    razorpay_id: razorpayId,
    status: "paid",
  });

  return { alreadyProcessed: false };
}

export async function notifyPlanActivated(
  userId: string,
  planId: PlanId,
): Promise<void> {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("phone")
    .eq("id", userId)
    .single();

  if (!user?.phone) return;

  const plan = PLANS[planId];
  const quota = await getUserQuota(userId);
  const lang = (await getUserLanguage(userId)) ?? DEFAULT_LANG;

  await sendText(
    user.phone as string,
    say(lang, "payment_success", {
      plan: plan.name,
      studio: plan.studioCredits,
      ad: plan.adCredits,
      quota: formatQuotaMessage(quota),
    }),
  );
}
