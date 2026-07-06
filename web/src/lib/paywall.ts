import { FREE_IMAGES, PLANS, type PlanId } from "@/lib/config";
import {
  createSubscriptionPaymentLink,
  isRazorpayConfigured,
} from "@/lib/razorpay";
import { DEFAULT_LANG, say, type VeloraLang } from "@/lib/velora-voice";
import { sendButtons, sendList, sendText } from "@/lib/whatsapp";
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
    parts.push(
      `${quota.freeRemaining} free studio image${quota.freeRemaining === 1 ? "" : "s"} left`,
    );
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

function planListRows() {
  return (Object.keys(PLANS) as PlanId[]).map((id) => {
    const p = PLANS[id];
    return {
      id: `plan_${id}`,
      title: `${p.name} ₹${p.priceInr}`,
      description: `${p.studioCredits} studio + ${p.adCredits} ad / month`,
    };
  });
}

export async function sendPlansMenu(
  to: string,
  lang: VeloraLang = DEFAULT_LANG,
): Promise<void> {
  const lines = (Object.keys(PLANS) as PlanId[])
    .map((id) => {
      const p = PLANS[id];
      return `• ${p.name} — ₹${p.priceInr}/mo (${p.studioCredits} studio + ${p.adCredits} ad)`;
    })
    .join("\n");

  const intro =
    lang === "hi"
      ? "Velora Studio plans — monthly subscription:\n\n"
      : lang === "hinglish"
        ? "Velora Studio plans — monthly subscription:\n\n"
        : "Here are our Velora Studio plans:\n\n";

  await sendText(
    to,
    `${intro}${lines}\n\nTap a plan below — payment link aapko yahin milega.`,
  );

  await sendList(to, "Choose plan:", "Plans", planListRows());
}

export async function sendPaywallMessage(
  to: string,
  userId: string,
  lang: VeloraLang = DEFAULT_LANG,
): Promise<void> {
  await sendText(to, say(lang, "paywall_studio"));
  await sendPlansMenu(to, lang);
}

export async function sendAdPaywallMessage(
  to: string,
  userId: string,
  lang: VeloraLang = DEFAULT_LANG,
): Promise<void> {
  await sendText(to, say(lang, "paywall_ad"));

  const prompt =
    lang === "hi"
      ? "Aap kya karna chahenge?"
      : lang === "hinglish"
        ? "Aap kya karna chahenge?"
        : "What would you like?";

  await sendButtons(to, prompt, [
    { id: "mode_studio", title: "Studio shot" },
    { id: "plans_menu", title: "View plans" },
  ]);
}

export async function handlePlanSelection(
  to: string,
  userId: string,
  planId: PlanId,
): Promise<void> {
  if (!isRazorpayConfigured()) {
    const plan = PLANS[planId];
    await sendText(
      to,
      `Payments are not live yet.\n\n${plan.name}: ₹${plan.priceInr}/mo — ${plan.studioCredits} studio + ${plan.adCredits} ad credits.\n\nAdd RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on Vercel to enable payments.`,
    );
    return;
  }

  try {
    const link = await createSubscriptionPaymentLink(planId, to, userId);
    const plan = PLANS[planId];
    await sendText(
      to,
      `${plan.name} plan — ₹${plan.priceInr}/month\n\nPay here:\n${link}\n\nCredits are added automatically after payment. You'll get a confirmation message here on WhatsApp.`,
    );
  } catch (error) {
    console.error("Payment link error", error);
    await sendText(
      to,
      "Sorry, we couldn't create a payment link right now. Please try again in a few minutes or type *plans*.",
    );
  }
}
