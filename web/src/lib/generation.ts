import { BACKGROUNDS } from "@/lib/config";
import { editImage, getPhotoroomMode } from "@/lib/photoroom";
import { uploadOutputPng } from "@/lib/storage";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  canGenerate,
  consumeCredit,
  type CreditCheck,
} from "@/lib/users";

export type StudioGenerationResult = {
  outputUrl: string;
  credit: CreditCheck & { ok: true };
  backgroundId: string;
  photoroomMode: string;
};

export async function runStudioGeneration(
  userId: string,
  inputImageUrl: string,
  backgroundId: string,
): Promise<StudioGenerationResult> {
  const credit = await canGenerate(userId, "studio");
  if (!credit.ok) {
    throw new PaywallError();
  }

  const background = BACKGROUNDS.find((b) => b.id === backgroundId);
  const backgroundPrompt =
    background?.prompt ?? "clean soft studio backdrop";

  const png = await editImage({
    imageUrl: inputImageUrl,
    backgroundPrompt,
    padding: 0.1,
  });

  const outputUrl = await uploadOutputPng(userId, png);
  const photoroomMode = getPhotoroomMode();

  await consumeCredit(userId, "studio", credit.source);

  const supabase = getSupabaseAdmin();
  await supabase.from("generations").insert({
    user_id: userId,
    type: "studio",
    source: credit.source,
    input_url: inputImageUrl,
    output_url: outputUrl,
    choices: { backgroundId },
    photoroom_mode: photoroomMode,
  });

  return {
    outputUrl,
    credit,
    backgroundId,
    photoroomMode,
  };
}

export class PaywallError extends Error {
  constructor() {
    super("paywall");
    this.name = "PaywallError";
  }
}
