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

export async function buildStudioVariations(
  inputImageUrl: string,
  choices: StudioChoices,
): Promise<BuiltStudioSet> {
  if (choices.studioStyle === "diecut" || choices.styleId === "diecut") {
    const png = await diecutImage({
      imageUrl: inputImageUrl,
      padding: 0.05,
    });
    return {
      variations: [
        {
          label: "A",
          png,
          styleLabel: "Transparent PNG",
          mood: "diecut",
        },
      ],
      studioStyle: "diecut",
      backgroundId: "diecut",
      photoroomMode: getPhotoroomMode(),
      choices,
    };
  }

  // Key quality fix:
  // First create a clean cutout, then generate backgrounds behind that cutout.
  // This prevents extra objects from the original photo (e.g. props, frames, table edges)
  // from leaking into the final studio shot.
  const cutoutPng = await diecutImage({
    imageUrl: inputImageUrl,
    padding: 0.02,
  });

  const plans = await buildVariationPlans(choices);

  const qualityId = choices.qualityId ?? "standard";
  const upscaleMode =
    qualityId === "ultra" ? "ai.slow" : qualityId === "hd" ? "ai.fast" : undefined;
  const beautifyMode = "ai.auto" as const;
  const lightingMode = "ai.preserve-hue-and-saturation" as const;

  const seedBase = stableSeedFromText(`${inputImageUrl}|${choices.styleId}|${qualityId}`);

  const results = await Promise.all(
    plans.map(async (plan, idx) => {
      const png = await editImage({
        imageFile: cutoutPng,
        imageFileName: "product.png",
        backgroundPrompt: plan.backgroundPrompt,
        backgroundSeed: seedBase + idx * 101,
        expandPromptMode: "ai.never",
        beautifyMode,
        lightingMode,
        upscaleMode,
        padding: plan.padding,
      });
      return {
        label: plan.label,
        png,
        styleLabel: plan.styleLabel,
        mood: plan.mood,
      };
    }),
  );

  const primaryStyle =
    choices.styleId === "ai_recommended"
      ? (choices.analysis?.recommendedStyleId ?? "white_studio")
      : choices.styleId;

  return {
    variations: results,
    studioStyle: "scene",
    backgroundId: primaryStyle,
    photoroomMode: getPhotoroomMode(),
    choices,
  };
}

function stableSeedFromText(text: string): number {
  // Simple deterministic hash → positive 32-bit int
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
