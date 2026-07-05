import { BACKGROUNDS } from "@/lib/config";
import { compositeAdHeadline } from "@/lib/ad-composite";
import { generateAdCopy } from "@/lib/openai";
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

export type AdGenerationResult = StudioGenerationResult & {
  headline: string;
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

export async function runAdGeneration(
  userId: string,
  inputImageUrl: string,
  backgroundId: string,
): Promise<AdGenerationResult> {
  const credit = await canGenerate(userId, "ad");
  if (!credit.ok) {
    throw new AdPaywallError();
  }

  const background = BACKGROUNDS.find((b) => b.id === backgroundId);
  const backgroundPrompt =
    background?.prompt ?? "clean soft studio backdrop";

  const studioPng = await editImage({
    imageUrl: inputImageUrl,
    backgroundPrompt,
    padding: 0.1,
  });

  const headline = await generateAdCopy(background?.label);
  const adPng = await compositeAdHeadline(studioPng, headline);
  const outputUrl = await uploadOutputPng(userId, adPng);
  const photoroomMode = getPhotoroomMode();

  await consumeCredit(userId, "ad", credit.source);

  const supabase = getSupabaseAdmin();
  await supabase.from("generations").insert({
    user_id: userId,
    type: "ad",
    source: credit.source,
    input_url: inputImageUrl,
    output_url: outputUrl,
    choices: { backgroundId, headline },
    photoroom_mode: photoroomMode,
  });

  return {
    outputUrl,
    credit,
    backgroundId,
    photoroomMode,
    headline,
  };
}

export class PaywallError extends Error {
  constructor() {
    super("paywall");
    this.name = "PaywallError";
  }
}

export class AdPaywallError extends Error {
  constructor() {
    super("ad_paywall");
    this.name = "AdPaywallError";
  }
}
