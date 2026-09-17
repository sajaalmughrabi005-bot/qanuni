"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/use-session";
import { loginAction } from "@/lib/auth/actions";
import { DEMO_EMAILS, DEMO_PASSWORD } from "@/lib/auth/demo-accounts";

export function StartAnalysisButton({
  children,
  size = "lg",
  variant = "gold",
  className,
}: {
  children: React.ReactNode;
  size?: "sm" | "default" | "lg";
  variant?: "gold" | "outline" | "ghost" | "default";
  className?: string;
}) {
  const router = useRouter();
  const { session } = useSession();
  const [loading, setLoading] = useState(false);

  const go = async () => {
    if (loading) return;
    if (!session) {
      setLoading(true);
      await loginAction(DEMO_EMAILS.citizen, DEMO_PASSWORD);
      setLoading(false);
      router.refresh();
    }
    router.push("/citizen/analyze/new");
  };

  return (
    <Button size={size} variant={variant} className={className} onClick={go} disabled={loading}>
      {children}
    </Button>
  );
}
