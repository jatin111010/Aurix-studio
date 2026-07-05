import { NextRequest, NextResponse } from "next/server";
import { BACKGROUNDS } from "@/lib/config";
import { editImage, getPhotoroomMode } from "@/lib/photoroom";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Test endpoint for Photoroom (sandbox by default).
 * POST multipart: image (file) + optional backgroundId
 * or JSON: { imageUrl, backgroundId }
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.PHOTOROOM_API_KEY) {
      return NextResponse.json(
        { error: "Set PHOTOROOM_API_KEY in .env.local" },
        { status: 500 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    let imageFile: Blob | undefined;
    let imageUrl: string | undefined;
    let backgroundId = "studio";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("image");
      if (file instanceof File) {
        imageFile = file;
      }
      const bg = form.get("backgroundId");
      if (typeof bg === "string" && bg) backgroundId = bg;
      const url = form.get("imageUrl");
      if (typeof url === "string" && url) imageUrl = url;
    } else {
      const body = (await request.json()) as {
        imageUrl?: string;
        backgroundId?: string;
      };
      imageUrl = body.imageUrl;
      if (body.backgroundId) backgroundId = body.backgroundId;
    }

    const background = BACKGROUNDS.find((b) => b.id === backgroundId);
    const backgroundPrompt =
      background?.prompt ?? "clean soft studio backdrop";

    if (!imageFile && !imageUrl) {
      return NextResponse.json(
        { error: "Upload an image or provide imageUrl" },
        { status: 400 },
      );
    }

    const png = await editImage({
      imageFile,
      imageUrl,
      backgroundPrompt,
      padding: 0.1,
    });

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "X-Photoroom-Mode": getPhotoroomMode(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
