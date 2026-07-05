import { BACKGROUND_CUSTOM_ID, type PlanId } from "@/lib/config";
import {
  backgroundListRows,
  isValidBackgroundId,
  resolveBackground,
  sanitizeCustomBackgroundPrompt,
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
  getOrCreateConversation,
  resetConversation,
  updateConversation,
} from "@/lib/conversation";
import {
  AdPaywallError,
  PaywallError,
  buildAdImage,
  buildDiecutImage,
  buildStudioImage,
  checkAdCredit,
  checkStudioCredit,
  saveAdGeneration,
  saveStudioGeneration,
} from "@/lib/generation";
import {
  formatQuotaMessage,
  getUserQuota,
  handlePlanSelection,
  sendAdPaywallMessage,
  sendPaywallMessage,
  sendPlansMenu,
} from "@/lib/paywall";
import { uploadInputImage, uploadOutputPng } from "@/lib/storage";
import { canGenerate, getOrCreateUserByPhone } from "@/lib/users";
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

function parseStudioStyleId(replyId: string): "scene" | "diecut" | null {
  if (replyId === "studio_style_scene") return "scene";
  if (replyId === "studio_style_diecut") return "diecut";
  return null;
}

function parseBackgroundId(replyId: string): string | null {
  if (!replyId.startsWith("bg_")) return null;
  const id = replyId.slice(3);
  return isValidBackgroundId(id) ? id : null;
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

function getReplyId(message: WhatsAppMessage): string | null {
  return (
    message.interactive?.button_reply?.id ??
    message.interactive?.list_reply?.id ??
    null
  );
}

async function sendWelcome(to: string, userId: string): Promise<void> {
  const quota = await getUserQuota(userId);

  if (quota.studioBalance > 0 || quota.adBalance > 0) {
    await sendText(
      to,
      `Welcome back to Velora Studio!\n\n${formatQuotaMessage(quota)}\n\nSend a product photo to create your next image.`,
    );
    return;
  }

  if (quota.freeRemaining > 0) {
    await sendText(
      to,
      `Welcome to Velora Studio!\n\nSend a product photo and we'll create a professional studio shot.\n\n${formatQuotaMessage(quota)}\n\nAd posts unlock with a subscription.`,
    );
    return;
  }

  await sendText(
    to,
    `Welcome to Velora Studio!\n\n${formatQuotaMessage(quota)}\n\nType *plans* to subscribe.`,
  );
}

async function askMode(to: string): Promise<void> {
  await sendButtons(to, "What do you need?", [
    { id: "mode_studio", title: "Studio shot" },
    { id: "mode_ad", title: "Social ad post" },
  ]);
}

async function askStudioStyle(to: string): Promise<void> {
  await sendButtons(to, "What kind of *studio photo* do you want?", [
    { id: "studio_style_scene", title: "With background" },
    { id: "studio_style_diecut", title: "Die-cut PNG" },
  ]);
}

async function askStudioBackground(to: string): Promise<void> {
  await sendList(
    to,
    "Pick a background for your *studio shot* (clean product photo, no text):",
    "Choose background",
    backgroundListRows(),
  );
}

async function askStudioCustomBackground(
  to: string,
  conversationId: string,
): Promise<void> {
  await updateConversation(conversationId, {
    step: "awaiting_custom_background",
    choices: { mode: "studio", studioStyle: "scene", backgroundId: BACKGROUND_CUSTOM_ID },
  });

  await sendText(
    to,
    "Describe the *background scene* you want.\n\nExamples:\n• *Rustic wooden kitchen counter*\n• *Soft blue gradient minimalist backdrop*\n• *Diwali marigold flowers and diyas*",
  );
}

async function handleImage(
  to: string,
  userId: string,
  conversationId: string,
  mediaId: string,
): Promise<void> {
  const studioCheck = await canGenerate(userId, "studio");
  if (!studioCheck.ok) {
    await sendPaywallMessage(to, userId);
    return;
  }

  const { buffer, mimeType } = await downloadMedia(mediaId);
  const ext = mimeToExt(mimeType);
  const inputUrl = await uploadInputImage(userId, buffer, mimeType, ext);

  await updateConversation(conversationId, {
    step: "awaiting_mode",
    input_image_url: inputUrl,
    choices: {},
  });

  await askMode(to);
}

async function handleModeChoice(
  to: string,
  userId: string,
  conversationId: string,
  mode: GenerationMode,
): Promise<void> {
  if (mode === "ad") {
    const adCheck = await canGenerate(userId, "ad");
    if (!adCheck.ok) {
      await sendAdPaywallMessage(to, userId);
      return;
    }
    await startAdInterview(to, conversationId);
    return;
  }

  const studioCheck = await canGenerate(userId, "studio");
  if (!studioCheck.ok) {
    await sendPaywallMessage(to, userId);
    return;
  }

  await updateConversation(conversationId, {
    step: "awaiting_studio_style",
    choices: { mode: "studio" },
  });

  await sendText(
    to,
    "Studio shot — choose how you want the product to look.",
  );
  await askStudioStyle(to);
}

async function handleStudioDiecut(
  to: string,
  userId: string,
  conversationId: string,
  inputImageUrl: string,
): Promise<void> {
  await updateConversation(conversationId, {
    step: "generating",
    choices: { mode: "studio", studioStyle: "diecut" },
  });

  await sendText(
    to,
    "Creating your *die-cut* product image (transparent PNG)… ~10–20 seconds.",
  );

  try {
    const credit = await checkStudioCredit(userId);
    const built = await buildDiecutImage(inputImageUrl);
    const outputUrl = await uploadOutputPng(userId, built.png);

    await sendImagePng(
      to,
      built.png,
      [
        "Velora Studio — Die-cut product (transparent PNG)",
        "Use on WhatsApp catalog, Instagram, or any background.",
        built.photoroomMode === "sandbox" ? "(sandbox preview)" : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );

    await saveStudioGeneration(userId, inputImageUrl, outputUrl, built, credit);
    await finishGeneration(to, userId, conversationId);
  } catch (error) {
    await handleGenerationError(to, userId, conversationId, error, {
      mode: "studio",
      studioStyle: "diecut",
    });
  }
}

async function handleStudioBackground(
  to: string,
  userId: string,
  conversationId: string,
  inputImageUrl: string,
  backgroundId: string,
  customBackgroundPrompt?: string,
): Promise<void> {
  await updateConversation(conversationId, {
    step: "generating",
    choices: {
      mode: "studio",
      studioStyle: "scene",
      backgroundId,
      ...(customBackgroundPrompt ? { customBackgroundPrompt } : {}),
    },
  });

  await sendText(to, "Creating your studio shot… ~15–30 seconds.");

  try {
    const credit = await checkStudioCredit(userId);
    const built = await buildStudioImage(
      inputImageUrl,
      backgroundId,
      customBackgroundPrompt,
    );
    const outputUrl = await uploadOutputPng(userId, built.png);
    const background = resolveBackground(backgroundId, customBackgroundPrompt);

    await sendImagePng(
      to,
      built.png,
      [
        `Velora Studio — ${background.label}`,
        built.photoroomMode === "sandbox" ? "(sandbox preview)" : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );

    await saveStudioGeneration(userId, inputImageUrl, outputUrl, built, credit);
    await finishGeneration(to, userId, conversationId);
  } catch (error) {
    await handleGenerationError(to, userId, conversationId, error, {
      mode: "studio",
      studioStyle: "scene",
      backgroundId,
      customBackgroundPrompt,
    });
  }
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
  const backgroundId = adChoices.backgroundId;
  if (!backgroundId) {
    await sendText(to, "Please pick a background first.");
    return;
  }

  await updateConversation(conversationId, {
    step: "generating",
    choices: adChoices,
  });

  await sendText(to, "Designing your ad post from your choices… ~20–40 seconds.");

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
    await finishGeneration(to, userId, conversationId);
  } catch (error) {
    await handleGenerationError(to, userId, conversationId, error, adChoices);
  }
}

async function finishGeneration(
  to: string,
  userId: string,
  conversationId: string,
): Promise<void> {
  await resetConversation(conversationId);

  const updatedQuota = await getUserQuota(userId);
  const canStudio =
    updatedQuota.freeRemaining > 0 || updatedQuota.studioBalance > 0;
  const canAd = updatedQuota.adBalance > 0;

  if (canStudio || canAd) {
    await sendText(
      to,
      `Done! Send another product photo anytime.\n\n${formatQuotaMessage(updatedQuota)}`,
    );
  } else {
    await sendPaywallMessage(to, userId);
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
      : choices.studioStyle === "diecut"
        ? "awaiting_studio_style"
        : choices.backgroundId === BACKGROUND_CUSTOM_ID
          ? "awaiting_custom_background"
          : "awaiting_background";

  await updateConversation(conversationId, { step, choices });

  if (error instanceof AdPaywallError) {
    await sendAdPaywallMessage(to, userId);
    return;
  }

  if (error instanceof PaywallError) {
    await sendPaywallMessage(to, userId);
    return;
  }

  console.error("Generation failed", error);
  await sendText(
    to,
    "Sorry, we couldn't deliver your image. No credit was used. Please try again — send your product photo once more.",
  );
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
  const lower = body.trim().toLowerCase();

  if (["balance", "credits", "quota", "status"].includes(lower)) {
    await sendText(to, formatQuotaMessage(await getUserQuota(userId)));
    return;
  }

  if (["plans", "subscribe", "pricing", "plan", "pay"].includes(lower)) {
    await sendPlansMenu(to);
    return;
  }

  if (
    ["hi", "hello", "hey", "start", "help"].includes(lower) ||
    lower === "now"
  ) {
    await sendWelcome(to, userId);
    return;
  }

  if (step === "ad_awaiting_headline_text") {
    await handleAdHeadlineText(to, conversationId, body, choices);
    return;
  }

  if (step === "ad_awaiting_message_text") {
    await handleAdMessageText(to, conversationId, body, choices);
    return;
  }

  if (step === "ad_awaiting_custom_background") {
    await handleAdCustomBackgroundText(to, conversationId, body, choices);
    return;
  }

  if (step === "awaiting_custom_background") {
    const prompt = sanitizeCustomBackgroundPrompt(body);
    if (!prompt) {
      await sendText(
        to,
        "Please describe the scene in a few words (at least 5 characters).",
      );
      return;
    }

    if (!inputImageUrl) {
      await sendText(to, "Please send your product photo again to continue.");
      return;
    }

    await handleStudioBackground(
      to,
      userId,
      conversationId,
      inputImageUrl,
      BACKGROUND_CUSTOM_ID,
      prompt,
    );
    return;
  }

  if (step === "ad_awaiting_confirm") {
    await sendText(to, "Tap *Generate ad* or *Start over* using the buttons above.");
    return;
  }

  if (AD_STEPS.has(step)) {
    await sendText(to, "Please pick an option from the list or buttons above.");
    return;
  }

  if (
    lower.includes("where") ||
    lower.includes("post") ||
    lower === "???" ||
    lower.includes("image")
  ) {
    await sendText(
      to,
      "If your image didn't arrive, send your product photo again.\n\nType *balance* to check credits.",
    );
    return;
  }

  if (step === "awaiting_studio_style") {
    await sendText(
      to,
      "Please tap *With background* or *Die-cut PNG* above.",
    );
    return;
  }

  if (step === "awaiting_mode") {
    await sendText(to, "Please tap *Studio shot* or *Social ad post* above.");
    return;
  }

  if (step === "awaiting_background") {
    await sendText(
      to,
      "Please pick a background from the list above, or send a new product photo.",
    );
    return;
  }

  if (step === "awaiting_custom_background") {
    await sendText(
      to,
      "Type your background idea in a message, or send a new product photo to start over.",
    );
    return;
  }

  if (step === "generating") {
    await sendText(to, "Still working on your image — please wait a moment.");
    return;
  }

  await sendText(
    to,
    "Send a product photo to get started, or type *balance* / *plans*.",
  );
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
  const conversation = await getOrCreateConversation(user.id);
  const replyId = getReplyId(message);

  if (replyId) {
    if (replyId === "plans_menu") {
      await sendPlansMenu(from);
      return;
    }

    const planId = parsePlanId(replyId);
    if (planId) {
      await handlePlanSelection(from, user.id, planId);
      return;
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

    const studioStyle = parseStudioStyleId(replyId);
    if (
      studioStyle &&
      conversation.input_image_url &&
      conversation.step === "awaiting_studio_style"
    ) {
      if (studioStyle === "diecut") {
        await handleStudioDiecut(
          from,
          user.id,
          conversation.id,
          conversation.input_image_url,
        );
        return;
      }

      await updateConversation(conversation.id, {
        step: "awaiting_background",
        choices: { mode: "studio", studioStyle: "scene" },
      });
      await askStudioBackground(from);
      return;
    }

    const mode = parseModeId(replyId);
    if (
      mode &&
      conversation.input_image_url &&
      conversation.step === "awaiting_mode"
    ) {
      await handleModeChoice(from, user.id, conversation.id, mode);
      return;
    }

    const backgroundId = parseBackgroundId(replyId);
    if (backgroundId && conversation.input_image_url) {
      if (conversation.step === "generating") {
        await sendText(from, "Still working on your last image — please wait.");
        return;
      }

      if (conversation.step === "awaiting_background") {
        if (backgroundId === BACKGROUND_CUSTOM_ID) {
          await askStudioCustomBackground(from, conversation.id);
          return;
        }

        await handleStudioBackground(
          from,
          user.id,
          conversation.id,
          conversation.input_image_url,
          backgroundId,
        );
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
      await sendText(from, "Still working on your last image — please wait.");
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
