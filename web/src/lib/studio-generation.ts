import { runStudioEngine } from "@/lib/studio-engine-client";
import { buildVariationPlans } from "@/lib/studio-prompt";
import type { StudioChoices } from "@/lib/studio-options";
import { STUDIO_STYLES } from "@/lib/studio-options";
import { diecutImage, getPhotoroomMode } from "@/lib/photoroom";
import { uploadOutputPng } from "@/lib/storage";
import { getSupabaseAdmin } from "@/lib/supabase";
import { consumeCredit, type CreditCheck } from "@/lib/users";

export type StudioVariation = {
  label: "A" | "B" | "C";
  png: Buffer;
  styleLabel: string;
  mood: string;
  outputUrl?: string;
};

export type BuiltStudioSet = {
  variations: StudioVariation[];
  studioStyle: "scene" | "diecut";
  backgroundId: string;
  photoroomMode: string;
  choices: StudioChoices;
  userGuidance?: string;
};

export class StudioUnusableError extends Error {
  guidance: string;

  constructor(guidance: string) {
    super(guidance);
    this.name = "StudioUnusableError";
    this.guidance = guidance;
  }
}

function resolvePrimaryStyle(choices: StudioChoices) {
  return choices.styleId === "ai_recommended"
    ? (choices.analysis?.recommendedStyleId ?? "white_studio")
    : choices.styleId;
}

function isCatalogStyle(choices: StudioChoices): boolean {
  const id = resolvePrimaryStyle(choices);
  return id === "white_studio" || id === "ecommerce";
}

function vibeFromChoices(choices: StudioChoices, extra?: string): string {
  const styleId = resolvePrimaryStyle(choices);
  const styleLabel = STUDIO_STYLES[styleId]?.label ?? "studio";
  const setting = choices.analysis?.idealSetting;
  const custom = choices.customPrompt?.trim();
  const parts = [
    custom,
    extra,
    styleLabel,
    setting,
    choices.analysis?.mainProduct,
    choices.analysis?.productClarity,
  ].filter(Boolean);
  return parts.join(" — ").slice(0, 160);
}

/**
 * Build studio output via the Studio Engine (GPT-4o + Photoroom).
 * New flow: one selected big prompt → one best image (1 credit).
 * Legacy multi-variation path kept when no selectedPromptText is set.
 */
