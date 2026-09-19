"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSession } from "@/lib/auth/use-session";
import { getDemoRole } from "@/lib/demo/mode";
import type { UserRole } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

/** Pages a lawyer may open while their account is not yet approved. */
const PENDING_LAWYER_ALLOWED = ["/lawyer/verification", "/lawyer/profile"];

/**
 * Client-side navigation guard (UX only). The real enforcement is
 * server-side: middleware redirects unauthenticated / wrong-role requests
 * and every table is protected by Postgres row-level security.
 */
export function RoleGuard({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { session, lawyer, loading, isDemo } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const needsVerificationRedirect =
    role === "lawyer" &&
    !isDemo &&
    !!lawyer &&
    lawyer.verificationStatus !== "approved" &&
    !PENDING_LAWYER_ALLOWED.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (loading) return;
    if (session === null) {
      // During hydration the session context still holds the server snapshot (no demo flag yet);
      // the demo cookie is authoritative, so wait for the re-render instead of bouncing to /login.
      if (getDemoRole()) return;
      router.replace(`/login?next=${encodeURIComponent(`/${locale}${pathname}`)}`);
    } else if (session.role !== role) {
      router.replace(`/${session.role}/dashboard`);
    } else if (needsVerificationRedirect) {
      router.replace("/lawyer/verification");
    }
  }, [loading, session, role, router, pathname, locale, needsVerificationRedirect]);

  if (loading || !session || session.role !== role || needsVerificationRedirect) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
