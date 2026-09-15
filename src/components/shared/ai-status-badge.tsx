import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { hasOpenAI } from "@/lib/ai/provider";
import { Badge } from "@/components/ui/badge";

export async function AiStatusBadge() {
  const t = await getTranslations("common.status");
  const connected = hasOpenAI();
  return (
    <Badge variant={connected ? "gold" : "subtle"} className="gap-1">
      <Sparkles className="h-3 w-3" />
      {connected ? t("aiConnected") : t("aiDemoEngine")}
    </Badge>
  );
}
