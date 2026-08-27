export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export const SUPABASE_SETUP_MESSAGE =
  "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server.";

/**
 * Reads the Supabase env vars, or returns null when they are missing.
 *
 * These must be referenced as full literals so Next can inline the
 * NEXT_PUBLIC_ values into the client bundle at build time.
 */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function requireSupabaseEnv(): SupabaseEnv {
  const env = getSupabaseEnv();

  if (!env) {
    throw new Error(SUPABASE_SETUP_MESSAGE);
  }

  return env;
}
