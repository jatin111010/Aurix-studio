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

export type BuiltStudioImage = {
  png: Buffer;
  backgroundId: string;
  photoroomMode: string;
};

export type BuiltAdImage = BuiltStudioImage & {
  headline: string;
};

export async function buildStudioImage(
  inputImageUrl: string,
  backgroundId: string,
): Promise<BuiltStudioImage> {
  const background = BACKGROUNDS.find((b) => b.id === backgroundId);
  const backgroundPrompt =
    background?.prompt ?? "clean soft studio backdrop";

  const png = await editImage({
    imageUrl: inputImageUrl,
    backgroundPrompt,
    padding: 0.1,
  });

  return {
    png,
    backgroundId,
    photoroomMode: getPhotoroomMode(),
  };
}

export async function buildAdImage(
  inputImageUrl: string,
  backgroundId: string,
): Promise<BuiltAdImage> {
  const built = await buildStudioImage(inputImageUrl, backgroundId);
  const background = BACKGROUNDS.find((b) => b.id === backgroundId);
  const headline = await generateAdCopy(background?.label);
  const png = await compositeAdHeadline(built.png, headline);

  return { ...built, png, headline };
}

export async function saveStudioGeneration(
  userId: string,
  inputImageUrl: string,
  outputUrl: string,
  built: BuiltStudioImage,
  credit: CreditCheck & { ok: true },
): Promise<void> {
  await consumeCredit(userId, "studio", credit.source);

  const supabase = getSupabaseAdmin();
  await supabase.from("generations").insert({
    user_id: userId,
    type: "studio",
    source: credit.source,
    input_url: inputImageUrl,
    output_url: outputUrl,
    choices: { backgroundId: built.backgroundId },
    photoroom_mode: built.photoroomMode,
  });
}

export async function saveAdGeneration(
  userId: string,
  inputImageUrl: string,
  outputUrl: string,
  built: BuiltAdImage,
  credit: CreditCheck & { ok: true },
): Promise<void> {
  await consumeCredit(userId, "ad", credit.source);

  const supabase = getSupabaseAdmin();
  await supabase.from("generations").insert({
    user_id: userId,
    type: "ad",
    source: credit.source,
    input_url: inputImageUrl,
    output_url: outputUrl,
    choices: { backgroundId: built.backgroundId, headline: built.headline },
    photoroom_mode: built.photoroomMode,
  });
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

export async function checkStudioCredit(userId: string) {
  const credit = await canGenerate(userId, "studio");
  if (!credit.ok) throw new PaywallError();
  return credit;
}

export async function checkAdCredit(userId: string) {
  const credit = await canGenerate(userId, "ad");
  if (!credit.ok) throw new AdPaywallError();
  return credit;
}
