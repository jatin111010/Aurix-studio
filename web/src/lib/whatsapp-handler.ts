import { BACKGROUND_CUSTOM_ID, type PlanId } from "@/lib/config";
import {
  resolveBackground,
} from "@/lib/backgrounds";
import {
  getAdChoices,
  handleAdCustomBackgroundText,
  handleAdHeadlineText,
  handleAdMessageText,
  handleAdReply,
  askAdConfirm,
  askAdCustomBackground,
  startAdInterview,
} from "@/lib/ad-whatsapp";
import {
  abortStuckGeneration,
  getOrCreateConversation,
  isGenerationStale,
  markGenerating,
  resetConversation,
  updateConversation,
  type ConversationRow,
} from "@/lib/conversation";
import {
  AdPaywallError,
  PaywallError,
  buildAdImage,
  checkAdCredit,
  saveAdGeneration,
} from "@/lib/generation";
import {
  handleStudioReply,
  handleStudioText,
  resumeStudioAfterStale,
  STUDIO_STEPS,
  startStudioExperience,
  studioGenerationErrorStep,
} from "@/lib/studio-whatsapp";
import { getStudioChoices } from "@/lib/studio-options";
import {
  formatQuotaMessage,
  getUserQuota,
  handlePlanSelection,
  sendAdPaywallMessage,
  sendPaywallMessage,
  sendPlansMenu,
} from "@/lib/paywall";
import { uploadInputImage, uploadOutputPng } from "@/lib/storage";
import { getUserLanguage, resolveLanguage, setUserLanguage } from "@/lib/user-prefs";
import { canGenerate, getOrCreateUserByPhone } from "@/lib/users";
import {
  DEFAULT_LANG,
  detectLanguage,
  isVeloraLang,
  say,
  type VeloraLang,
} from "@/lib/velora-voice";
import {
  downloadMedia,
  mimeToExt,
  sendButtons,
  sendImagePng,
  sendList,
  sendText,
} from "@/lib/whatsapp";

type WhatsAppMessage = {
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
};

type GenerationMode = "studio" | "ad";

const PLAN_IDS: PlanId[] = ["starter", "growth", "pro"];

const AD_STEPS = new Set([
  "ad_awaiting_style",
  "ad_awaiting_purpose",
  "ad_awaiting_offer",
  "ad_awaiting_cta",
  "ad_awaiting_headline_mode",
  "ad_awaiting_headline_text",
  "ad_awaiting_message_mode",
  "ad_awaiting_message_text",
  "ad_awaiting_background",
  "ad_awaiting_confirm",
]);

function parseBackgroundId(replyId: string): string | null {
  if (!replyId.startsWith("bg_")) return null;
  const id = replyId.slice(3);
  return id === BACKGROUND_CUSTOM_ID ||
    [
      "marble",
      "wood",
      "studio",
      "sunlight",
      "luxury",
      "pastel",
      "concrete",
      "nature",
      "festive",
    ].includes(id)
    ? id
    : null;
}

function parsePlanId(replyId: string): PlanId | null {
  if (!replyId.startsWith("plan_")) return null;
  const id = replyId.slice(5) as PlanId;
  return PLAN_IDS.includes(id) ? id : null;
}

function parseModeId(replyId: string): GenerationMode | null {
  if (replyId === "mode_studio") return "studio";
  if (replyId === "mode_ad") return "ad";
  return null;
}

function parseLangId(replyId: string): VeloraLang | null {
  if (replyId === "lang_en") return "en";
  if (replyId === "lang_hi") return "hi";
  if (replyId === "lang_hinglish") return "hinglish";
  return null;
}

function langFromChoices(choices: Record<string, unknown>): VeloraLang {
  return isVeloraLang(choices.lang) ? choices.lang : DEFAULT_LANG;
}

function getReplyId(message: WhatsAppMessage): string | null {
  return (
    message.interactive?.button_reply?.id ??
    message.interactive?.list_reply?.id ??
    null
  );
}

