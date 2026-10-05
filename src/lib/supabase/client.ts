import { createBrowserClient } from "@supabase/ssr";
import { isDemoActive } from "@/lib/demo/mode";

/**
 * Browser Supabase client. Returns null when env vars are missing OR while
 * the isolated demo mode is active — demo mode must never be able to read
 * or write a real record, so every data call simply has no client to use
 * (callers already treat `null` as "nothing to fetch").
 */
export function createSupabaseBrowserClient() {
  if (isDemoActive()) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

export function isSupabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
