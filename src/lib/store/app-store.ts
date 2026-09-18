"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * What's left after the Supabase migration: a per-browser "saved lawyers"
 * bookmark list. Everything else (auth, documents, cases, appointments,
 * drafts, notifications, messages, reviews, lawyer/profile edits) now lives
 * in Postgres — see src/lib/data/hooks.ts and src/lib/data/actions.ts.
 */
interface AppState {
  hydrated: boolean;
  setHydrated: () => void;
  savedLawyerIds: string[];
  toggleSavedLawyer: (lawyerId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hydrated: false,
      savedLawyerIds: [],

      setHydrated: () => set({ hydrated: true }),

      toggleSavedLawyer: (lawyerId) =>
        set((s) => ({
          savedLawyerIds: s.savedLawyerIds.includes(lawyerId)
            ? s.savedLawyerIds.filter((id) => id !== lawyerId)
            : [...s.savedLawyerIds, lawyerId],
        })),
    }),
    {
      name: "qanuni-demo-store",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