function isCancelMessage(body: string): boolean {
  const lower = body.trim().toLowerCase();
  return (
    ["cancel", "reset", "restart", "stop", "abort", "quit", "exit"].includes(
      lower,
    ) ||
    lower === "start over" ||
    lower.includes("cancel karo") ||
    lower.includes("start over")
  );
}

async function recoverStaleGenerationIfNeeded(
  to: string,
  conversation: ConversationRow,
): Promise<ConversationRow> {
  if (!isGenerationStale(conversation)) return conversation;

  const lang = langFromChoices(conversation.choices);
  const step = await abortStuckGeneration(conversation.id, conversation.choices);
  const cleaned = stripGeneratingMeta(conversation.choices);
  await sendText(to, say(lang, "err_generation_timed_out"));

  const resumed = await resumeStudioAfterStale(
    to,
    conversation.id,
    step,
    cleaned,
  );
  if (!resumed) {
    if (step === "awaiting_mode" && conversation.input_image_url) {
      await continueAfterPhoto(to, conversation.id, lang);
    } else if (step === "ad_awaiting_confirm") {
      await askAdConfirm(to, conversation.id, getAdChoices(cleaned));
    }
  }

  return {
    ...conversation,
    step,
    choices: cleaned,
  };
}

function stripGeneratingMeta(
  choices: Record<string, unknown>,
): Record<string, unknown> {
  const {
    generatingStartedAt: _a,
    preGeneratingStep: _b,
    ...rest
  } = choices;
  return rest;
}

async function sendWelcome(
  to: string,
  userId: string,
  lang: VeloraLang = DEFAULT_LANG,
): Promise<void> {
  const quota = await getUserQuota(userId);

  if (quota.studioBalance > 0 || quota.adBalance > 0) {
    await sendText(
      to,
      say(lang, "welcome_back", { quota: formatQuotaMessage(quota) }),
    );
    return;
  }

  if (quota.freeRemaining > 0) {
    await sendText(
      to,
      say(lang, "welcome_new", { quota: formatQuotaMessage(quota) }),
    );
    return;
  }

  await sendText(
    to,
    say(lang, "welcome_paywall", { quota: formatQuotaMessage(quota) }),
  );
}

async function askLanguage(
  to: string,
  conversationId: string,
  inputUrl: string,
): Promise<void> {
  await updateConversation(conversationId, {
    step: "awaiting_language",
    input_image_url: inputUrl,
    choices: {},
  });

  await sendText(to, say(DEFAULT_LANG, "ask_language"));
  await sendButtons(to, "Language / भाषा", [
    { id: "lang_hinglish", title: "Hinglish" },
    { id: "lang_hi", title: "हिंदी" },
    { id: "lang_en", title: "English" },
  ]);
}

async function continueAfterPhoto(
  to: string,
  conversationId: string,
  lang: VeloraLang,
): Promise<void> {
  await updateConversation(conversationId, {
    step: "awaiting_mode",
    choices: { lang },
  });
  await sendText(to, say(lang, "photo_received"));
  await askMode(to, lang);
}

async function askMode(to: string, lang: VeloraLang): Promise<void> {
  await sendButtons(to, say(lang, "ask_mode"), [
    { id: "mode_studio", title: "Studio shot" },
    { id: "mode_ad", title: "Social ad post" },
  ]);
}

async function handleModeChoice(
  to: string,
  userId: string,
  conversationId: string,
  mode: GenerationMode,
  lang: VeloraLang,
  inputImageUrl: string,
): Promise<void> {
  if (mode === "ad") {
    const adCheck = await canGenerate(userId, "ad");
    if (!adCheck.ok) {
      await sendAdPaywallMessage(to, userId, lang);
      return;
    }
    await startAdInterview(to, conversationId, lang);
    return;
  }

  await startStudioExperience(to, userId, conversationId, inputImageUrl, lang);
}

