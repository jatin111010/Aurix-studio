import { FREE_IMAGES, type GenerationType } from "@/lib/config";
import { getSupabaseAdmin, type UserRow } from "@/lib/supabase";

export async function getOrCreateUserByPhone(phone: string): Promise<UserRow> {
  const supabase = getSupabaseAdmin();
  const normalized = phone.replace(/\D/g, "");

  const { data: existing, error: findError } = await supabase
    .from("users")
    .select("*")
    .eq("phone", normalized)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing as UserRow;

  const { data: created, error: createError } = await supabase
    .from("users")
    .insert({ phone: normalized, free_used: 0 })
    .select("*")
    .single();

  if (createError) throw createError;

  await supabase.from("credits").insert({
    user_id: created.id,
    studio_balance: 0,
    ad_balance: 0,
  });

  return created as UserRow;
}

export type CreditCheck =
  | { ok: true; source: "free" | "paid" }
  | { ok: false; reason: "paywall" };

/** Free tier first, then paid credits. */
export async function canGenerate(
  userId: string,
  type: GenerationType,
): Promise<CreditCheck> {
  const supabase = getSupabaseAdmin();

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("free_used")
    .eq("id", userId)
    .single();

  if (userError) throw userError;

  if ((user.free_used as number) < FREE_IMAGES) {
    return { ok: true, source: "free" };
  }

  const { data: credits, error: creditsError } = await supabase
    .from("credits")
    .select("studio_balance, ad_balance")
    .eq("user_id", userId)
    .single();

  if (creditsError) throw creditsError;

  const balance =
    type === "ad"
      ? (credits.ad_balance as number)
      : (credits.studio_balance as number);

  if (balance > 0) return { ok: true, source: "paid" };
  return { ok: false, reason: "paywall" };
}

export async function consumeCredit(
  userId: string,
  type: GenerationType,
  source: "free" | "paid",
): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (source === "free") {
    const { data: user, error } = await supabase
      .from("users")
      .select("free_used")
      .eq("id", userId)
      .single();
    if (error) throw error;

    const { error: updateError } = await supabase
      .from("users")
      .update({ free_used: (user.free_used as number) + 1 })
      .eq("id", userId);
    if (updateError) throw updateError;
    return;
  }

  const { data: credits, error } = await supabase
    .from("credits")
    .select("studio_balance, ad_balance")
    .eq("user_id", userId)
    .single();
  if (error) throw error;

  const studioBalance = credits.studio_balance as number;
  const adBalance = credits.ad_balance as number;
  const patch =
    type === "ad"
      ? { ad_balance: Math.max(0, adBalance - 1) }
      : { studio_balance: Math.max(0, studioBalance - 1) };

  const { error: updateError } = await supabase
    .from("credits")
    .update(patch)
    .eq("user_id", userId);
  if (updateError) throw updateError;
}
