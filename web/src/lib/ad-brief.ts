import type { AdTemplateId } from "@/lib/ad-templates";
import {
  detectProductCategory,
  normalizeTemplateId,
  type ProductCategory,
} from "@/lib/ad-category";
import {
  getCtaText,
  getOfferBadge,
  getPurposeLabel,
  type AdChoices,
} from "@/lib/ad-options";
import { DEFAULT_LANG, isVeloraLang } from "@/lib/velora-voice";
import {
  generateAdCopyFromBrief,
  type AdCopyContent,
} from "@/lib/openai";

export type AdBrief = AdChoices & {
  templateId: AdTemplateId;
  purposeId: string;
  offerId: string;
  ctaId: string;
  headline: string;
  subheadline: string;
  offer: string;
  badge: string;
  cta: string;
  showBadge: boolean;
  backgroundId: string;
  customBackgroundPrompt?: string;
  category: ProductCategory;
};

export async function resolveAdBrief(
  choices: AdChoices,
  imageUrl?: string,
): Promise<AdBrief> {
  const templateId = normalizeTemplateId(choices.templateId);
  const purposeId = choices.purposeId ?? "daily";
  const offerId = choices.offerId ?? "20off";
  const ctaId = choices.ctaId ?? "whatsapp";
  const offer = getOfferBadge(offerId);
  const cta = getCtaText(ctaId);
  const showBadge = Boolean(offer);

  const category =
    imageUrl ? await detectProductCategory(imageUrl) : "general";

  let headline = choices.headline?.trim() ?? "";
  let subheadline = choices.subheadline?.trim() ?? "";

  const needsAiCopy =
    choices.headlineMode === "ai" ||
    choices.messageMode === "ai" ||
    !headline;

  if (needsAiCopy) {
    const generated: AdCopyContent = await generateAdCopyFromBrief({
      purpose: getPurposeLabel(purposeId),
      style: templateId,
      offer: showBadge ? offer : "",
      cta,
      category,
      lang: isVeloraLang(choices.lang) ? choices.lang : DEFAULT_LANG,
    });
    if (!headline || choices.headlineMode === "ai") {
      headline = generated.headline;
    }
    if (
      choices.messageMode === "ai" ||
      (!subheadline && choices.messageMode !== "custom")
    ) {
      subheadline = generated.subheadline;
    }
  }

  if (choices.messageMode === "short" && !subheadline) {
    subheadline = getPurposeLabel(purposeId);
  }

  if (!subheadline && choices.messageMode === "custom") {
    subheadline = `${getPurposeLabel(purposeId)} · Limited time`;
  }

  return {
    ...choices,
    mode: "ad",
    templateId,
    purposeId,
    offerId,
    ctaId,
    headline,
    subheadline,
    offer,
    badge: offer,
    cta,
    showBadge,
    backgroundId: choices.backgroundId ?? "studio",
    customBackgroundPrompt: choices.customBackgroundPrompt,
    category,
  };
}

export function briefToAdCopy(brief: AdBrief): AdCopyContent {
  return {
    headline: brief.headline,
    subheadline: brief.subheadline,
    offer: brief.showBadge ? brief.offer : "",
    badge: brief.showBadge ? brief.badge : "",
    cta: brief.cta,
  };
}
