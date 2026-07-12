/**
 * Photoroom Image Editing API.
 * Sandbox: prepend sandbox_ to the API key (watermarked, free test quota).
 * Production: use the live key as-is (PHOTOROOM_MODE=production).
 * @see https://docs.photoroom.com/image-editing-api-plus-plan/sandbox-mode
 */

const PHOTOROOM_EDIT_URL = "https://image-api.photoroom.com/v2/edit";

export type PhotoroomMode = "sandbox" | "production";

export type PhotoroomEditOptions = {
  /** Public URL of the source product image */
  imageUrl?: string;
  /** Raw image bytes (preferred when file is already in memory) */
  imageFile?: Blob | Buffer;
  imageFileName?: string;
  /** Scene description for AI background */
  backgroundPrompt?: string;
  /** Hex without #, e.g. F5F5F5 — used when no AI prompt */
  backgroundColor?: string;
  /**
   * Seed for AI background generation (makes results more stable for the same prompt).
   * Use different seeds to force genuinely different variations.
   */
  backgroundSeed?: number;
  /**
   * Controls prompt expansion behavior. When set to `ai.never`, Photoroom will not
   * auto-expand the prompt (often improves prompt adherence for packshots).
   */
  expandPromptMode?: "ai.auto" | "ai.never";
  /**
   * Relighting on the main image. `ai.preserve-hue-and-saturation` usually keeps
   * packaging colors more accurate.
   */
  lightingMode?: "ai.auto" | "ai.preserve-hue-and-saturation" | "ai.optimize-portrait";
  /** Beautify pass for packshot-style product images. */
  beautifyMode?: "ai.auto" | "ai.food" | "ai.car";
  /** Upscale the output for sharper results (slow = best quality). */
  upscaleMode?: "ai.fast" | "ai.slow";
  /** Omit or pass null when using AI backgrounds (they already include shadows). */
  shadowMode?:
    | "ai.soft"
    | "ai.hard"
    | "ai.floating"
    | "ai.auto-with-overrides"
    | null;
  /** Advanced shadow overrides (requires pr-ai-shadows-model-version: 2026-04-15) */
  shadowSubjectPoseOverride?: string;
  shadowDirectionOverride?: string;
  shadowIntensityOverride?: number | string;
  shadowSoftnessOverride?: number | string;
  textRemovalMode?: "ai.artificial" | "ai.natural" | "ai.all";
  uncropMode?: "ai.auto";
  exportFormat?: "png" | "webp" | "jpg";
  padding?: number;
  /**
   * Strict placement for AI backgrounds (flat padding is often ignored by scene gen).
   * When set, sends position.mode=custom + position.padding + alignments.
   */
  positionMode?: "custom";
  positionPadding?: number | string;
  positionVerticalAlignment?: "center" | "top" | "bottom";
  positionHorizontalAlignment?: "center" | "left" | "right";
  verticalAlignment?: "center" | "top" | "bottom";
  horizontalAlignment?: "center" | "left" | "right";
  /** Tight crop to product subject — die-cut / sticker style */
  outputSize?: "auto" | "originalImage" | "croppedSubject" | string;
};

function getMode(): PhotoroomMode {
  const mode = (process.env.PHOTOROOM_MODE ?? "sandbox").toLowerCase();
  return mode === "production" ? "production" : "sandbox";
}

/** Resolves API key; in sandbox mode ensures `sandbox_` prefix. */
export function getPhotoroomApiKey(): string {
  const raw = process.env.PHOTOROOM_API_KEY?.trim();
  if (!raw) {
    throw new Error("PHOTOROOM_API_KEY is not set");
  }

  if (getMode() === "sandbox") {
    return raw.startsWith("sandbox_") ? raw : `sandbox_${raw}`;
  }

  // Production: strip accidental sandbox_ prefix
  return raw.startsWith("sandbox_") ? raw.slice("sandbox_".length) : raw;
}

export function getPhotoroomMode(): PhotoroomMode {
  return getMode();
}

/** Premium studio headers for backgrounds + advanced shadows. */
export function photoroomStudioHeaders(apiKey: string): Record<string, string> {
  return {
    "x-api-key": apiKey,
    "pr-ai-background-model-version": "3",
    "pr-ai-shadows-model-version": "2026-04-15",
  };
}

function appendIfPresent(
  form: FormData,
  key: string,
  value: string | number | undefined | null,
): void {
  if (value === undefined || value === null) return;
  const str = String(value).trim();
  if (!str) return;
  form.append(key, str);
}

