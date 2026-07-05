import { BACKGROUNDS, FREE_IMAGES, type PlanId } from "@/lib/config";
import {
  getOrCreateConversation,
  resetConversation,
  updateConversation,
} from "@/lib/conversation";
import { PaywallError, runStudioGeneration } from "@/lib/generation";
import {
  formatQuotaMessage,
  getUserQuota,
  handlePlanSelection,
  sendPaywallMessage,
} from "@/lib/paywall";
import { uploadInputImage } from "@/lib/storage";
import { getOrCreateUserByPhone } from "@/lib/users";
import {
  downloadMedia,
  mimeToExt,
  sendImage,
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

function getReplyId(message: WhatsAppMessage): string | null {
  return (
    message.interactive?.button_reply?.id ??
    message.interactive?.list_reply?.id ??
    null
  );
}

async function sendWelcome(to: string, freeRemaining: number): Promise<void> {
  await sendText(
    to,
    `Welcome to Velora Studio!\n\nSend a product photo and we'll create a professional studio shot for you.\n\nYou have ${freeRemaining} free image${freeRemaining === 1 ? "" : "s"} to try.`,
  );
}

async function askBackground(to: string): Promise<void> {
  await sendList(
    to,
    "Great photo! Pick a background for your studio shot:",
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
  const { buffer, mimeType } = await downloadMedia(mediaId);
  const ext = mimeToExt(mimeType);
  const inputUrl = await uploadInputImage(userId, buffer, mimeType, ext);

  await updateConversation(conversationId, {
    step: "awaiting_background",
    input_image_url: inputUrl,
    choices: {},
  });

  await askBackground(to);
}

async function handleBackgroundChoice(
  to: string,
  userId: string,
  conversationId: string,
  inputImageUrl: string,
  backgroundId: string,
): Promise<void> {
  await updateConversation(conversationId, {
    step: "generating",
    choices: { backgroundId },
  });

  await sendText(to, "Creating your studio shot… this takes about 15–30 seconds.");

  try {
    const result = await runStudioGeneration(
      userId,
      inputImageUrl,
      backgroundId,
    );

    const background = BACKGROUNDS.find((b) => b.id === backgroundId);
    const quota = await getUserQuota(userId);
    const caption = [
      `Velora Studio — ${background?.label ?? "Studio"} background`,
      result.photoroomMode === "sandbox" ? "(sandbox preview)" : "",
      formatQuotaMessage(quota),
    ]
      .filter(Boolean)
      .join("\n");

    await sendImage(to, result.outputUrl, caption);
    await resetConversation(conversationId);

    if (quota.freeRemaining > 0 || quota.studioBalance > 0) {
      await sendText(
        to,
        `Send another product photo anytime.\n\n${formatQuotaMessage(quota)}`,
      );
    } else {
      await sendPaywallMessage(to, userId);
    }
  } catch (error) {
    await updateConversation(conversationId, { step: "awaiting_background" });

    if (error instanceof PaywallError) {
      await sendPaywallMessage(to, userId);
      return;
    }

    console.error("Generation failed", error);
    await sendText(
      to,
      "Sorry, we couldn't generate that image. Please try again or send a clearer product photo.",
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

  if (["hi", "hello", "hey", "start", "help"].includes(lower) || step === "start") {
    const quota = await getUserQuota(userId);
    await sendWelcome(to, quota.freeRemaining || FREE_IMAGES);
    return;
  }

  if (step === "awaiting_background") {
    await sendText(to, "Please pick a background from the list above, or send a new photo.");
    return;
  }

  if (step === "generating") {
    await sendText(to, "Still working on your image — please wait a moment.");
    return;
  }

  const quota = await getUserQuota(userId);
  await sendWelcome(to, quota.freeRemaining || FREE_IMAGES);
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
    const planId = parsePlanId(replyId);
    if (planId) {
      await handlePlanSelection(from, user.id, planId);
      return;
    }

    const backgroundId = parseBackgroundId(replyId);
    if (backgroundId && conversation.input_image_url) {
      if (conversation.step === "generating") {
        await sendText(from, "Still working on your last image — please wait.");
        return;
      }
      await handleBackgroundChoice(
        from,
        user.id,
        conversation.id,
        conversation.input_image_url,
        backgroundId,
      );
      return;
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
    "Send a product photo (JPG or PNG) to create a studio shot, or type *balance* to check your credits.",
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
