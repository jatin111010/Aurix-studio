import { BACKGROUNDS, type PlanId } from "@/lib/config";
import {
  getOrCreateConversation,
  resetConversation,
  updateConversation,
} from "@/lib/conversation";
import {
  AdPaywallError,
  PaywallError,
  buildAdImage,
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

function parseBackgroundId(replyId: string): string | null {
  if (!replyId.startsWith("bg_")) return null;
  const id = replyId.slice(3);
  return BACKGROUNDS.some((b) => b.id === id) ? id : null;
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

function getConversationMode(choices: Record<string, unknown>): GenerationMode {
  return choices.mode === "ad" ? "ad" : "studio";
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

async function askBackground(to: string, mode: GenerationMode): Promise<void> {
  const intro =
    mode === "ad"
      ? "Pick a background for your *ad post*. We'll add a catchy headline on top."
      : "Pick a background for your *studio shot* (clean product photo, no text overlay):";

  await sendList(
    to,
    intro,
    "Choose background",
    BACKGROUNDS.map((b) => ({
      id: `bg_${b.id}`,
      title: b.label,
      description: b.prompt,
    })),
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
  } else {
    const studioCheck = await canGenerate(userId, "studio");
    if (!studioCheck.ok) {
      await sendPaywallMessage(to, userId);
      return;
    }
  }

  await updateConversation(conversationId, {
    step: "awaiting_background",
    choices: { mode },
  });

  await askBackground(to, mode);
}

async function handleBackgroundChoice(
  to: string,
  userId: string,
  conversationId: string,
  inputImageUrl: string,
  backgroundId: string,
  mode: GenerationMode,
): Promise<void> {
  await updateConversation(conversationId, {
    step: "generating",
    choices: { mode, backgroundId },
  });

  const working =
    mode === "ad"
      ? "Creating your ad post with AI headline… ~20–40 seconds."
      : "Creating your studio shot… ~15–30 seconds.";
  await sendText(to, working);

  try {
    const background = BACKGROUNDS.find((b) => b.id === backgroundId);

    if (mode === "ad") {
      const credit = await checkAdCredit(userId);
      const built = await buildAdImage(inputImageUrl, backgroundId);
      const outputUrl = await uploadOutputPng(userId, built.png);

      await sendImagePng(
        to,
        built.png,
        [
          `Velora Ad — "${built.headline}"`,
          `${background?.label ?? "Studio"} background`,
          built.photoroomMode === "sandbox" ? "(sandbox preview)" : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );

      await saveAdGeneration(userId, inputImageUrl, outputUrl, built, credit);
    } else {
      const credit = await checkStudioCredit(userId);
      const built = await buildStudioImage(inputImageUrl, backgroundId);
      const outputUrl = await uploadOutputPng(userId, built.png);

      await sendImagePng(
        to,
        built.png,
        [
          `Velora Studio — ${background?.label ?? "Studio"} background`,
          built.photoroomMode === "sandbox" ? "(sandbox preview)" : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );

      await saveStudioGeneration(
        userId,
        inputImageUrl,
        outputUrl,
        built,
        credit,
      );
    }

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
  } catch (error) {
    await updateConversation(conversationId, {
      step: "awaiting_background",
      choices: { mode, backgroundId },
    });

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
}

async function handleText(
  to: string,
  userId: string,
  step: string,
  body: string,
): Promise<void> {
  const lower = body.trim().toLowerCase();

  if (["balance", "credits", "quota", "status"].includes(lower)) {
    const quota = await getUserQuota(userId);
    await sendText(to, formatQuotaMessage(quota));
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

  if (
    lower.includes("where") ||
    lower.includes("post") ||
    lower === "???" ||
    lower.includes("image")
  ) {
    await sendText(
      to,
      "If your image didn't arrive, send your product photo again and pick Studio shot or Social ad post.\n\nType *balance* to check credits.",
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
      "Please pick a background from the list above, or send a new product photo to start over.",
    );
    return;
  }

  if (step === "generating") {
    await sendText(to, "Still working on your image — please wait a moment.");
    return;
  }

  await sendText(
    to,
    "Send a product photo to get started, or type *balance* / *plans* for help.",
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

    const mode = parseModeId(replyId);
    if (
      mode &&
      conversation.input_image_url &&
      (conversation.step === "awaiting_mode" ||
        conversation.step === "awaiting_background")
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
        const genMode = getConversationMode(conversation.choices);
        await handleBackgroundChoice(
          from,
          user.id,
          conversation.id,
          conversation.input_image_url,
          backgroundId,
          genMode,
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
    await handleText(from, user.id, conversation.step, message.text.body);
    return;
  }

  await sendText(
    from,
    "Send a product photo (JPG or PNG) to get started, or type *balance* to check credits.",
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
          // ignore secondary failure
        }
      }
    }
  }
}
