"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { aiProviderStatus } from "@/lib/ai/actions";

/** Client-safe wrapper around the server-only hasOpenAI() check, so admins can see whether the platform is genuinely running on a real AI provider or the local fallback engine. */
export function AiStatusIndicator() {
  const t = useTranslations("common.status");
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    aiProviderStatus().then((res) => setConnected(res.connected));
  }, []);

  if (connected === null) return null;

  return (
    <Badge variant={connected ? "gold" : "subtle"} className="gap-1">
      <Sparkles className="h-3 w-3" />
      {connected ? t("aiConnected") : t("aiDemoEngine")}
    </Badge>
  );
}
