"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/auth/use-session";
import type { UserRole } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export function RoleGuard({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (session === null) {
      router.replace("/login");
    } else if (session.role !== role) {
      router.replace(`/${session.role}/dashboard`);
    }
  }, [loading, session, role, router]);

  if (loading || !session || session.role !== role) {
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
