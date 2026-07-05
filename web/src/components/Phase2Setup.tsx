"use client";

import { useEffect, useState } from "react";

type Health = {
  ok: boolean;
  photoroomConfigured: boolean;
  supabaseConfigured: boolean;
  whatsappConfigured: boolean;
  razorpayConfigured: boolean;
  razorpayWebhookConfigured: boolean;
  phase2Ready: boolean;
  phase4Ready: boolean;
  webhookUrl: string | null;
  razorpayWebhookUrl: string | null;
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
      .catch(() => setError("Could not load status."));
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
    return <p className="text-sm text-zinc-500">Loading setup status…</p>;
  }

  const checks = [
    { ok: health.photoroomConfigured, label: "Photoroom API key" },
    { ok: health.supabaseConfigured, label: "Supabase connected" },
    { ok: Boolean(health.webhookUrl), label: "Public app URL (Vercel)" },
    { ok: health.whatsappConfigured, label: "WhatsApp token + phone number ID" },
    { ok: health.razorpayConfigured, label: "Razorpay API keys" },
    { ok: health.razorpayWebhookConfigured, label: "Razorpay webhook secret" },
  ];

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-zinc-900">Setup checklist</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            health.phase4Ready
              ? "bg-green-100 text-green-800"
              : health.phase2Ready
                ? "bg-blue-100 text-blue-800"
                : "bg-amber-100 text-amber-800"
          }`}
        >
          {health.phase4Ready
            ? "Phase 4 ready — payments live"
            : health.phase2Ready
              ? "Phase 2 live — add Razorpay"
              : "Setup in progress"}
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
          <strong>Still needed on Vercel env:</strong> {health.missing.join(", ")}
        </p>
      )}

      {health.webhookUrl && (
        <div className="mb-4 space-y-3 rounded-xl bg-zinc-50 p-4">
          <p className="font-medium text-zinc-900">WhatsApp webhook (Meta Console)</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-white px-2 py-1 text-xs">
              {health.webhookUrl}
            </code>
            <button
              type="button"
              onClick={() => copy(health.webhookUrl!, "wa")}
              className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white"
            >
              {copied === "wa" ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs">
            Verify token: <code>{health.verifyToken}</code>
          </p>
        </div>
      )}

      {health.razorpayWebhookUrl && (
        <div className="space-y-3 rounded-xl bg-zinc-50 p-4">
          <p className="font-medium text-zinc-900">Razorpay webhook (Dashboard → Webhooks)</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-white px-2 py-1 text-xs">
              {health.razorpayWebhookUrl}
            </code>
            <button
              type="button"
              onClick={() => copy(health.razorpayWebhookUrl!, "rz")}
              className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white"
            >
              {copied === "rz" ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Enable event: <strong>payment_link.paid</strong>. Use the webhook secret as{" "}
            <code>RAZORPAY_WEBHOOK_SECRET</code> on Vercel.
          </p>
        </div>
      )}
    </section>
  );
}
