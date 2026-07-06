import type { AdTemplateId } from "@/lib/ad-templates";
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
  badge: string;
  cta: string;
  showBadge: boolean;
  backgroundId: string;
  customBackgroundPrompt?: string;
};

export async function resolveAdBrief(choices: AdChoices): Promise<AdBrief> {
  const templateId = choices.templateId ?? "festival";
  const purposeId = choices.purposeId ?? "daily";
  const offerId = choices.offerId ?? "15off";
  const ctaId = choices.ctaId ?? "whatsapp";
  const badge = getOfferBadge(offerId);
  const cta = getCtaText(ctaId);
  const showBadge = Boolean(badge);

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
      badge: showBadge ? badge : "",
      cta,
      lang: isVeloraLang(choices.lang) ? choices.lang : DEFAULT_LANG,
    });
    if (!headline || choices.headlineMode === "ai") {
      headline = generated.headline;
    }
    if (choices.messageMode === "ai" || (!subheadline && choices.messageMode !== "custom")) {
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
    badge,
    cta,
    showBadge,
    backgroundId: choices.backgroundId ?? "studio",
    customBackgroundPrompt: choices.customBackgroundPrompt,
  };
}

export function briefToAdCopy(brief: AdBrief): AdCopyContent {
  return {
    headline: brief.headline,
    subheadline: brief.subheadline,
    badge: brief.showBadge ? brief.badge : "",
    cta: brief.cta,
  };
}