export async function editImage(
  options: PhotoroomEditOptions,
): Promise<Buffer> {
  const apiKey = getPhotoroomApiKey();
  const form = new FormData();

  if (options.imageFile) {
    const blob =
      options.imageFile instanceof Blob
        ? options.imageFile
        : new Blob([new Uint8Array(options.imageFile)]);
    form.append(
      "imageFile",
      blob,
      options.imageFileName ?? "product.jpg",
    );
  } else if (options.imageUrl) {
    form.append("imageUrl", options.imageUrl);
  } else {
    throw new Error("Provide imageFile or imageUrl");
  }

  if (options.backgroundPrompt) {
    form.append("background.prompt", options.backgroundPrompt);
    if (typeof options.backgroundSeed === "number") {
      form.append("background.seed", String(options.backgroundSeed));
    }
    if (options.expandPromptMode) {
      form.append("expandPrompt.mode", options.expandPromptMode);
    }
  } else if (options.backgroundColor) {
    form.append("background.color", options.backgroundColor.replace("#", ""));
  } else {
    form.append("background.color", "F5F5F5");
  }

  appendIfPresent(form, "lighting.mode", options.lightingMode);
  appendIfPresent(form, "beautify.mode", options.beautifyMode);
  appendIfPresent(form, "upscale.mode", options.upscaleMode);
  appendIfPresent(form, "textRemoval.mode", options.textRemovalMode);
  appendIfPresent(form, "uncrop.mode", options.uncropMode);
  appendIfPresent(form, "export.format", options.exportFormat ?? "png");

  if (options.shadowMode) {
    form.append("shadow.mode", options.shadowMode);
    if (options.shadowMode === "ai.auto-with-overrides") {
      appendIfPresent(
        form,
        "shadow.subjectPoseOverride",
        options.shadowSubjectPoseOverride,
      );
      appendIfPresent(
        form,
        "shadow.directionOverride",
        options.shadowDirectionOverride,
      );
      appendIfPresent(
        form,
        "shadow.intensityOverride",
        options.shadowIntensityOverride,
      );
      appendIfPresent(
        form,
        "shadow.softnessOverride",
        options.shadowSoftnessOverride,
      );
    }
  }

  form.append("padding", String(options.padding ?? 0.22));

  // Dead-center cutout — never keep left/right source framing
  form.append("referenceBox", "subjectBox");
  form.append("ignorePaddingAndSnapOnCroppedSides", "false");
  form.append("horizontalAlignment", options.horizontalAlignment ?? "center");
  form.append("verticalAlignment", options.verticalAlignment ?? "center");

  // Strict placement mirrors
  const positionPadding = options.positionPadding ?? options.padding ?? 0.22;
  form.append("position.mode", options.positionMode ?? "custom");
  form.append("position.padding", String(positionPadding));
  form.append(
    "position.verticalAlignment",
    options.positionVerticalAlignment ?? "center",
  );
  form.append(
    "position.horizontalAlignment",
    options.positionHorizontalAlignment ?? "center",
  );

  if (options.outputSize) {
    form.append("outputSize", options.outputSize);
  }

  const response = await fetch(PHOTOROOM_EDIT_URL, {
    method: "POST",
    headers: photoroomStudioHeaders(apiKey),
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Photoroom ${getMode()} error ${response.status}: ${detail || response.statusText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Low-level multipart edit from a pre-built field map (+ optional file).
 * Used by Studio Engine with OpenAI api_blueprint fields.
 */
export async function editImageFromFields(
  fields: Record<string, string>,
  imageFile?: Buffer,
  imageFileName = "product.png",
): Promise<Buffer> {
  const apiKey = getPhotoroomApiKey();
  const form = new FormData();

  // Re-lock dead-center placement — never keep source left/right framing
  const pad = (
    fields["position.padding"] ||
    fields.padding ||
    "0.22"
  ).trim();
  fields.referenceBox = "subjectBox";
  fields.ignorePaddingAndSnapOnCroppedSides = "false";
  fields.horizontalAlignment = "center";
  fields.verticalAlignment = "center";
  fields["position.mode"] = "custom";
  fields["position.padding"] = pad;
  fields["position.verticalAlignment"] = "center";
  fields["position.horizontalAlignment"] = "center";
  fields.padding = pad;

  if (imageFile) {
    form.append(
      "imageFile",
      new Blob([new Uint8Array(imageFile)]),
      imageFileName,
    );
  }

  for (const [key, value] of Object.entries(fields)) {
    if (imageFile && key === "imageUrl") continue;
    const trimmed = String(value ?? "").trim();
    if (!trimmed) continue;
    form.append(key, trimmed);
  }

  const response = await fetch(PHOTOROOM_EDIT_URL, {
    method: "POST",
    headers: photoroomStudioHeaders(apiKey),
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Photoroom ${getMode()} error ${response.status}: ${detail || response.statusText}`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Die-cut: remove background, transparent PNG, cropped tight to the product.
 */
export async function diecutImage(
  options: Pick<
    PhotoroomEditOptions,
    "imageUrl" | "imageFile" | "imageFileName" | "padding"
  >,
): Promise<Buffer> {
  const apiKey = getPhotoroomApiKey();
  const form = new FormData();

  if (options.imageFile) {
    const blob =
      options.imageFile instanceof Blob
        ? options.imageFile
        : new Blob([new Uint8Array(options.imageFile)]);
    form.append(
      "imageFile",
      blob,
      options.imageFileName ?? "product.jpg",
    );
  } else if (options.imageUrl) {
    form.append("imageUrl", options.imageUrl);
  } else {
    throw new Error("Provide imageFile or imageUrl");
  }

  form.append("removeBackground", "true");
  form.append("background.color", "transparent");
  form.append("background.scaling", "fill");
  form.append("outputSize", "croppedSubject");
  form.append("padding", String(options.padding ?? 0.05));
  form.append("export.format", "png");

  const response = await fetch(PHOTOROOM_EDIT_URL, {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Photoroom die-cut ${getMode()} error ${response.status}: ${detail || response.statusText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
