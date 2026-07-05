import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/** Server-only client with service role (bypasses RLS). Use in API routes only. */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return adminClient;
}

export type UserRow = {
  id: string;
  phone: string;
  plan: string | null;
  free_used: number;
  brand_memory: Record<string, unknown> | null;
  created_at: string;
};

export type CreditsRow = {
  user_id: string;
  studio_balance: number;
  ad_balance: number;
  plan_period_end: string | null;
};
