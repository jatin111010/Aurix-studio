import type { AdTemplateId } from "@/lib/ad-templates";
import { updateConversation } from "@/lib/conversation";
import {
  backgroundListRows,
  getBackgroundDisplayLabel,
  sanitizeCustomBackgroundPrompt,
} from "@/lib/backgrounds";
import {
  AD_CTAS,
  AD_OFFERS,
  AD_PURPOSES,
  AD_STYLES,
  getCtaText,
  getOfferBadge,
  getPurposeLabel,
  getStyleLabel,
  type AdChoices,
} from "@/lib/ad-options";
import {
  adStepIntro,
  DEFAULT_LANG,
  isVeloraLang,
  say,
  type VeloraLang,
} from "@/lib/velora-voice";
import { sendButtons, sendList, sendText } from "@/lib/whatsapp";

const TOTAL_STEPS = 8;

export function getAdChoices(choices: Record<string, unknown>): AdChoices {
  return { mode: "ad", ...choices } as AdChoices;
}

function langOf(choices: AdChoices | Record<string, unknown>): VeloraLang {
  return isVeloraLang(choices.lang) ? choices.lang : DEFAULT_LANG;
}

function stepLine(lang: VeloraLang, n: number, question: string): string {
  return `${adStepIntro(lang, n, TOTAL_STEPS)}${question}`;
}

export async function startAdInterview(
  to: string,
  conversationId: string,
  lang: VeloraLang = DEFAULT_LANG,
): Promise<void> {
  await updateConversation(conversationId, {
    step: "ad_awaiting_style",
    choices: { mode: "ad", lang },
  });

  await sendText(to, say(lang, "ad_start"));

  await sendList(
    to,
    stepLine(lang, 1, say(lang, "ad_style")),
    "Choose style",
    AD_STYLES.map((s) => ({
      id: `ad_style_${s.id}`,
      title: s.label,
      description: s.description,
    })),
  );
}

export async function askAdPurpose(
  to: string,
  conversationId: string,
  choices: AdChoices,
): Promise<void> {
  const lang = langOf(choices);
  await updateConversation(conversationId, {
    step: "ad_awaiting_purpose",
    choices,
  });

  await sendList(
    to,
    stepLine(lang, 2, say(lang, "ad_purpose")),
    "Choose purpose",
    AD_PURPOSES.map((p) => ({
      id: `ad_purpose_${p.id}`,
      title: p.label,
      description: p.description,
    })),
  );
}

export async function askAdOffer(
  to: string,
  conversationId: string,
  choices: AdChoices,
): Promise<void> {
  const lang = langOf(choices);
  await updateConversation(conversationId, {
    step: "ad_awaiting_offer",
    choices,
  });

  await sendList(
    to,
    stepLine(lang, 3, say(lang, "ad_offer")),
    "Choose offer",
    AD_OFFERS.map((o) => ({
      id: `ad_offer_${o.id}`,
      title: o.label,
      description: o.badge || "No badge on image",
    })),
  );
}

export async function askAdCta(
  to: string,
  conversationId: string,
  choices: AdChoices,
): Promise<void> {
  const lang = langOf(choices);
  await updateConversation(conversationId, {
    step: "ad_awaiting_cta",
    choices,
  });

  await sendList(
    to,
    stepLine(lang, 4, say(lang, "ad_cta")),
    "Choose CTA",
    AD_CTAS.map((c) => ({
      id: `ad_cta_${c.id}`,
      title: c.label,
      description: c.text,
    })),
  );
}

export async function askAdHeadlineMode(
  to: string,
  conversationId: string,
  choices: AdChoices,
): Promise<void> {
  const lang = langOf(choices);
  await updateConversation(conversationId, {
    step: "ad_awaiting_headline_mode",
    choices,
  });

  await sendButtons(to, stepLine(lang, 5, say(lang, "ad_headline_mode")), [
    { id: "ad_headline_ai", title: "You write it" },
    { id: "ad_headline_custom", title: "I'll type mine" },
  ]);
}

export async function askAdHeadlineText(
  to: string,
  conversationId: string,
  choices: AdChoices,
): Promise<void> {
  const lang = langOf(choices);
  await updateConversation(conversationId, {
    step: "ad_awaiting_headline_text",
    choices: { ...choices, headlineMode: "custom" },
  });

  await sendText(to, say(lang, "ad_headline_text"));
}

