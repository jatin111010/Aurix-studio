import { resolveBackground, resolveBackgroundAsync } from "@/lib/backgrounds";
import { BACKGROUND_CUSTOM_ID } from "@/lib/config";
import { briefToAdCopy, resolveAdBrief, type AdBrief } from "@/lib/ad-brief";
import { compositeAdPost } from "@/lib/ad-composite";
import { extractBrandColors } from "@/lib/ad-colors";
import type { AdCopyContent } from "@/lib/openai";
import type { AdChoices } from "@/lib/ad-options";
import { diecutImage, editImage, getPhotoroomMode } from "@/lib/photoroom";
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
  studioStyle: "scene" | "diecut";
  photoroomMode: string;
};

export type BuiltAdImage = BuiltStudioImage & {
  adCopy: AdCopyContent;
  adBrief: AdBrief;
};

export async function buildStudioImage(
  inputImageUrl: string,
  backgroundId: string,
  customBackgroundPrompt?: string,
): Promise<BuiltStudioImage> {
  const background =
    backgroundId === BACKGROUND_CUSTOM_ID
      ? await resolveBackgroundAsync(backgroundId, customBackgroundPrompt)
      : resolveBackground(backgroundId, customBackgroundPrompt);

  const png = await editImage({
    imageUrl: inputImageUrl,
    backgroundPrompt: background.prompt,
    padding: 0.12,
  });

  return {
    png,
    backgroundId: background.id,
    studioStyle: "scene",
    photoroomMode: getPhotoroomMode(),
  };
}

export async function buildDiecutImage(
  inputImageUrl: string,
): Promise<BuiltStudioImage> {
  const png = await diecutImage({
    imageUrl: inputImageUrl,
    padding: 0.05,
  });

  return {
    png,
    backgroundId: "diecut",
    studioStyle: "diecut",
    photoroomMode: getPhotoroomMode(),
  };
}

export async function buildAdImage(
  inputImageUrl: string,
  choices: AdChoices,
): Promise<BuiltAdImage> {
  const brief = await resolveAdBrief(choices, inputImageUrl);
  const adCopy = briefToAdCopy(brief);

  const productCutout = await diecutImage({
    imageUrl: inputImageUrl,
    padding: 0.06,
  });

  const brandPalette = await extractBrandColors(productCutout);

  const png = await compositeAdPost(
    productCutout,
    adCopy,
    brief.templateId,
    {
      backgroundId: brief.backgroundId,
      category: brief.category,
      brandPalette,
    },
  );

  return {
    png,
    backgroundId: brief.backgroundId,
    studioStyle: "scene",
    photoroomMode: getPhotoroomMode(),
    adCopy,
    adBrief: brief,
  };
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
    choices: {
      backgroundId: built.backgroundId,
      studioStyle: built.studioStyle,
    },
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
    choices: {
      backgroundId: built.backgroundId,
      adCopy: built.adCopy,
      adBrief: built.adBrief,
    },
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
