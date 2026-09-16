"use client";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/app-store";

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
  const session = useAppStore((s) => s.session);
  const loginDemo = useAppStore((s) => s.loginDemo);

  const go = () => {
    if (!session) loginDemo("citizen");
    router.push("/citizen/analyze/new");
  };

  return (
    <Button size={size} variant={variant} className={className} onClick={go}>
      {children}
    </Button>
  );
}
