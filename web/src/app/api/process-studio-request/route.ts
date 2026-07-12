import { processStudioRequest } from "@/lib/studio-engine-core";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      imageUrl?: string;
      mode?: "catalog" | "ad";
      userVibeText?: string;
      backgroundPromptOverride?: string;
      uploadUserId?: string;
    };

    if (!body.imageUrl || typeof body.imageUrl !== "string") {
      return Response.json(
        { ok: false, error: "imageUrl is required" },
        { status: 400 },
      );
    }

    if (body.mode !== "catalog" && body.mode !== "ad") {
      return Response.json(
        { ok: false, error: 'mode must be "catalog" or "ad"' },
        { status: 400 },
      );
    }

    const result = await processStudioRequest({
      imageUrl: body.imageUrl,
      mode: body.mode,
      userVibeText: body.userVibeText,
      backgroundPromptOverride: body.backgroundPromptOverride,
      uploadUserId: body.uploadUserId,
    });

    if (!result.ok) {
      return Response.json(result);
    }

    // Don't send raw PNG buffer over JSON — URL + metadata is enough for HTTP clients
    const { png: _png, ...payload } = result;
    return Response.json(payload);
  } catch (error) {
    console.error("POST /api/process-studio-request failed", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Studio processing failed",
      },
      { status: 500 },
    );
  }
}
