"use client";

import { useAppStore } from "@/lib/store/app-store";
import { lawyers } from "@/lib/mock-data";
import type { Lawyer } from "@/types";

export function useLawyer(id: string | undefined): Lawyer | undefined {
  const overrides = useAppStore((s) => (id ? s.lawyerOverrides[id] : undefined));
  const base = lawyers.find((l) => l.id === id);
  if (!base) return undefined;
  return overrides ? { ...base, ...overrides } : base;
}
