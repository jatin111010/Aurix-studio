import { markGenerating, updateConversation } from "@/lib/conversation";
import type { ConversationStep } from "@/lib/conversation";
import {
  checkStudioCredit,
  PaywallError,
} from "@/lib/generation";
import { sendPaywallMessage } from "@/lib/paywall";
import { analyzeProduct, type ProductAnalysis } from "@/lib/studio-analysis";
import {
  buildStudioVariationsProgressive,
  saveStudioSet,
  type BuiltStudioSet,
} from "@/lib/studio-generation";
import {
  mergeIntentWithAnalysis,
  parseStudioIntent,
  type StudioIntent,
} from "@/lib/studio-intent";
import {
  CAMERA_ANGLES,
  getStudioChoices,
  isCameraAngleId,
  isLightingId,
  isQualityId,
  isStudioStyleId,
  LIGHTING_PRESETS,
  QUALITY_PRESETS,
  type CameraAngleId,
  type LightingId,
  type QualityId,
  type StudioChoices,
  type StudioStyleId,
} from "@/lib/studio-options";
import { getPhotoroomMode } from "@/lib/photoroom";
import { styleListRows } from "@/lib/studio-recommendations";
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
  "studio_awaiting_style",
  "studio_awaiting_angle",
  "studio_awaiting_lighting",
  "studio_awaiting_quality",
  "studio_awaiting_actions",
]);

function langOf(choices: Record<string, unknown>): VeloraLang {
  return isVeloraLang(choices.lang) ? choices.lang : DEFAULT_LANG;
}

function analysisIntro(analysis: ProductAnalysis, lang: VeloraLang): string {
  const summary = analysis.summary;
  if (lang === "hi") {
    return `मैंने आपका product देख लिया।\n\nयह *${summary}* जैसा लगता है।\n\nइस तरह के products के लिए ये studio styles सबसे अच्छे रहते हैं —`;
  }
  if (lang === "hinglish") {
    return `Maine aapka product dekh liya.\n\nYeh *${summary}* jaisa lagta hai.\n\nIs type ke products ke liye yeh studio styles best perform karte hain —`;
  }
  return `I've looked at your product.\n\nIt looks like *${summary}*.\n\nFor products like this, these studio styles usually work best —`;
}

function defaultChoices(
  lang: VeloraLang,
  analysis: ProductAnalysis,
  partial?: Partial<StudioChoices>,
): StudioChoices {
  return {
    mode: "studio",
    lang,
    styleId: "ai_recommended",
    angleId: "ai_recommended",
    lightingId: "ai_recommended",
    qualityId: "standard",
    studioStyle: "scene",
    analysis,
    ...partial,
  };
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

  const analysis = await analyzeProduct(inputImageUrl);
  const choices = defaultChoices(lang, analysis);

  await updateConversation(conversationId, {
    step: "studio_awaiting_style",
    input_image_url: inputImageUrl,
    choices,
  });

  await sendText(to, analysisIntro(analysis, lang));
  await sendList(
    to,
    say(lang, "studio_pick_style"),
    "Choose style",
    styleListRows(analysis.category, analysis),
  );
}

export async function askStudioAngle(
  to: string,
  conversationId: string,
  choices: StudioChoices,
): Promise<void> {
  const lang = langOf(choices);
  await updateConversation(conversationId, {
    step: "studio_awaiting_angle",
    choices,
  });

  await sendList(to, say(lang, "studio_ask_angle"), "Camera angle", [
    {
      id: "studio_angle_ai_recommended",
      title: "⭐ AI Recommended",
      description: "Best angle for your product",
    },
    ...Object.values(CAMERA_ANGLES)
      .filter((a) => a.id !== "ai_recommended")
      .map((a) => ({
        id: `studio_angle_${a.id}`,
        title: a.label,
        description: a.promptSuffix || a.label,
      })),
  ]);
}

