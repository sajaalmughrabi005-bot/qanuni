"use client";

import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/use-session";

/**
 * Entry point for the contract analyzer. The analyzer needs a real account
 * (analyses are saved to the user's history), so anonymous visitors are sent
 * to sign in and returned to the analyzer afterwards.
 */
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
  const locale = useLocale();
  const { session, loading } = useSession();

  const go = () => {
    if (loading) return;
    if (!session) {
      router.push(`/login?next=${encodeURIComponent(`/${locale}/citizen/analyze/new`)}`);
    } else if (session.role === "citizen") {
      router.push("/citizen/analyze/new");
    } else {
      router.push(`/${session.role}/dashboard`);
    }
  };

  return (
    <Button size={size} variant={variant} className={className} onClick={go}>
      {children}
    </Button>
  );
}
