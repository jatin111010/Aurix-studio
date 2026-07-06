import { buildVariationPlans } from "@/lib/studio-prompt";
import type { StudioChoices } from "@/lib/studio-options";
import { diecutImage, editImage, getPhotoroomMode } from "@/lib/photoroom";
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
};

function photoroomEnhancements(qualityId: StudioChoices["qualityId"]) {
  const q = qualityId ?? "standard";
  return {
    // Let Photoroom relight the product to match the scene (avoids pasted look).
    lightingMode: "ai.auto" as const,
    shadowMode: "ai.soft" as const,
    // Photoroom expands short prompts into richer scenes — better backgrounds.
    expandPromptMode: "ai.auto" as const,
    upscaleMode: q === "ultra" ? ("ai.slow" as const) : undefined,
  };
}

/**
 * Build studio variations one-by-one and call `onVariation` as each finishes.
 * Sends images to the user progressively so a slow 3rd render doesn't block delivery.
 */
export async function buildStudioVariationsProgressive(
  inputImageUrl: string,
  choices: StudioChoices,
  onVariation: (variation: StudioVariation) => Promise<void>,
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

  const plans = await buildVariationPlans(choices);
  const qualityId = choices.qualityId ?? "standard";
  const enhancements = photoroomEnhancements(qualityId);
  const seedBase = stableSeedFromText(`${inputImageUrl}|${choices.styleId}|${qualityId}`);

  const variations: StudioVariation[] = [];

  // Use the original photo — Photoroom removes background, relights, shadows, and
  // composites in one pass (much more natural than pre-cutout compositing).
  for (let idx = 0; idx < plans.length; idx += 1) {
    const plan = plans[idx];
    const png = await editImage({
      imageUrl: inputImageUrl,
      backgroundPrompt: plan.backgroundPrompt,
      backgroundSeed: seedBase + idx * 101,
      ...enhancements,
      padding: plan.padding,
    });

    const variation: StudioVariation = {
      label: plan.label,
      png,
      styleLabel: plan.styleLabel,
      mood: plan.mood,
    };
    variations.push(variation);
    await onVariation(variation);
  }

  const primaryStyle =
    choices.styleId === "ai_recommended"
      ? (choices.analysis?.recommendedStyleId ?? "white_studio")
      : choices.styleId;

  return {
    variations,
    studioStyle: "scene",
    backgroundId: primaryStyle,
    photoroomMode: getPhotoroomMode(),
    choices,
  };
}

/** @deprecated Use buildStudioVariationsProgressive */
export async function buildStudioVariations(
  inputImageUrl: string,
  choices: StudioChoices,
): Promise<BuiltStudioSet> {
  return buildStudioVariationsProgressive(inputImageUrl, choices, async () => {});
}

function stableSeedFromText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 1_000_000_000;
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
    const url = await uploadOutputPng(userId, v.png);
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
    },
    photoroom_mode: built.photoroomMode,
  });
}