export async function askAdMessageMode(
  to: string,
  conversationId: string,
  choices: AdChoices,
): Promise<void> {
  const lang = langOf(choices);
  await updateConversation(conversationId, {
    step: "ad_awaiting_message_mode",
    choices,
  });

  await sendButtons(to, stepLine(lang, 6, say(lang, "ad_message_mode")), [
    { id: "ad_message_ai", title: "You write it" },
    { id: "ad_message_custom", title: "I'll type mine" },
    { id: "ad_message_short", title: "Keep it short" },
  ]);
}

export async function askAdMessageText(
  to: string,
  conversationId: string,
  choices: AdChoices,
): Promise<void> {
  const lang = langOf(choices);
  await updateConversation(conversationId, {
    step: "ad_awaiting_message_text",
    choices: { ...choices, messageMode: "custom" },
  });

  await sendText(to, say(lang, "ad_message_text"));
}

export async function askAdBackground(
  to: string,
  conversationId: string,
  choices: AdChoices,
): Promise<void> {
  const lang = langOf(choices);
  await updateConversation(conversationId, {
    step: "ad_awaiting_background",
    choices,
  });

  await sendList(
    to,
    stepLine(lang, 7, say(lang, "ad_background")),
    "Choose background",
    backgroundListRows(),
  );
}

function describeHeadline(choices: AdChoices, lang: VeloraLang): string {
  if (choices.headlineMode === "custom" && choices.headline) {
    return choices.headline;
  }
  if (lang === "hi") return "मैं आपके choices से लिखूँगी";
  if (lang === "hinglish") return "Main aapke choices se likhungi";
  return "I'll write from your choices";
}

function describeMessage(choices: AdChoices, lang: VeloraLang): string {
  if (choices.messageMode === "custom" && choices.subheadline) {
    return choices.subheadline;
  }
  if (choices.messageMode === "short") {
    if (lang === "hi") return "छोटा tagline";
    if (lang === "hinglish") return "Short tagline";
    return "Short tagline";
  }
  if (lang === "hi") return "मैं आपके choices से लिखूँगी";
  if (lang === "hinglish") return "Main aapke choices se likhungi";
  return "I'll write from your choices";
}

export function formatAdSummary(choices: AdChoices): string {
  const lang = langOf(choices);
  const badge = getOfferBadge(choices.offerId);
  const bg = getBackgroundDisplayLabel(
    choices.backgroundId,
    choices.customBackgroundPrompt,
  );

  return [
    say(lang, "ad_summary_title"),
    "",
    `• Look: ${getStyleLabel(choices.templateId)}`,
    `• About: ${getPurposeLabel(choices.purposeId)}`,
    `• Offer: ${badge || (lang === "hi" ? "कोई नहीं" : lang === "hinglish" ? "Koi nahi" : "None")}`,
    `• Button: ${getCtaText(choices.ctaId)}`,
    `• Headline: ${describeHeadline(choices, lang)}`,
    `• Message: ${describeMessage(choices, lang)}`,
    `• Background: ${bg}`,
  ].join("\n");
}

export async function askAdConfirm(
  to: string,
  conversationId: string,
  choices: AdChoices,
): Promise<void> {
  const lang = langOf(choices);
  await updateConversation(conversationId, {
    step: "ad_awaiting_confirm",
    choices,
  });

  await sendText(to, formatAdSummary(choices));
  await sendButtons(to, stepLine(lang, 8, say(lang, "ad_confirm")), [
    { id: "ad_confirm_generate", title: "Create ad" },
    { id: "ad_confirm_restart", title: "Start over" },
  ]);
}

export async function askAdCustomBackground(
  to: string,
  conversationId: string,
  choices: AdChoices,
): Promise<void> {
  const lang = langOf(choices);
  await updateConversation(conversationId, {
    step: "ad_awaiting_custom_background",
    choices: { ...choices, backgroundId: "custom" },
  });

  await sendText(to, say(lang, "ad_custom_background"));
}

