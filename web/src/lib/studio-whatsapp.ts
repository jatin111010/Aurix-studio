import { markGenerating, updateConversation } from "@/lib/conversation";
import type { ConversationStep } from "@/lib/conversation";
import {
  checkStudioCredit,
  PaywallError,
} from "@/lib/generation";
import { sendPaywallMessage } from "@/lib/paywall";
import {
  createStudioPromptPack,
  formatProductBriefMessage,
  formatPromptChoicesMessage,
  type ProductBrief,
  type StudioPromptOption,
} from "@/lib/studio-brief";
import {
  buildStudioVariationsProgressive,
  saveStudioSet,
  StudioUnusableError,
  type BuiltStudioSet,
} from "@/lib/studio-generation";
import {
  getStudioChoices,
  type StudioChoices,
} from "@/lib/studio-options";
import { getPhotoroomMode } from "@/lib/photoroom";
import {
  DEFAULT_LANG,
  isVeloraLang,
  say,
  type VeloraLang,
} from "@/lib/velora-voice";
import { sendImagePng, sendList, sendText } from "@/lib/whatsapp";
import { startAdInterview } from "@/lib/ad-whatsapp";
import { canGenerate } from "@/lib/users";

export const STUDIO_STEPS = new Set([
  "studio_awaiting_prompt",
  "studio_awaiting_manual_prompt",
  "studio_awaiting_actions",
  // Legacy steps (resume / mid-flight conversations)
  "studio_awaiting_style",
  "studio_awaiting_angle",
  "studio_awaiting_lighting",
  "studio_awaiting_quality",
]);

function langOf(choices: Record<string, unknown>): VeloraLang {
  return isVeloraLang(choices.lang) ? choices.lang : DEFAULT_LANG;
}

function thinAnalysisFromBrief(brief: ProductBrief) {
  return {
    category: (brief.category || "general") as import("@/lib/studio-analysis").ProductCategory,
    summary: brief.description.slice(0, 160),
    packagingType: brief.packaging,
    premiumLevel: brief.premiumLevel,
    brandColors: brief.colors,
    hasReflection: false,
    hasTransparency: false,
    recommendedStyleId: "ai_recommended" as const,
    recommendedStyleLabel: "AI Prompt Director",
    recommendedAngleId: "front" as const,
    recommendedLightingId: "soft" as const,
    idealSetting: brief.industryType,
    photoQuality: brief.photoQuality,
    mainProduct: brief.mainProduct,
    photoIssues: brief.photoIssues,
    productClarity: brief.visualDetails,
    isolateFirst: brief.photoQuality !== "clean",
  };
}

function baseChoices(
  lang: VeloraLang,
  brief: ProductBrief,
  prompts: StudioPromptOption[],
  guidance: string,
): StudioChoices {
  return {
    mode: "studio",
    lang,
    styleId: "ai_recommended",
    angleId: "ai_recommended",
    lightingId: "ai_recommended",
    qualityId: "hd",
    studioStyle: "scene",
    productBrief: brief,
    promptOptions: prompts,
    promptGuidance: guidance,
    analysis: thinAnalysisFromBrief(brief),
  };
}

async function sendPromptPicker(
  to: string,
  conversationId: string,
  choices: StudioChoices,
): Promise<void> {
  const lang = langOf(choices);
  const prompts = choices.promptOptions ?? [];

  await updateConversation(conversationId, {
    step: "studio_awaiting_prompt",
    choices,
  });

  if (choices.productBrief) {
    await sendText(to, formatProductBriefMessage(choices.productBrief, lang));
  }

  if (choices.promptGuidance) {
    await sendText(to, choices.promptGuidance);
  }

  // Full prompt texts (WhatsApp 4096 limit — trim if needed)
  let detail = formatPromptChoicesMessage(prompts, lang);
  if (detail.length > 3500) {
    detail = `${detail.slice(0, 3490)}…`;
  }
  await sendText(to, detail);

  await sendList(to, say(lang, "studio_pick_prompt"), "Choose look", [
    ...prompts.map((p) => ({
      id: `studio_prompt_${p.id}`,
      title: p.title.slice(0, 24),
      description: p.teaser.slice(0, 72),
    })),
    {
      id: "studio_prompt_manual",
      title: "✍️ Write my prompt",
      description: "Type your own scene idea",
    },
  ]);
}

