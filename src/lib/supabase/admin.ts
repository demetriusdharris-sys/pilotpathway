import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

/**
 * SERVER ONLY. Never import this from a "use client" file.
 *
 * The service role key bypasses Row Level Security entirely. It exists here
 * so the server can write tutor_usage and read usage_limits while students
 * are blocked from touching either. If this key ever reaches the browser,
 * every RLS policy in the project becomes decorative.
 *
 * It is deliberately NOT prefixed NEXT_PUBLIC_, so Next will refuse to inline
 * it into client bundles.
 */
export function createAdminClient() {
  const env = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!env || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(env.url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
