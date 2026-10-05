"use client";

import { useSyncExternalStore } from "react";
import { getDemoRole } from "./mode";
import { DEMO_ADMIN_ID } from "./dataset";
import { DEMO_LAWYER_ID, DEMO_LAWYER_PROFILE_ID } from "./lawyers";
import { DEMO_USER_ID } from "@/lib/mock-data/contract";
import type { UserRole } from "@/types";

const noopSubscribe = () => () => {};

/** The active demo role, or null when this is a real (or anonymous) session. */
export function useDemoRole(): UserRole | null {
  return useSyncExternalStore(noopSubscribe, getDemoRole, () => null);
}

/** Profile id of the sample user for a demo role. */
export const demoProfileId = (role: UserRole) =>
  role === "citizen" ? DEMO_USER_ID : role === "lawyer" ? DEMO_LAWYER_PROFILE_ID : DEMO_ADMIN_ID;

export { DEMO_LAWYER_ID, DEMO_LAWYER_PROFILE_ID, DEMO_USER_ID };