export async function startStudioExperience(
  to: string,
  userId: string,
  conversationId: string,
  inputImageUrl: string,
  lang: VeloraLang,
): Promise<void> {
  const studioCheck = await canGenerate(userId, "studio");
  if (!studioCheck.ok) {
    await sendPaywallMessage(to, userId, lang);
    return;
  }

  await sendText(to, say(lang, "studio_analyzing"));

  const pack = await createStudioPromptPack(inputImageUrl);
  const choices = baseChoices(lang, pack.brief, pack.prompts, pack.guidance);

  await updateConversation(conversationId, {
    step: "studio_awaiting_prompt",
    input_image_url: inputImageUrl,
    choices,
  });

  await sendPromptPicker(to, conversationId, choices);
}

/** Refresh 5 new prompts for the same product image (still free until generate). */
export async function refreshStudioPrompts(
  to: string,
  conversationId: string,
  inputImageUrl: string,
  choices: StudioChoices,
): Promise<void> {
  const lang = langOf(choices);
  await sendText(to, say(lang, "studio_analyzing"));

  const pack = await createStudioPromptPack(inputImageUrl);
  const updated = baseChoices(lang, pack.brief, pack.prompts, pack.guidance);
  // Keep prior selection cleared
  updated.selectedPromptId = undefined;
  updated.selectedPromptText = undefined;
  updated.customPrompt = undefined;

  await sendPromptPicker(to, conversationId, updated);
}

async function askManualPrompt(
  to: string,
  conversationId: string,
  choices: StudioChoices,
): Promise<void> {
  const lang = langOf(choices);
  await updateConversation(conversationId, {
    step: "studio_awaiting_manual_prompt",
    choices,
  });
  await sendText(to, say(lang, "studio_ask_manual_prompt"));
}

async function runStudioGeneration(
  to: string,
  userId: string,
  conversationId: string,
  inputImageUrl: string,
  choices: StudioChoices,
  preStep: ConversationStep = "studio_awaiting_prompt",
): Promise<void> {
  await updateConversation(conversationId, {
    step: "generating",
    choices: markGenerating(choices, preStep),
  });

  const lang = langOf(choices);
  await sendText(to, say(lang, "studio_generating"));

  try {
    const credit = await checkStudioCredit(userId);
    const sandbox =
      getPhotoroomMode() === "sandbox" ? "\n(sandbox preview)" : "";

    const built = await buildStudioVariationsProgressive(
      inputImageUrl,
      choices,
      async (v) => {
        await sendImagePng(
          to,
          v.png,
          `Velora Studio — ${v.styleLabel}${sandbox}\n1 studio credit used`,
        );
      },
      { uploadUserId: userId },
    );

    await saveStudioSet(userId, inputImageUrl, built, credit);
    await finishStudioDelivery(to, conversationId, built, lang);
  } catch (error) {
    if (error instanceof PaywallError) {
      await updateConversation(conversationId, {
        step: "studio_awaiting_prompt",
        choices,
      });
      await sendPaywallMessage(to, userId, lang);
      return;
    }
    if (error instanceof StudioUnusableError) {
      await updateConversation(conversationId, {
        step: studioGenerationErrorStep(choices),
        choices,
      });
      await sendText(to, error.guidance);
      return;
    }
    console.error("Studio generation failed", error);
    await updateConversation(conversationId, {
      step: studioGenerationErrorStep(choices),
      choices,
    });
    const detail =
      error instanceof Error ? error.message.slice(0, 120) : "unknown error";
    await sendText(
      to,
      `${say(lang, "err_generation_failed")}\n\n(Tech: ${detail})`,
    );
  }
}

