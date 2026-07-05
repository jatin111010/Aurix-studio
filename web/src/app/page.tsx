import { SandboxTester } from "@/components/SandboxTester";

export default function Home() {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-700">
            Velora Studio
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            AI studio photoshoots on WhatsApp
          </h1>
          <p className="max-w-xl text-zinc-600">
            MVP scaffold: Supabase + Vercel + Photoroom. Start in{" "}
            <strong>sandbox</strong> (watermarked, free quota). Switch to
            production by setting <code className="rounded bg-zinc-200 px-1">PHOTOROOM_MODE=production</code>.
          </p>
        </header>

        <SandboxTester />

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          <h2 className="mb-2 font-semibold text-zinc-900">WhatsApp setup</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Deploy to Vercel (webhook needs a public HTTPS URL)</li>
            <li>
              Meta Developer Console → WhatsApp → Configuration → Webhook URL:{" "}
              <code className="rounded bg-zinc-100 px-1">/api/webhooks/whatsapp</code>
            </li>
            <li>
              Verify token: <code className="rounded bg-zinc-100 px-1">velora_verify_token</code> (or your{" "}
              <code className="rounded bg-zinc-100 px-1">WHATSAPP_VERIFY_TOKEN</code>)
            </li>
            <li>Add <code className="rounded bg-zinc-100 px-1">WHATSAPP_TOKEN</code> and{" "}
              <code className="rounded bg-zinc-100 px-1">WHATSAPP_PHONE_NUMBER_ID</code> to Vercel env</li>
            <li>Message the number: send a product photo → pick background → receive studio shot</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
