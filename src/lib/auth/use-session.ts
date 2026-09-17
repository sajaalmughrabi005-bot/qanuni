// Real session, backed by Supabase Auth — see components/providers/session-provider.tsx.
// Re-exported from this path so every existing `useSession()` call site
// (dozens of pages/components) keeps working unchanged.
export { useSession } from "@/components/providers/session-provider";
