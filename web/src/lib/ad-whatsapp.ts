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
import { sendButtons, sendList, sendText } from "@/lib/whatsapp";

const TOTAL_STEPS = 8;

export function getAdChoices(choices: Record<string, unknown>): AdChoices {
  return { mode: "ad", ...choices } as AdChoices;
}

function stepLabel(n: number, text: string): string {
  return `Step ${n}/${TOTAL_STEPS} — ${text}`;
}

export async function startAdInterview(
  to: string,
  conversationId: string,
): Promise<void> {
  await updateConversation(conversationId, {
    step: "ad_awaiting_style",
    choices: { mode: "ad" },
  });

  await sendText(
    to,
    "Let's design your ad post together. I'll ask what to *show* and *how* — just tap your choices below.",
  );

  await sendList(
    to,
    stepLabel(1, "What *look & presence* do you want?"),
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
  await updateConversation(conversationId, {
    step: "ad_awaiting_purpose",
    choices,
  });

  await sendList(
    to,
    stepLabel(2, "What is this ad *about*?"),
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
  await updateConversation(conversationId, {
    step: "ad_awaiting_offer",
    choices,
  });

  await sendList(
    to,
    stepLabel(3, "What *offer* should appear on the image?"),
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
  await updateConversation(conversationId, {
    step: "ad_awaiting_cta",
    choices,
  });

  await sendList(
    to,
    stepLabel(4, "How should customers *take action*? (button text)"),
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
  await updateConversation(conversationId, {
    step: "ad_awaiting_headline_mode",
    choices,
  });

  await sendButtons(to, stepLabel(5, "How should we write the *headline*?"), [
    { id: "ad_headline_ai", title: "AI writes it" },
    { id: "ad_headline_custom", title: "I'll type my own" },
  ]);
}

export async function askAdHeadlineText(
  to: string,
  conversationId: string,
  choices: AdChoices,
): Promise<void> {
  await updateConversation(conversationId, {
    step: "ad_awaiting_headline_text",
    choices: { ...choices, headlineMode: "custom" },
  });

  await sendText(
    to,
    "Type your *headline* (one short line, max ~10 words).\n\nExample: *Premium Kaju — Farm Fresh Quality*",
  );
}

export async function askAdMessageMode(
  to: string,
  conversationId: string,
  choices: AdChoices,
): Promise<void> {
  await updateConversation(conversationId, {
    step: "ad_awaiting_message_mode",
    choices,
  });

  await sendButtons(
    to,
    stepLabel(6, "What *message* should we share under the headline?"),
    [
      { id: "ad_message_ai", title: "AI writes it" },
      { id: "ad_message_custom", title: "I'll type my own" },
      { id: "ad_message_short", title: "Keep it minimal" },
    ],
  );
}

export async function askAdMessageText(
  to: string,
  conversationId: string,
  choices: AdChoices,
): Promise<void> {
  await updateConversation(conversationId, {
    step: "ad_awaiting_message_text",
    choices: { ...choices, messageMode: "custom" },
  });

  await sendText(
    to,
    "Type the *key message* you want customers to read (one line).\n\nExample: *Order today — free delivery in your city*",
  );
}

export async function askAdBackground(
  to: string,
  conversationId: string,
  choices: AdChoices,
): Promise<void> {
  await updateConversation(conversationId, {
    step: "ad_awaiting_background",
    choices,
  });

  await sendList(
    to,
    stepLabel(7, "Pick a *product background* for the photo in your ad:"),
    "Choose background",
    backgroundListRows(),
  );
}

function describeHeadline(choices: AdChoices): string {
  if (choices.headlineMode === "custom" && choices.headline) {
    return choices.headline;
  }
  return "AI will write from your choices";
}

function describeMessage(choices: AdChoices): string {
  if (choices.messageMode === "custom" && choices.subheadline) {
    return choices.subheadline;
  }
  if (choices.messageMode === "short") {
    return "Short tagline only";
  }
  return "AI will write from your choices";
}

export function formatAdSummary(choices: AdChoices): string {
  const badge = getOfferBadge(choices.offerId);
  const bg = getBackgroundDisplayLabel(
    choices.backgroundId,
    choices.customBackgroundPrompt,
  );

  return [
    "*Your ad — review before we create it:*",
    "",
    `• Look: ${getStyleLabel(choices.templateId)}`,
    `• About: ${getPurposeLabel(choices.purposeId)}`,
    `• Offer on image: ${badge || "None"}`,
    `• Button: ${getCtaText(choices.ctaId)}`,
    `• Headline: ${describeHeadline(choices)}`,
    `• Message: ${describeMessage(choices)}`,
    `• Product background: ${bg}`,
  ].join("\n");
}

export async function askAdConfirm(
  to: string,
  conversationId: string,
  choices: AdChoices,
): Promise<void> {
  await updateConversation(conversationId, {
    step: "ad_awaiting_confirm",
    choices,
  });

  await sendText(to, formatAdSummary(choices));
  await sendButtons(to, stepLabel(8, "Ready to create your ad?"), [
    { id: "ad_confirm_generate", title: "Generate ad" },
    { id: "ad_confirm_restart", title: "Start over" },
  ]);
}

export async function askAdCustomBackground(
  to: string,
  conversationId: string,
  choices: AdChoices,
): Promise<void> {
  await updateConversation(conversationId, {
    step: "ad_awaiting_custom_background",
    choices: { ...choices, backgroundId: "custom" },
  });

  await sendText(
    to,
    "Describe the *product background scene* you want in the ad.\n\nExamples:\n• *Rustic wooden kitchen counter*\n• *Soft blue gradient minimalist backdrop*\n• *Diwali marigold flowers and diyas*",
  );
}

export async function handleAdCustomBackgroundText(
  to: string,
  conversationId: string,
  text: string,
  choices: Record<string, unknown>,
): Promise<void> {
  const prompt = sanitizeCustomBackgroundPrompt(text);
  if (!prompt) {
    await sendText(
      to,
      "Please describe the scene in a few words (at least 5 characters).",
    );
    return;
  }

  const ad = getAdChoices(choices);
  await askAdConfirm(to, conversationId, {
    ...ad,
    backgroundId: "custom",
    customBackgroundPrompt: prompt,
  });
}

export function parseAdStyleId(replyId: string): AdTemplateId | null {
  if (!replyId.startsWith("ad_style_")) return null;
  const id = replyId.slice(9) as AdTemplateId;
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
    await startAdInterview(to, conversationId);
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
  const headline = text.trim().slice(0, 80);
  if (headline.length < 3) {
    await sendText(to, "Please send a slightly longer headline (at least 3 characters).");
    return;
  }

  const ad = getAdChoices(choices);
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
  const subheadline = text.trim().slice(0, 120);
  if (subheadline.length < 3) {
    await sendText(to, "Please send a slightly longer message (at least 3 characters).");
    return;
  }

  const ad = getAdChoices(choices);
  await askAdBackground(to, conversationId, {
    ...ad,
    messageMode: "custom",
    subheadline,
  });
}
