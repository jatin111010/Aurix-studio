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
  /** Omit or pass null when using AI backgrounds (they already include shadows). */
  shadowMode?: "ai.soft" | "ai.hard" | "ai.floating" | null;
  padding?: number;
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

  const usingAiBackground = Boolean(options.backgroundPrompt);

  if (options.backgroundPrompt) {
    form.append("background.prompt", options.backgroundPrompt);
  } else if (options.backgroundColor) {
    form.append("background.color", options.backgroundColor.replace("#", ""));
  } else {
    form.append("background.color", "F5F5F5");
  }

  // AI backgrounds already include lighting/shadows. Combining them with
  // AI shadows often fails with "Failed to apply shadow".
  const shadowMode = usingAiBackground
    ? (options.shadowMode ?? null)
    : (options.shadowMode ?? "ai.soft");
  if (shadowMode) {
    form.append("shadow.mode", shadowMode);
  }
  form.append("padding", String(options.padding ?? 0.1));

  if (options.outputSize) {
    form.append("outputSize", options.outputSize);
  }

  const response = await fetch(PHOTOROOM_EDIT_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      // Prefer newer AI background model when available
      "pr-ai-background-model-version": "3",
    },
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
 * Die-cut: remove background, transparent PNG, cropped tight to the product.
 * @see https://docs.photoroom.com/tutorials/how-to-create-sticker-images
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
