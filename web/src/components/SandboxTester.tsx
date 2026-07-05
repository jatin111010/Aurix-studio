"use client";

import { useState } from "react";
import {
  BACKGROUND_CUSTOM_ID,
  BACKGROUNDS,
  CUSTOM_BACKGROUND_CHOICE,
} from "@/lib/config";

export function SandboxTester() {
  const [file, setFile] = useState<File | null>(null);
  const [backgroundId, setBackgroundId] = useState("studio");
  const [studioStyle, setStudioStyle] = useState<"scene" | "diecut">("scene");
  const [customPrompt, setCustomPrompt] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a product photo first.");
      return;
    }

    if (studioStyle === "scene" && backgroundId === BACKGROUND_CUSTOM_ID && customPrompt.trim().length < 5) {
      setError("Describe your custom background (at least 5 characters).");
      return;
    }

    setLoading(true);
    setError(null);
    setPreviewUrl(null);
    setMode(null);

    try {
      const form = new FormData();
      form.append("image", file);
      form.append("studioStyle", studioStyle);
      if (studioStyle === "scene") {
        form.append("backgroundId", backgroundId);
        if (backgroundId === BACKGROUND_CUSTOM_ID) {
          form.append("customBackgroundPrompt", customPrompt.trim());
        }
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }

      setMode(res.headers.get("X-Photoroom-Mode"));
      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-lg space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          Product photo
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Use a clear JPG/PNG product photo (not a tiny icon or HEIC).
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          Studio style
        </label>
        <select
          value={studioStyle}
          onChange={(e) =>
            setStudioStyle(e.target.value as "scene" | "diecut")
          }
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="scene">With AI background scene</option>
          <option value="diecut">Die-cut (transparent PNG)</option>
        </select>
      </div>

      {studioStyle === "scene" && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Background
            </label>
            <select
              value={backgroundId}
              onChange={(e) => setBackgroundId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {BACKGROUNDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
              <option value={BACKGROUND_CUSTOM_ID}>
                {CUSTOM_BACKGROUND_CHOICE.label}
              </option>
            </select>
          </div>

          {backgroundId === BACKGROUND_CUSTOM_ID && (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Your background idea
              </label>
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. rustic wooden kitchen counter"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          )}
        </>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
      >
        {loading ? "Generating (sandbox)…" : "Test Photoroom sandbox"}
      </button>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {previewUrl && (
        <div className="space-y-2">
          {mode && (
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Mode: {mode}
              {mode === "sandbox" ? " (watermarked, free)" : " (live)"}
            </p>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Generated studio shot"
            className="w-full rounded-xl border border-zinc-200"
          />
        </div>
      )}
    </form>
  );
}
