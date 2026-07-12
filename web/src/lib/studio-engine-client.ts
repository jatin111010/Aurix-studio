/**
 * Client for the Studio Engine.
 * - Default: in-process (works on Vercel WhatsApp webhook)
 * - Optional: STUDIO_ENGINE_URL → HTTP to Express server
 */

import {
  processStudioRequest,
  type ProcessStudioRequestInput,
  type StudioEngineResult,
} from "@/lib/studio-engine-core";

export type {
  ProcessStudioRequestInput,
  StudioEngineMode,
  StudioEngineResult,
} from "@/lib/studio-engine-core";

export async function runStudioEngine(
  input: ProcessStudioRequestInput,
): Promise<StudioEngineResult> {
  const base = process.env.STUDIO_ENGINE_URL?.trim().replace(/\/$/, "");

  // Prefer external Express engine when configured (local dual-server setup)
  if (base) {
    const response = await fetch(`${base}/process-studio-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: input.imageUrl,
        mode: input.mode,
        userVibeText: input.userVibeText,
        backgroundPromptOverride: input.backgroundPromptOverride,
      }),
    });

    const json = (await response.json()) as StudioEngineResult & {
      error?: string;
      outputUrl?: string;
    };

    if (!response.ok) {
      throw new Error(json.error || `Studio engine HTTP ${response.status}`);
    }

    // Express returns URL only — download bytes for WhatsApp send
    if (json.ok && json.usable && json.outputUrl && !("png" in json && json.png)) {
      const img = await fetch(json.outputUrl);
      if (!img.ok) {
        throw new Error(`Failed to download engine output: ${img.status}`);
      }
      const png = Buffer.from(await img.arrayBuffer());
      return { ...json, png } as StudioEngineResult;
    }

    return json;
  }

  return processStudioRequest(input);
}