async function handleImage(
  to: string,
  userId: string,
  conversationId: string,
  mediaId: string,
): Promise<void> {
  const lang = await resolveLanguage(userId, {});
  const studioCheck = await canGenerate(userId, "studio");
  if (!studioCheck.ok) {
    await sendPaywallMessage(to, userId, lang);
    return;
  }

  const { buffer, mimeType } = await downloadMedia(mediaId);
  const ext = mimeToExt(mimeType);
  const inputUrl = await uploadInputImage(userId, buffer, mimeType, ext);

  const userLang = await getUserLanguage(userId);

  if (userLang) {
    await updateConversation(conversationId, {
      input_image_url: inputUrl,
    });
    await continueAfterPhoto(to, conversationId, userLang);
    return;
  }

  await askLanguage(to, conversationId, inputUrl);
}

async function handleLanguageChoice(
  to: string,
  userId: string,
  conversationId: string,
  lang: VeloraLang,
): Promise<void> {
  await setUserLanguage(userId, lang);
  await continueAfterPhoto(to, conversationId, lang);
}

async function handleAdBackgroundPick(
  to: string,
  conversationId: string,
  backgroundId: string,
  choices: Record<string, unknown>,
): Promise<void> {
  const adChoices = getAdChoices({
    ...choices,
    backgroundId,
  });
  await askAdConfirm(to, conversationId, adChoices);
}

