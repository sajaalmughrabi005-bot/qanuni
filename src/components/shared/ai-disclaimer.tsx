import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiDisclaimer({ className, text }: { className?: string; text?: string }) {
  const t = useTranslations("common.disclaimer");
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/5 px-3 py-2.5 text-xs text-foreground-muted",
        className
      )}
    >
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
      <span>{text || t("notLegalAdvice")}</span>
    </div>
  );
}
