import { getSupabaseAdmin } from "@/lib/supabase";

export type ConversationStep =
  | "start"
  | "awaiting_mode"
  | "awaiting_language"
  | "studio_awaiting_style"
  | "studio_awaiting_angle"
  | "studio_awaiting_lighting"
  | "studio_awaiting_quality"
  | "studio_awaiting_actions"
  | "ad_awaiting_style"
  | "ad_awaiting_purpose"
  | "ad_awaiting_offer"
  | "ad_awaiting_cta"
  | "ad_awaiting_headline_mode"
  | "ad_awaiting_headline_text"
  | "ad_awaiting_message_mode"
  | "ad_awaiting_message_text"
  | "ad_awaiting_background"
  | "ad_awaiting_custom_background"
  | "ad_awaiting_confirm"
  | "generating";

export type ConversationRow = {
  id: string;
  user_id: string;
  step: ConversationStep;
  choices: Record<string, unknown>;
  input_image_url: string | null;
  updated_at: string;
};

export async function getOrCreateConversation(
  userId: string,
): Promise<ConversationRow> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing as ConversationRow;

  const { data: created, error: createError } = await supabase
    .from("conversations")
    .insert({ user_id: userId, step: "start", choices: {} })
    .select("*")
    .single();

  if (createError) throw createError;
  return created as ConversationRow;
}

export async function updateConversation(
  conversationId: string,
  patch: Partial<
    Pick<ConversationRow, "step" | "choices" | "input_image_url">
  >,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("conversations")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) throw error;
}

export async function resetConversation(conversationId: string): Promise<void> {
  await updateConversation(conversationId, {
    step: "start",
    choices: {},
    input_image_url: null,
  });
}
