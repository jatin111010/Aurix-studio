"use client";

import { useEffect, useState } from "react";

type Health = {
  ok: boolean;
  service: string;
  photoroomMode: string;
  supabaseConfigured: boolean;
  photoroomConfigured: boolean;
  whatsappConfigured: boolean;
  phase2Ready: boolean;
  webhookUrl: string | null;
  verifyToken: string;
  missing: string[];
};

export function Phase2Setup() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data: Health) => setHealth(data))
      .catch(() => setError("Could not load status. Is the server running?"));
  }, []);

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
    );
  }

  if (!health) {
    return <p className="text-sm text-zinc-500">Loading Phase 2 status…</p>;
  }

  const checks = [
    { ok: health.photoroomConfigured, label: "Photoroom API key" },
    { ok: health.supabaseConfigured, label: "Supabase connected" },
    { ok: Boolean(health.webhookUrl), label: "Public app URL (Vercel)" },
    { ok: health.whatsappConfigured, label: "WhatsApp token + phone number ID" },
  ];

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-zinc-900">Phase 2 — WhatsApp setup</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            health.phase2Ready
              ? "bg-green-100 text-green-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {health.phase2Ready ? "Ready to test" : "Setup in progress"}
        </span>
      </div>

      <ul className="mb-4 space-y-2">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2">
            <span>{c.ok ? "✅" : "⬜"}</span>
            <span className={c.ok ? "text-zinc-700" : "text-zinc-500"}>{c.label}</span>
          </li>
        ))}
      </ul>

      {health.missing.length > 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
          <strong>Still needed on Vercel → Settings → Environment Variables:</strong>{" "}
          {health.missing.join(", ")}
        </p>
      )}

      {health.webhookUrl && (
        <div className="space-y-3 rounded-xl bg-zinc-50 p-4">
          <p className="font-medium text-zinc-900">Meta Developer Console → WhatsApp → Configuration</p>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Webhook URL</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="break-all rounded bg-white px-2 py-1 text-xs text-zinc-800">
                {health.webhookUrl}
              </code>
              <button
                type="button"
                onClick={() => copy(health.webhookUrl!, "webhook")}
                className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800"
              >
                {copied === "webhook" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Verify token</p>
            <code className="rounded bg-white px-2 py-1 text-xs">{health.verifyToken}</code>
          </div>
          <p className="text-xs text-zinc-500">
            Subscribe to <strong>messages</strong>. Add your phone as a test recipient in Meta → API Setup.
          </p>
        </div>
      )}

      {!health.webhookUrl && (
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs">
          Set <code className="rounded bg-zinc-200 px-1">NEXT_PUBLIC_APP_URL</code> on Vercel to your
          live URL (e.g. https://your-app.vercel.app) and redeploy to show the webhook link here.
        </p>
      )}

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs">
        <li>Paste webhook URL + verify token in Meta → click Verify and Save</li>
        <li>Add WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID from Meta → API Setup</li>
        <li>Redeploy Vercel, then message your WhatsApp number with a product photo</li>
      </ol>
    </section>
  );
}
