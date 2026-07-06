import {
  DEFAULT_LANG,
  detectLanguage,
  isVeloraLang,
  type VeloraLang,
} from "@/lib/velora-voice";
import { getSupabaseAdmin } from "@/lib/supabase";

type BrandMemory = {
  language?: VeloraLang;
};

export function langFromChoices(
  choices: Record<string, unknown>,
): VeloraLang | null {
  const lang = choices.lang;
  return isVeloraLang(lang) ? lang : null;
}

export async function getUserLanguage(userId: string): Promise<VeloraLang | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("brand_memory")
    .eq("id", userId)
    .single();

  if (error) throw error;
  const memory = (data.brand_memory ?? {}) as BrandMemory;
  return isVeloraLang(memory.language) ? memory.language : null;
}

export async function setUserLanguage(
  userId: string,
  lang: VeloraLang,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("brand_memory")
    .eq("id", userId)
    .single();

  if (error) throw error;
  const memory = { ...((data.brand_memory ?? {}) as BrandMemory), language: lang };

  const { error: updateError } = await supabase
    .from("users")
    .update({ brand_memory: memory })
    .eq("id", userId);

  if (updateError) throw updateError;
}

/** Prefer conversation choice, then saved user pref, then text detection, then default. */
export async function resolveLanguage(
  userId: string,
  choices: Record<string, unknown>,
  lastUserText?: string,
): Promise<VeloraLang> {
  const fromChoices = langFromChoices(choices);
  if (fromChoices) return fromChoices;

  const saved = await getUserLanguage(userId);
  if (saved) return saved;

  if (lastUserText) {
    const detected = detectLanguage(lastUserText);
    if (detected) return detected;
  }

  return DEFAULT_LANG;
}
