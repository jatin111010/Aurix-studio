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

  const plans = await buildVariationPlans(choices);

  const results = await Promise.all(
    plans.map(async (plan) => {
      const png = await editImage({
        imageUrl: inputImageUrl,
        backgroundPrompt: plan.backgroundPrompt,
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