async function sendStudioPostActions(
  to: string,
  conversationId: string,
  choices: StudioChoices,
  lang: VeloraLang,
): Promise<void> {
  await updateConversation(conversationId, {
    step: "studio_awaiting_actions",
    choices,
  });

  await sendList(to, say(lang, "studio_post_actions"), "What next?", [
    {
      id: "studio_regenerate",
      title: "🔄 Same prompt again",
      description: "New render, same look (1 credit)",
    },
    {
      id: "studio_new_prompts",
      title: "✨ 5 fresh prompts",
      description: "New AI looks for this product",
    },
    {
      id: "studio_prompt_manual",
      title: "✍️ Write my prompt",
      description: "Type your own scene idea",
    },
    {
      id: "studio_create_ad",
      title: "🖼 Create Social Ad",
      description: "Turn into a marketing ad",
    },
    {
      id: "studio_done",
      title: "✅ Done",
      description: "Send another product photo",
    },
  ]);
}

export async function resumeStudioAfterStale(
  to: string,
  conversationId: string,
  step: ConversationStep,
  choices: Record<string, unknown>,
): Promise<boolean> {
  const studio = getStudioChoices(choices);
  const lang = langOf(studio);

  if (step === "studio_awaiting_prompt" && studio.promptOptions?.length) {
    await sendPromptPicker(to, conversationId, studio);
    return true;
  }
  if (step === "studio_awaiting_manual_prompt") {
    await askManualPrompt(to, conversationId, studio);
    return true;
  }
  if (step === "studio_awaiting_actions") {
    await sendStudioPostActions(to, conversationId, studio, lang);
    return true;
  }
  // Legacy mid-flight → show existing prompts or ask to pick again
  if (
    step === "studio_awaiting_style" ||
    step === "studio_awaiting_angle" ||
    step === "studio_awaiting_lighting" ||
    step === "studio_awaiting_quality"
  ) {
    if (studio.promptOptions?.length) {
      await sendPromptPicker(to, conversationId, studio);
      return true;
    }
  }
  return false;
}

async function finishStudioDelivery(
  to: string,
  conversationId: string,
  built: BuiltStudioSet,
  lang: VeloraLang,
): Promise<void> {
  await sendText(to, say(lang, "studio_shot_done"));
  await sendStudioPostActions(to, conversationId, built.choices, lang);
}

export async function handleStudioGenerate(
  to: string,
  userId: string,
  conversationId: string,
  inputImageUrl: string,
  choices: StudioChoices,
  preStep: ConversationStep = "studio_awaiting_prompt",
): Promise<void> {
  await runStudioGeneration(
    to,
    userId,
    conversationId,
    inputImageUrl,
    choices,
    preStep,
  );
}

