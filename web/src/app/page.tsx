import { Phase2Setup } from "@/components/Phase2Setup";
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
            WhatsApp studio + ad posts are live. Phase 4 adds Razorpay subscriptions —
            deploy latest code and connect Razorpay to accept payments.
          </p>
        </header>

        <Phase2Setup />

        <SandboxTester />
      </main>
    </div>
  );
}
