import {
  BACKGROUND_CUSTOM_ID,
  BACKGROUNDS,
  CUSTOM_BACKGROUND_CHOICE,
} from "@/lib/config";
import {
  enhanceCustomBackgroundPrompt,
  enhancePresetPrompt,
} from "@/lib/background-prompt";

export type ResolvedBackground = {
  id: string;
  label: string;
  prompt: string;
};

export function isValidBackgroundId(id: string): boolean {
  return (
    id === BACKGROUND_CUSTOM_ID || BACKGROUNDS.some((b) => b.id === id)
  );
}

/** Rows for WhatsApp list picker (9 presets + custom = 10 max). */
export function backgroundListRows(): Array<{
  id: string;
  title: string;
  description: string;
}> {
  return [
    ...BACKGROUNDS.map((b) => ({
      id: `bg_${b.id}`,
      title: b.label,
      description: b.prompt,
    })),
    {
      id: `bg_${CUSTOM_BACKGROUND_CHOICE.id}`,
      title: CUSTOM_BACKGROUND_CHOICE.label,
      description: CUSTOM_BACKGROUND_CHOICE.description,
    },
  ];
}

export function sanitizeCustomBackgroundPrompt(text: string): string | null {
  const cleaned = text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[<>{}]/g, "")
    .slice(0, 200);

  if (cleaned.length < 5) return null;
  return cleaned;
}

export function resolveBackground(
  backgroundId: string,
  customPrompt?: string,
): ResolvedBackground {
  if (backgroundId === BACKGROUND_CUSTOM_ID) {
    const raw =
      sanitizeCustomBackgroundPrompt(customPrompt ?? "") ??
      "clean soft studio backdrop";
    const prompt = `${raw}, professional product photography, soft commercial lighting`;
    const shortLabel = raw.length > 36 ? `${raw.slice(0, 36)}…` : raw;
    return {
      id: BACKGROUND_CUSTOM_ID,
      label: `Custom — ${shortLabel}`,
      prompt,
    };
  }

  const preset = BACKGROUNDS.find((b) => b.id === backgroundId);
  return {
    id: backgroundId,
    label: preset?.label ?? "Soft studio",
    prompt: enhancePresetPrompt(preset?.prompt ?? "clean soft studio backdrop"),
  };
}

/** AI-enhanced custom prompt for studio shots (better Photoroom results). */
export async function resolveBackgroundAsync(
  backgroundId: string,
  customPrompt?: string,
): Promise<ResolvedBackground> {
  if (backgroundId === BACKGROUND_CUSTOM_ID) {
    const raw =
      sanitizeCustomBackgroundPrompt(customPrompt ?? "") ??
      "clean soft studio backdrop";
    const prompt = await enhanceCustomBackgroundPrompt(raw);
    const shortLabel = raw.length > 36 ? `${raw.slice(0, 36)}…` : raw;
    return {
      id: BACKGROUND_CUSTOM_ID,
      label: `Custom — ${shortLabel}`,
      prompt,
    };
  }
  return resolveBackground(backgroundId);
}

export function getBackgroundDisplayLabel(
  backgroundId?: string,
  customPrompt?: string,
): string {
  if (!backgroundId) return "—";
  return resolveBackground(backgroundId, customPrompt).label;
}