export async function handleAdCustomBackgroundText(
  to: string,
  conversationId: string,
  text: string,
  choices: Record<string, unknown>,
): Promise<void> {
  const ad = getAdChoices(choices);
  const lang = langOf(ad);
  const prompt = sanitizeCustomBackgroundPrompt(text);
  if (!prompt) {
    await sendText(to, say(lang, "err_scene_short"));
    return;
  }

  await askAdConfirm(to, conversationId, {
    ...ad,
    backgroundId: "custom",
    customBackgroundPrompt: prompt,
  });
}

export function parseAdStyleId(replyId: string): AdTemplateId | null {
  if (!replyId.startsWith("ad_style_")) return null;
  const raw = replyId.slice(9);
  const id = (raw === "bold" ? "electronics" : raw) as AdTemplateId;
  return AD_STYLES.some((s) => s.id === id) ? id : null;
}

export function parseAdPurposeId(replyId: string): string | null {
  if (!replyId.startsWith("ad_purpose_")) return null;
  const id = replyId.slice(11);
  return AD_PURPOSES.some((p) => p.id === id) ? id : null;
}

export function parseAdOfferId(replyId: string): string | null {
  if (!replyId.startsWith("ad_offer_")) return null;
  const id = replyId.slice(9);
  return AD_OFFERS.some((o) => o.id === id) ? id : null;
}

export function parseAdCtaId(replyId: string): string | null {
  if (!replyId.startsWith("ad_cta_")) return null;
  const id = replyId.slice(7);
  return AD_CTAS.some((c) => c.id === id) ? id : null;
}

export async function handleAdReply(
  to: string,
  conversationId: string,
  replyId: string,
  choices: Record<string, unknown>,
): Promise<boolean> {
  const ad = getAdChoices(choices);

  const styleId = parseAdStyleId(replyId);
  if (styleId) {
    await askAdPurpose(to, conversationId, { ...ad, templateId: styleId });
    return true;
  }

  const purposeId = parseAdPurposeId(replyId);
  if (purposeId) {
    await askAdOffer(to, conversationId, { ...ad, purposeId });
    return true;
  }

  const offerId = parseAdOfferId(replyId);
  if (offerId) {
    await askAdCta(to, conversationId, { ...ad, offerId });
    return true;
  }

  const ctaId = parseAdCtaId(replyId);
  if (ctaId) {
    await askAdHeadlineMode(to, conversationId, { ...ad, ctaId });
    return true;
  }

  if (replyId === "ad_headline_ai") {
    await askAdMessageMode(to, conversationId, {
      ...ad,
      headlineMode: "ai",
    });
    return true;
  }

  if (replyId === "ad_headline_custom") {
    await askAdHeadlineText(to, conversationId, ad);
    return true;
  }

  if (replyId === "ad_message_ai") {
    await askAdBackground(to, conversationId, {
      ...ad,
      messageMode: "ai",
    });
    return true;
  }

  if (replyId === "ad_message_custom") {
    await askAdMessageText(to, conversationId, ad);
    return true;
  }

  if (replyId === "ad_message_short") {
    await askAdBackground(to, conversationId, {
      ...ad,
      messageMode: "short",
    });
    return true;
  }

  if (replyId === "ad_confirm_generate") {
    return false;
  }

  if (replyId === "ad_confirm_restart") {
    await startAdInterview(to, conversationId, langOf(ad));
    return true;
  }

  return false;
}

export async function handleAdHeadlineText(
  to: string,
  conversationId: string,
  text: string,
  choices: Record<string, unknown>,
): Promise<void> {
  const ad = getAdChoices(choices);
  const lang = langOf(ad);
  const headline = text.trim().slice(0, 80);
  if (headline.length < 3) {
    await sendText(to, say(lang, "err_headline_short"));
    return;
  }

  await askAdMessageMode(to, conversationId, {
    ...ad,
    headlineMode: "custom",
    headline,
  });
}

export async function handleAdMessageText(
  to: string,
  conversationId: string,
  text: string,
  choices: Record<string, unknown>,
): Promise<void> {
  const ad = getAdChoices(choices);
  const lang = langOf(ad);
  const subheadline = text.trim().slice(0, 120);
  if (subheadline.length < 3) {
    await sendText(to, say(lang, "err_message_short"));
    return;
  }

  await askAdBackground(to, conversationId, {
    ...ad,
    messageMode: "custom",
    subheadline,
  });
}
