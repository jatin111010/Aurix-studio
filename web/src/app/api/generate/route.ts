import { NextRequest, NextResponse } from "next/server";
import { resolveBackground } from "@/lib/backgrounds";
import { diecutImage, editImage, getPhotoroomMode } from "@/lib/photoroom";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Test endpoint for Photoroom (sandbox by default).
 * POST multipart: image (file) + optional backgroundId + optional studioStyle=diecut
 * or JSON: { imageUrl, backgroundId, studioStyle }
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
    let customBackgroundPrompt: string | undefined;
    let studioStyle = "scene";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("image");
      if (file instanceof File) {
        imageFile = file;
      }
      const bg = form.get("backgroundId");
      if (typeof bg === "string" && bg) backgroundId = bg;
      const custom = form.get("customBackgroundPrompt");
      if (typeof custom === "string" && custom) customBackgroundPrompt = custom;
      const style = form.get("studioStyle");
      if (typeof style === "string" && style) studioStyle = style;
      const url = form.get("imageUrl");
      if (typeof url === "string" && url) imageUrl = url;
    } else {
      const body = (await request.json()) as {
        imageUrl?: string;
        backgroundId?: string;
        customBackgroundPrompt?: string;
        studioStyle?: string;
      };
      imageUrl = body.imageUrl;
      if (body.backgroundId) backgroundId = body.backgroundId;
      if (body.customBackgroundPrompt) {
        customBackgroundPrompt = body.customBackgroundPrompt;
      }
      if (body.studioStyle) studioStyle = body.studioStyle;
    }

    if (!imageFile && !imageUrl) {
      return NextResponse.json(
        { error: "Upload an image or provide imageUrl" },
        { status: 400 },
      );
    }

    if (studioStyle === "diecut") {
      const png = await diecutImage({ imageFile, imageUrl, padding: 0.05 });
      return new NextResponse(new Uint8Array(png), {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "X-Photoroom-Mode": getPhotoroomMode(),
          "X-Studio-Style": "diecut",
          "Cache-Control": "no-store",
        },
      });
    }

    const background = resolveBackground(backgroundId, customBackgroundPrompt);
    const backgroundPrompt = background.prompt;

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