export async function askStudioLighting(
  to: string,
  conversationId: string,
  choices: StudioChoices,
): Promise<void> {
  const lang = langOf(choices);
  await updateConversation(conversationId, {
    step: "studio_awaiting_lighting",
    choices,
  });

  await sendList(to, say(lang, "studio_ask_lighting"), "Lighting", [
    {
      id: "studio_light_ai_recommended",
      title: "⭐ AI Recommended",
      description: "Matched to your product",
    },
    ...Object.values(LIGHTING_PRESETS)
      .filter((l) => l.id !== "ai_recommended")
      .map((l) => ({
        id: `studio_light_${l.id}`,
        title: l.label,
        description: l.promptSuffix.split(",")[0],
      })),
  ]);
}

export async function askStudioQuality(
  to: string,
  conversationId: string,
  choices: StudioChoices,
): Promise<void> {
  const lang = langOf(choices);
  await updateConversation(conversationId, {
    step: "studio_awaiting_quality",
    choices,
  });

  await sendList(to, say(lang, "studio_ask_quality"), "Image quality", [
    ...Object.values(QUALITY_PRESETS).map((q) => ({
      id: `studio_quality_${q.id}`,
      title: q.label,
      description: q.description,
    })),
  ]);
}

async function runStudioGeneration(
  to: string,
  userId: string,
  conversationId: string,
  inputImageUrl: string,
  choices: StudioChoices,
  preStep: ConversationStep = "studio_awaiting_quality",
): Promise<void> {
  await updateConversation(conversationId, {
    step: "generating",
    choices: markGenerating(choices, preStep),
  });

  const lang = langOf(choices);
  const isDiecut =
    choices.studioStyle === "diecut" || choices.styleId === "diecut";

  await sendText(
    to,
    isDiecut ? say(lang, "diecut_generating") : say(lang, "studio_generating"),
  );

  try {
    const credit = await checkStudioCredit(userId);
    const sandbox =
      getPhotoroomMode() === "sandbox" ? "\n(sandbox preview)" : "";

    const built = await buildStudioVariationsProgressive(
      inputImageUrl,
      choices,
      async (v) => {
        if (choices.studioStyle === "diecut" || choices.styleId === "diecut") {
          await sendImagePng(
            to,
            v.png,
            `Velora Studio — Transparent PNG${sandbox}\nUse on catalog, Instagram, or any background.`,
          );
        } else {
          await sendImagePng(
            to,
            v.png,
            `Variation ${v.label} — ${v.styleLabel}${sandbox}`,
          );
        }
      },
    );

    await saveStudioSet(userId, inputImageUrl, built, credit);
    await finishStudioDelivery(to, conversationId, built, lang);
  } catch (error) {
    if (error instanceof PaywallError) {
      await updateConversation(conversationId, {
        step: "studio_awaiting_style",
        choices,
      });
      await sendPaywallMessage(to, userId, lang);
      return;
    }
    console.error("Studio generation failed", error);
    await updateConversation(conversationId, {
      step: studioGenerationErrorStep(choices),
      choices,
    });
    await sendText(to, say(lang, "err_generation_failed"));
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
    { id: "studio_regenerate", title: "🔄 Regenerate", description: "New variations with same settings" },
    { id: "studio_another_style", title: "🎨 Try Another Style", description: "Pick a different look" },
    { id: "studio_enhance", title: "✨ Enhance Quality", description: "Upgrade to HD or Ultra HD" },
    { id: "studio_create_ad", title: "🖼 Create Social Ad", description: "Turn into a marketing ad" },
    { id: "studio_done", title: "✅ Done", description: "Send another product photo" },
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

  if (step === "studio_awaiting_quality") {
    await askStudioQuality(to, conversationId, studio);
    return true;
  }
  if (step === "studio_awaiting_actions") {
    await sendStudioPostActions(to, conversationId, studio, lang);
    return true;
  }
  if (step === "studio_awaiting_style" && studio.analysis) {
    await updateConversation(conversationId, {
      step: "studio_awaiting_style",
      choices: studio,
    });
    await sendText(to, analysisIntro(studio.analysis, lang));
    await sendList(
      to,
      say(lang, "studio_pick_style"),
      "Choose style",
      styleListRows(studio.analysis.category, studio.analysis),
    );
    return true;
  }
  if (step === "studio_awaiting_angle") {
    await askStudioAngle(to, conversationId, studio);
    return true;
  }
  if (step === "studio_awaiting_lighting") {
    await askStudioLighting(to, conversationId, studio);
    return true;
  }
  return false;
}

async function finishStudioDelivery(
  to: string,
  conversationId: string,
  built: BuiltStudioSet,
  lang: VeloraLang,
): Promise<void> {
  if (built.studioStyle !== "diecut") {
    await sendText(to, say(lang, "studio_variations_done"));
  }

  await sendStudioPostActions(to, conversationId, built.choices, lang);
}

export async function handleStudioGenerate(
  to: string,
  userId: string,
  conversationId: string,
  inputImageUrl: string,
  choices: StudioChoices,
  preStep: ConversationStep = "studio_awaiting_quality",
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

function parseStyleId(replyId: string): StudioStyleId | null {
  if (!replyId.startsWith("studio_style_")) return null;
  const id = replyId.slice(13) as StudioStyleId;
  return isStudioStyleId(id) ? id : null;
}

function parseAngleId(replyId: string): CameraAngleId | null {
  if (!replyId.startsWith("studio_angle_")) return null;
  const id = replyId.slice(13) as CameraAngleId;
  return isCameraAngleId(id) ? id : null;
}

function parseLightingId(replyId: string): LightingId | null {
  if (!replyId.startsWith("studio_light_")) return null;
  const id = replyId.slice(13) as LightingId;
  return isLightingId(id) ? id : null;
}

function parseQualityId(replyId: string): QualityId | null {
  if (!replyId.startsWith("studio_quality_")) return null;
  const id = replyId.slice(15) as QualityId;
  return isQualityId(id) ? id : null;
}

async function applyStyleAndContinue(
  to: string,
  conversationId: string,
  inputImageUrl: string,
  userId: string,
  choices: StudioChoices,
  styleId: StudioStyleId,
): Promise<void> {
  const updated: StudioChoices = {
    ...choices,
    styleId,
    studioStyle: styleId === "diecut" ? "diecut" : "scene",
  };

  if (styleId === "diecut") {
    await handleStudioGenerate(to, userId, conversationId, inputImageUrl, updated);
    return;
  }

  if (styleId === "ai_recommended") {
    await askStudioQuality(to, conversationId, {
      ...updated,
      angleId: "ai_recommended",
      lightingId: "ai_recommended",
    });
    return;
  }

  await askStudioAngle(to, conversationId, updated);
}

async function maybeFastTrackFromIntent(
  to: string,
  userId: string,
  conversationId: string,
  inputImageUrl: string,
  choices: StudioChoices,
  intent: StudioIntent,
): Promise<boolean> {
  if (!intent.styleId && !intent.diecut && !intent.customPrompt) return false;

  const merged = mergeIntentWithAnalysis(intent, choices.analysis!);
  const updated: StudioChoices = {
    ...choices,
    styleId: intent.diecut ? "diecut" : merged.styleId,
    angleId: merged.angleId,
    lightingId: merged.lightingId,
    qualityId: merged.qualityId,
    studioStyle: intent.diecut ? "diecut" : "scene",
    customPrompt: intent.customPrompt,
  };

  if (intent.skipToGenerate || intent.diecut || intent.customPrompt) {
    await handleStudioGenerate(to, userId, conversationId, inputImageUrl, updated);
    return true;
  }

  await applyStyleAndContinue(
    to,
    conversationId,
    inputImageUrl,
    userId,
    updated,
    updated.styleId,
  );
  return true;
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

  const styleId = parseStyleId(replyId);
  if (styleId && studio.analysis) {
    await applyStyleAndContinue(
      to,
      conversationId,
      inputImageUrl,
      userId,
      studio,
      styleId,
    );
    return true;
  }

  const angleId = parseAngleId(replyId);
  if (angleId) {
    await askStudioLighting(to, conversationId, { ...studio, angleId });
    return true;
  }

  const lightingId = parseLightingId(replyId);
  if (lightingId) {
    await askStudioQuality(to, conversationId, { ...studio, lightingId });
    return true;
  }

  const qualityId = parseQualityId(replyId);
  if (qualityId) {
    await handleStudioGenerate(to, userId, conversationId, inputImageUrl, {
      ...studio,
      qualityId,
    });
    return true;
  }

  if (replyId === "studio_regenerate" && studio.analysis) {
    await handleStudioGenerate(
      to,
      userId,
      conversationId,
      inputImageUrl,
      studio,
      "studio_awaiting_actions",
    );
    return true;
  }

  if (replyId === "studio_another_style" && studio.analysis) {
    await updateConversation(conversationId, {
      step: "studio_awaiting_style",
      choices: studio,
    });
    await sendText(to, analysisIntro(studio.analysis, langOf(studio)));
    await sendList(
      to,
      say(langOf(studio), "studio_pick_style"),
      "Choose style",
      styleListRows(studio.analysis.category, studio.analysis),
    );
    return true;
  }

  if (replyId === "studio_enhance" && studio.analysis) {
    const nextQuality: QualityId =
      studio.qualityId === "standard"
        ? "hd"
        : studio.qualityId === "hd"
          ? "ultra"
          : "ultra";
    await handleStudioGenerate(
      to,
      userId,
      conversationId,
      inputImageUrl,
      {
        ...studio,
        qualityId: nextQuality,
      },
      "studio_awaiting_actions",
    );
    return true;
  }

  if (replyId === "studio_create_ad") {
    await startAdInterview(to, conversationId, langOf(studio));
    return true;
  }

  if (replyId === "studio_done") {
    const { resetConversation } = await import("@/lib/conversation");
    const { getUserQuota, formatQuotaMessage } = await import("@/lib/paywall");
    await resetConversation(conversationId);
    const quota = await getUserQuota(userId);
    await sendText(
      to,
      say(langOf(studio), "studio_done_message") +
        "\n\n" +
        formatQuotaMessage(quota),
    );
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
  if (!studio.analysis) return false;

  const lang = langOf(studio);
  const intent = parseStudioIntent(body, studio.analysis);

  if (step === "studio_awaiting_style") {
    const handled = await maybeFastTrackFromIntent(
      to,
      userId,
      conversationId,
      inputImageUrl,
      studio,
      intent,
    );
    if (handled) return true;

    await sendText(to, say(lang, "studio_intent_hint"));
    return true;
  }

  if (step === "studio_awaiting_angle" || step === "studio_awaiting_lighting") {
    if (intent.angleId || intent.lightingId || intent.skipToGenerate) {
      const merged = mergeIntentWithAnalysis(intent, studio.analysis);
      const updated: StudioChoices = {
        ...studio,
        angleId: merged.angleId,
        lightingId: merged.lightingId,
        qualityId: merged.qualityId,
      };
      await askStudioQuality(to, conversationId, updated);
      return true;
    }
  }

  if (step === "studio_awaiting_quality") {
    if (/generate|go|start|yes|ok|haan|ha|theek/i.test(body)) {
      await handleStudioGenerate(to, userId, conversationId, inputImageUrl, studio);
      return true;
    }
  }

  if (step === "studio_awaiting_actions") {
    await sendText(to, say(lang, "studio_use_actions"));
    return true;
  }

  return false;
}

export function studioGenerationErrorStep(
  choices: StudioChoices,
): "studio_awaiting_style" | "studio_awaiting_quality" {
  if (choices.styleId && choices.qualityId) return "studio_awaiting_quality";
  return "studio_awaiting_style";
}
