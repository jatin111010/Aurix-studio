import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { PLANS, type PlanId } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Razorpay payment_link.paid → grant plan credits (Phase 4).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    event?: string;
    payload?: {
      payment_link?: {
        entity?: {
          id?: string;
          amount?: number;
          notes?: { user_id?: string; plan_id?: string };
        };
      };
    };
  };

  if (event.event !== "payment_link.paid") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const entity = event.payload?.payment_link?.entity;
  const userId = entity?.notes?.user_id;
  const planId = entity?.notes?.plan_id as PlanId | undefined;

  if (!userId || !planId || !(planId in PLANS)) {
    return NextResponse.json({ error: "Missing notes" }, { status: 400 });
  }

  const plan = PLANS[planId];
  const supabase = getSupabaseAdmin();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await supabase.from("credits").upsert({
    user_id: userId,
    studio_balance: plan.studioCredits,
    ad_balance: plan.adCredits,
    plan_period_end: periodEnd.toISOString(),
  });

  await supabase.from("users").update({ plan: planId }).eq("id", userId);

  await supabase.from("payments").insert({
    user_id: userId,
    amount_inr: plan.priceInr,
    plan_id: planId,
    razorpay_id: entity?.id ?? null,
    status: "paid",
  });

  return NextResponse.json({ ok: true });
}
