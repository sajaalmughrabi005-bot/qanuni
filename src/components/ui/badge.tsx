import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-navy text-white",
        gold: "border-transparent bg-gold/15 text-gold",
        outline: "border-border text-foreground bg-transparent",
        subtle: "border-transparent bg-surface-muted text-foreground-muted",
        low: "border-transparent bg-risk-low-bg text-risk-low",
        medium: "border-transparent bg-risk-medium-bg text-risk-medium",
        high: "border-transparent bg-risk-high-bg text-risk-high",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