async function handleAdGenerate(
  to: string,
  userId: string,
  conversationId: string,
  inputImageUrl: string,
  choices: Record<string, unknown>,
): Promise<void> {
  const adChoices = getAdChoices(choices);
  const lang = langFromChoices(adChoices);
  const backgroundId = adChoices.backgroundId;
  if (!backgroundId) {
    await sendText(
      to,
      lang === "hi"
        ? "Pehle background choose karein."
        : "Please pick a background first.",
    );
    return;
  }

  await updateConversation(conversationId, {
    step: "generating",
    choices: markGenerating(adChoices, "ad_awaiting_confirm"),
  });

  await sendText(to, say(lang, "ad_generating"));

  try {
    const credit = await checkAdCredit(userId);
    const built = await buildAdImage(inputImageUrl, adChoices);
    const outputUrl = await uploadOutputPng(userId, built.png);
    const background = resolveBackground(
      backgroundId,
      adChoices.customBackgroundPrompt,
    );

    await sendImagePng(
      to,
      built.png,
      [
        `Velora Ad — ${built.adCopy.headline}`,
        built.adCopy.badge,
        `${background.label} · ${built.adBrief.templateId} style`,
        built.photoroomMode === "sandbox" ? "(sandbox preview)" : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );

    await saveAdGeneration(userId, inputImageUrl, outputUrl, built, credit);
    await finishGeneration(to, userId, conversationId, lang);
  } catch (error) {
    await handleGenerationError(to, userId, conversationId, error, adChoices);
  }
}

async function finishGeneration(
  to: string,
  userId: string,
  conversationId: string,
  lang: VeloraLang = DEFAULT_LANG,
): Promise<void> {
  await resetConversation(conversationId);

  const updatedQuota = await getUserQuota(userId);
  const canStudio =
    updatedQuota.freeRemaining > 0 || updatedQuota.studioBalance > 0;
  const canAd = updatedQuota.adBalance > 0;

  if (canStudio || canAd) {
    await sendText(
      to,
      say(lang, "done_more", { quota: formatQuotaMessage(updatedQuota) }),
    );
  } else {
    await sendPaywallMessage(to, userId, lang);
  }
}

async function handleGenerationError(
  to: string,
  userId: string,
  conversationId: string,
  error: unknown,
  choices: Record<string, unknown>,
): Promise<void> {
  const step =
    choices.mode === "ad"
      ? choices.backgroundId === BACKGROUND_CUSTOM_ID
        ? "ad_awaiting_custom_background"
        : "ad_awaiting_confirm"
      : studioGenerationErrorStep(getStudioChoices(choices));

  await updateConversation(conversationId, { step, choices });

  if (error instanceof AdPaywallError) {
    await sendAdPaywallMessage(to, userId, langFromChoices(choices));
    return;
  }

  if (error instanceof PaywallError) {
    await sendPaywallMessage(to, userId, langFromChoices(choices));
    return;
  }

  console.error("Generation failed", error);
  await sendText(to, say(langFromChoices(choices), "err_generation_failed"));
}

async function handleText(
  to: string,
  userId: string,
  step: string,
  body: string,
  conversationId: string,
  choices: Record<string, unknown>,
  inputImageUrl: string | null,
): Promise<void> {
  const lang = await resolveLanguage(userId, choices, body);
  const lower = body.trim().toLowerCase();

  const detected = detectLanguage(body);
  if (detected) {
    await setUserLanguage(userId, detected);
  }

  if (["balance", "credits", "quota", "status"].includes(lower)) {
    await sendText(to, formatQuotaMessage(await getUserQuota(userId)));
    return;
  }

  if (["plans", "subscribe", "pricing", "plan", "pay"].includes(lower)) {
    await sendPlansMenu(to, lang);
    return;
  }

  if (
    ["hi", "hello", "hey", "start", "help", "namaste", "namaskar"].includes(
      lower,
    ) ||
    lower === "now"
  ) {
    await sendWelcome(to, userId, lang);
    return;
  }

  if (step === "ad_awaiting_headline_text") {
    await handleAdHeadlineText(to, conversationId, body, { ...choices, lang });
    return;
  }

  if (step === "ad_awaiting_message_text") {
    await handleAdMessageText(to, conversationId, body, { ...choices, lang });
    return;
  }

  if (step === "ad_awaiting_custom_background") {
    await handleAdCustomBackgroundText(to, conversationId, body, {
      ...choices,
      lang,
    });
    return;
  }

  if (STUDIO_STEPS.has(step) && inputImageUrl) {
    const handled = await handleStudioText(
      to,
      userId,
      conversationId,
      body,
      choices,
      inputImageUrl,
      step,
    );
    if (handled) return;
  }

  if (step === "ad_awaiting_confirm") {
    await sendText(to, say(lang, "err_pick_option"));
    return;
  }

  if (AD_STEPS.has(step)) {
    await sendText(to, say(lang, "err_pick_option"));
    return;
  }

  if (
    lower.includes("where") ||
    lower.includes("post") ||
    lower === "???" ||
    lower.includes("image")
  ) {
    await sendText(to, say(lang, "hint_balance"));
    return;
  }

  if (step === "awaiting_mode" || step === "awaiting_language") {
    await sendText(to, say(lang, "err_pick_option"));
    return;
  }

  if (step === "generating") {
    if (isCancelMessage(body)) {
      const stepAfter = await abortStuckGeneration(conversationId, choices);
      await sendText(to, say(lang, "err_generation_cancelled"));
      if (stepAfter === "awaiting_mode" && inputImageUrl) {
        await continueAfterPhoto(to, conversationId, lang);
      }
      return;
    }
    await sendText(to, say(lang, "err_generating_wait"));
    return;
  }

  await sendText(to, say(lang, "hint_balance"));
}

export async function processWhatsAppMessage(
  message: WhatsAppMessage,
): Promise<void> {
  const from = message.from;
  if (!from) return;

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error("Supabase not configured");
    return;
  }

  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    console.error("WhatsApp not configured");
    return;
  }

  if (!process.env.PHOTOROOM_API_KEY) {
    await sendText(
      from,
      "Velora Studio is still being set up (Photoroom API). Please try again shortly.",
    );
    return;
  }

  const user = await getOrCreateUserByPhone(from);
  let conversation = await recoverStaleGenerationIfNeeded(
    from,
    await getOrCreateConversation(user.id),
  );
  const replyId = getReplyId(message);
  const lang = await resolveLanguage(
    user.id,
    conversation.choices,
    message.text?.body,
  );

  if (replyId) {
    if (replyId === "plans_menu") {
      await sendPlansMenu(from, lang);
      return;
    }

    const langChoice = parseLangId(replyId);
    if (
      langChoice &&
      conversation.step === "awaiting_language" &&
      conversation.input_image_url
    ) {
      await handleLanguageChoice(
        from,
        user.id,
        conversation.id,
        langChoice,
      );
      return;
    }

    const planId = parsePlanId(replyId);
    if (planId) {
      await handlePlanSelection(from, user.id, planId);
      return;
    }

    if (STUDIO_STEPS.has(conversation.step) && conversation.input_image_url) {
      const handled = await handleStudioReply(
        from,
        user.id,
        conversation.id,
        replyId,
        conversation.choices,
        conversation.input_image_url,
      );
      if (handled) return;
    }

    if (AD_STEPS.has(conversation.step)) {
      if (
        replyId === "ad_confirm_generate" &&
        conversation.step === "ad_awaiting_confirm" &&
        conversation.input_image_url
      ) {
        await handleAdGenerate(
          from,
          user.id,
          conversation.id,
          conversation.input_image_url,
          conversation.choices,
        );
        return;
      }

      const handled = await handleAdReply(
        from,
        conversation.id,
        replyId,
        conversation.choices,
      );
      if (handled) return;
    }

    const mode = parseModeId(replyId);
    if (
      mode &&
      conversation.input_image_url &&
      conversation.step === "awaiting_mode"
    ) {
      await handleModeChoice(
        from,
        user.id,
        conversation.id,
        mode,
        langFromChoices(conversation.choices),
        conversation.input_image_url,
      );
      return;
    }

    const backgroundId = parseBackgroundId(replyId);
    if (backgroundId && conversation.input_image_url) {
      const flowLang = langFromChoices(conversation.choices);
      if (conversation.step === "generating") {
        await sendText(from, say(flowLang, "err_generating_wait"));
        return;
      }

      if (conversation.step === "ad_awaiting_background") {
        if (backgroundId === BACKGROUND_CUSTOM_ID) {
          await askAdCustomBackground(
            from,
            conversation.id,
            getAdChoices(conversation.choices),
          );
          return;
        }

        await handleAdBackgroundPick(
          from,
          conversation.id,
          backgroundId,
          conversation.choices,
        );
        return;
      }
    }
  }

  if (message.type === "image" && message.image?.id) {
    if (conversation.step === "generating") {
      await sendText(from, say(langFromChoices(conversation.choices), "err_generating_wait"));
      return;
    }
    await handleImage(from, user.id, conversation.id, message.image.id);
    return;
  }

  if (message.type === "text" && message.text?.body) {
    await handleText(
      from,
      user.id,
      conversation.step,
      message.text.body,
      conversation.id,
      conversation.choices,
      conversation.input_image_url,
    );
    return;
  }

  await sendText(
    from,
    "Send a product photo (JPG or PNG) to get started, or type *balance*.",
  );
}

export async function processWhatsAppWebhook(payload: unknown): Promise<void> {
  const entry = (payload as { entry?: { changes?: { value?: { messages?: WhatsAppMessage[] } }[] }[] })
    ?.entry?.[0];
  const changes = entry?.changes?.[0];
  const messages = changes?.value?.messages ?? [];

  for (const message of messages) {
    try {
      await processWhatsAppMessage(message);
    } catch (error) {
      console.error("WhatsApp message handler error", error);
      const from = message.from;
      if (from) {
        try {
          await sendText(
            from,
            "Something went wrong on our side. Please try again in a moment.",
          );
        } catch {
          // ignore
        }
      }
    }
  }
}
