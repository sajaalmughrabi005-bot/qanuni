"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";

export function StoreHydration({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    Promise.resolve(useAppStore.persist.rehydrate()).finally(() => {
      useAppStore.getState().setHydrated();
    });
  }, []);

  return <>{children}</>;
}