export async function buildStudioVariationsProgressive(
  inputImageUrl: string,
  choices: StudioChoices,
  onVariation: (variation: StudioVariation) => Promise<void>,
  options?: { uploadUserId?: string },
): Promise<BuiltStudioSet> {
  if (choices.studioStyle === "diecut" || choices.styleId === "diecut") {
    const png = await diecutImage({
      imageUrl: inputImageUrl,
      padding: 0.05,
    });
    const variation: StudioVariation = {
      label: "A",
      png,
      styleLabel: "Transparent PNG",
      mood: "diecut",
    };
    await onVariation(variation);
    return {
      variations: [variation],
      studioStyle: "diecut",
      backgroundId: "diecut",
      photoroomMode: getPhotoroomMode(),
      choices,
    };
  }

  const uploadUserId = options?.uploadUserId;
  const selectedPrompt = choices.selectedPromptText?.trim();

  // New Studio Prompt Director flow → single best image
  if (selectedPrompt && selectedPrompt.length >= 20) {
    const result = await runStudioEngine({
      imageUrl: inputImageUrl,
      mode: "ad",
      userVibeText: selectedPrompt.slice(0, 160),
      backgroundPromptOverride: selectedPrompt,
      uploadUserId,
    });

    if (!result.ok) {
      throw new StudioUnusableError(result.user_guidance);
    }

    const label =
      choices.promptOptions?.find((p) => p.id === choices.selectedPromptId)
        ?.title ||
      (choices.selectedPromptId === 0 ? "Custom Prompt" : "Studio Look");

    const variation: StudioVariation = {
      label: "A",
      png: result.png,
      styleLabel: label.slice(0, 48),
      mood: "prompt-director",
      outputUrl: result.outputUrl.startsWith("http")
        ? result.outputUrl
        : undefined,
    };
    await onVariation(variation);

    return {
      variations: [variation],
      studioStyle: "scene",
      backgroundId: "prompt_director",
      photoroomMode: getPhotoroomMode(),
      choices,
      userGuidance: result.user_guidance,
    };
  }

  const primaryStyle = resolvePrimaryStyle(choices);
  const variations: StudioVariation[] = [];
  let userGuidance: string | undefined;

  // Catalog styles → 1 white packshot + 2 lifestyle ad vibes
  if (isCatalogStyle(choices)) {
    const catalog = await runStudioEngine({
      imageUrl: inputImageUrl,
      mode: "catalog",
      uploadUserId,
    });

    if (!catalog.ok) {
      throw new StudioUnusableError(catalog.user_guidance);
    }

    userGuidance = catalog.user_guidance;
    const vA: StudioVariation = {
      label: "A",
      png: catalog.png,
      styleLabel: "White Catalog",
      mood: "catalog",
      outputUrl: catalog.outputUrl.startsWith("http")
        ? catalog.outputUrl
        : undefined,
    };
    variations.push(vA);
    await onVariation(vA);

    const lifestyleVibes = [
      vibeFromChoices(choices, "kitchen table lifestyle with matching props"),
      vibeFromChoices(choices, "premium gift display with candles and marble"),
    ];

    for (let i = 0; i < lifestyleVibes.length; i += 1) {
      const result = await runStudioEngine({
        imageUrl: inputImageUrl,
        mode: "ad",
        userVibeText: lifestyleVibes[i],
        uploadUserId,
      });
      if (!result.ok) continue;

      const variation: StudioVariation = {
        label: i === 0 ? "B" : "C",
        png: result.png,
        styleLabel: result.marketing.vibe.slice(0, 40) || `Lifestyle ${i + 1}`,
        mood: "ad",
        outputUrl: result.outputUrl.startsWith("http")
          ? result.outputUrl
          : undefined,
      };
      variations.push(variation);
      await onVariation(variation);
    }
  } else {
    // Scene / lifestyle styles → 3 ad-engine shoots with distinct vibes
    const plans = await buildVariationPlans(choices, inputImageUrl);

    for (let idx = 0; idx < plans.length; idx += 1) {
      const plan = plans[idx];
      const result = await runStudioEngine({
        imageUrl: inputImageUrl,
        mode: "ad",
        userVibeText: vibeFromChoices(
          choices,
          `${plan.styleLabel}. ${plan.backgroundPrompt.slice(0, 120)}`,
        ),
        uploadUserId,
      });

      if (!result.ok) {
        if (idx === 0) throw new StudioUnusableError(result.user_guidance);
        continue;
      }

      if (!userGuidance) userGuidance = result.user_guidance;

      const variation: StudioVariation = {
        label: plan.label,
        png: result.png,
        styleLabel: plan.styleLabel,
        mood: plan.mood,
        outputUrl: result.outputUrl.startsWith("http")
          ? result.outputUrl
          : undefined,
      };
      variations.push(variation);
      await onVariation(variation);
    }
  }

  if (variations.length === 0) {
    throw new Error("Studio engine produced no variations");
  }

  return {
    variations,
    studioStyle: "scene",
    backgroundId: primaryStyle,
    photoroomMode: getPhotoroomMode(),
    choices,
    userGuidance,
  };
}

/** @deprecated Use buildStudioVariationsProgressive */
export async function buildStudioVariations(
  inputImageUrl: string,
  choices: StudioChoices,
): Promise<BuiltStudioSet> {
  return buildStudioVariationsProgressive(inputImageUrl, choices, async () => {});
}

export async function saveStudioSet(
  userId: string,
  inputImageUrl: string,
  built: BuiltStudioSet,
  credit: CreditCheck & { ok: true },
): Promise<void> {
  await consumeCredit(userId, "studio", credit.source);

  const outputUrls: string[] = [];
  for (const v of built.variations) {
    const url = v.outputUrl ?? (await uploadOutputPng(userId, v.png));
    v.outputUrl = url;
    outputUrls.push(url);
  }

  const supabase = getSupabaseAdmin();
  await supabase.from("generations").insert({
    user_id: userId,
    type: "studio",
    source: credit.source,
    input_url: inputImageUrl,
    output_url: outputUrls[0] ?? null,
    choices: {
      ...built.choices,
      variationCount: built.variations.length,
      outputUrls,
      studioStyle: built.studioStyle,
      backgroundId: built.backgroundId,
      userGuidance: built.userGuidance,
      engine: "studio-engine-v1",
    },
    photoroom_mode: built.photoroomMode,
  });
}