function parsePromptId(replyId: string): number | null {
  if (!replyId.startsWith("studio_prompt_")) return null;
  const raw = replyId.slice("studio_prompt_".length);
  if (raw === "manual") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

async function generateFromPrompt(
  to: string,
  userId: string,
  conversationId: string,
  inputImageUrl: string,
  choices: StudioChoices,
  promptId: number,
  promptText: string,
  preStep: ConversationStep = "studio_awaiting_prompt",
): Promise<void> {
  const updated: StudioChoices = {
    ...choices,
    selectedPromptId: promptId,
    selectedPromptText: promptText,
    customPrompt: promptId === 0 ? promptText : choices.customPrompt,
    studioStyle: "scene",
    styleId: "ai_recommended",
  };
  await handleStudioGenerate(
    to,
    userId,
    conversationId,
    inputImageUrl,
    updated,
    preStep,
  );
}

export async function handleStudioReply(
  to: string,
  userId: string,
  conversationId: string,
  replyId: string,
  choices: Record<string, unknown>,
  inputImageUrl: string,
): Promise<boolean> {
  const studio = getStudioChoices(choices);
  const lang = langOf(studio);

  const promptId = parsePromptId(replyId);
  if (promptId !== null) {
    const option = studio.promptOptions?.find((p) => p.id === promptId);
    if (!option?.fullPrompt) {
      await sendText(to, say(lang, "studio_pick_prompt"));
      return true;
    }
    await generateFromPrompt(
      to,
      userId,
      conversationId,
      inputImageUrl,
      studio,
      promptId,
      option.fullPrompt,
    );
    return true;
  }

  if (replyId === "studio_prompt_manual") {
    await askManualPrompt(to, conversationId, studio);
    return true;
  }

  if (replyId === "studio_regenerate") {
    const text = studio.selectedPromptText?.trim();
    if (!text) {
      await sendPromptPicker(to, conversationId, studio);
      return true;
    }
    await generateFromPrompt(
      to,
      userId,
      conversationId,
      inputImageUrl,
      studio,
      studio.selectedPromptId ?? 0,
      text,
      "studio_awaiting_actions",
    );
    return true;
  }

  if (replyId === "studio_new_prompts" || replyId === "studio_another_style") {
    await refreshStudioPrompts(to, conversationId, inputImageUrl, studio);
    return true;
  }

  if (replyId === "studio_create_ad") {
    await startAdInterview(to, conversationId, lang);
    return true;
  }

  if (replyId === "studio_done") {
    const { resetConversation } = await import("@/lib/conversation");
    const { getUserQuota, formatQuotaMessage } = await import("@/lib/paywall");
    await resetConversation(conversationId);
    const quota = await getUserQuota(userId);
    await sendText(
      to,
      say(lang, "studio_done_message") + "\n\n" + formatQuotaMessage(quota),
    );
    return true;
  }

  // Ignore obsolete enhance / style replies by re-showing prompt picker
  if (
    replyId.startsWith("studio_style_") ||
    replyId.startsWith("studio_angle_") ||
    replyId.startsWith("studio_light_") ||
    replyId.startsWith("studio_quality_") ||
    replyId === "studio_enhance"
  ) {
    if (studio.promptOptions?.length) {
      await sendPromptPicker(to, conversationId, studio);
      return true;
    }
    await refreshStudioPrompts(to, conversationId, inputImageUrl, studio);
    return true;
  }

  return false;
}

export async function handleStudioText(
  to: string,
  userId: string,
  conversationId: string,
  body: string,
  choices: Record<string, unknown>,
  inputImageUrl: string,
  step: string,
): Promise<boolean> {
  if (!STUDIO_STEPS.has(step) || !inputImageUrl) return false;

  const studio = getStudioChoices(choices);
  const lang = langOf(studio);
  const text = body.trim();
  if (!text) return false;

  if (step === "studio_awaiting_manual_prompt") {
    if (text.length < 12) {
      await sendText(to, say(lang, "err_scene_short"));
      return true;
    }
    await generateFromPrompt(
      to,
      userId,
      conversationId,
      inputImageUrl,
      studio,
      0,
      text,
      "studio_awaiting_manual_prompt",
    );
    return true;
  }

  if (step === "studio_awaiting_prompt") {
    // Number shortcut: "1" … "5"
    const num = Number(text);
    if (Number.isInteger(num) && num >= 1 && num <= 5) {
      const option = studio.promptOptions?.find((p) => p.id === num);
      if (option?.fullPrompt) {
        await generateFromPrompt(
          to,
          userId,
          conversationId,
          inputImageUrl,
          studio,
          num,
          option.fullPrompt,
        );
        return true;
      }
    }

    // Free-text treated as custom prompt if long enough
    if (text.length >= 20) {
      await generateFromPrompt(
        to,
        userId,
        conversationId,
        inputImageUrl,
        studio,
        0,
        text,
      );
      return true;
    }

    await sendText(to, say(lang, "studio_intent_hint"));
    return true;
  }

  if (step === "studio_awaiting_actions") {
    await sendText(to, say(lang, "studio_use_actions"));
    return true;
  }

  // Legacy steps → nudge into new flow
  if (
    step === "studio_awaiting_style" ||
    step === "studio_awaiting_angle" ||
    step === "studio_awaiting_lighting" ||
    step === "studio_awaiting_quality"
  ) {
    await refreshStudioPrompts(to, conversationId, inputImageUrl, studio);
    return true;
  }

  return false;
}

export function studioGenerationErrorStep(
  _choices: StudioChoices,
): "studio_awaiting_prompt" {
  return "studio_awaiting_prompt";
}
