import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { type PlanId } from "@/lib/config";
import { grantPlanCredits, notifyPlanActivated } from "@/lib/credits";

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

type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment_link?: {
      entity?: {
        id?: string;
        notes?: { user_id?: string; plan_id?: string };
      };
    };
    payment?: {
      entity?: {
        id?: string;
        notes?: { user_id?: string; plan_id?: string };
      };
    };
  };
};

function extractPaymentMeta(event: RazorpayWebhookEvent): {
  userId?: string;
  planId?: PlanId;
  razorpayId?: string;
} | null {
  const linkEntity = event.payload?.payment_link?.entity;
  if (linkEntity?.notes?.user_id && linkEntity.notes.plan_id) {
    return {
      userId: linkEntity.notes.user_id,
      planId: linkEntity.notes.plan_id as PlanId,
      razorpayId: linkEntity.id,
    };
  }

  const paymentEntity = event.payload?.payment?.entity;
  if (paymentEntity?.notes?.user_id && paymentEntity.notes.plan_id) {
    return {
      userId: paymentEntity.notes.user_id,
      planId: paymentEntity.notes.plan_id as PlanId,
      razorpayId: paymentEntity.id,
    };
  }

  return null;
}

/**
 * Razorpay webhook → grant plan credits + WhatsApp confirmation (Phase 4).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const paidEvents = new Set(["payment_link.paid", "payment.captured"]);
  if (!event.event || !paidEvents.has(event.event)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const meta = extractPaymentMeta(event);
  if (!meta?.userId || !meta.planId) {
    return NextResponse.json({ error: "Missing payment notes" }, { status: 400 });
  }

  const validPlans: PlanId[] = ["starter", "growth", "pro"];
  if (!validPlans.includes(meta.planId)) {
    return NextResponse.json({ error: "Invalid plan_id" }, { status: 400 });
  }

  try {
    const { alreadyProcessed } = await grantPlanCredits(
      meta.userId,
      meta.planId,
      meta.razorpayId ?? null,
    );

    if (!alreadyProcessed) {
      await notifyPlanActivated(meta.userId, meta.planId);
    }

    return NextResponse.json({ ok: true, alreadyProcessed });
  } catch (error) {
    console.error("Razorpay webhook grant error", error);
    return NextResponse.json({ error: "Grant failed" }, { status: 500 });
  }
}
