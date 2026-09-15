import { useTranslations } from "next-intl";
import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RiskLevel } from "@/types";
import { cn } from "@/lib/utils";

const iconMap = { low: CheckCircle2, medium: AlertCircle, high: AlertTriangle };

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const t = useTranslations("common.riskLevel");
  const Icon = iconMap[level];
  return (
    <Badge variant={level} className={cn("gap-1", className)}>
      <Icon className="h-3 w-3" />
      {t(level)}
    </Badge>
  );
}
