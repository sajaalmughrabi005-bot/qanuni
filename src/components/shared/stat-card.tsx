import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  className,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: "gold" | "navy";
  className?: string;
  href?: string;
}) {
  const content = (
    <Card className={cn(href && "transition hover:-translate-y-0.5 hover:shadow-md", className)}>
      <CardContent className="flex items-center gap-4 p-5">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            accent === "gold" ? "bg-gold/10 text-gold" : "bg-navy/5 text-navy"
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1.5 text-sm text-foreground-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
