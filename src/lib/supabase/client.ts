import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Returns null when env vars are not configured,
 * so the app gracefully falls back to the local demo store
 * (see lib/store/app-store.ts) instead of crashing.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

export function isSupabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
