"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileSearch, Brain, MessageCircleQuestion, Users, Gavel } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";

const loopSteps = [
  { key: "understand", icon: FileSearch },
  { key: "identify", icon: Brain },
  { key: "ask", icon: MessageCircleQuestion },
  { key: "connect", icon: Users },
  { key: "act", icon: Gavel },
] as const;

export function CoreLoopSteps() {
  const t = useTranslations("landing.loop");
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-5">
      {loopSteps.map(({ key, icon: Icon }, i) => {
        const isActive = active === key;
        return (
          <Reveal key={key} delay={i * 0.06}>
            <button
              type="button"
              onClick={() => setActive(isActive ? null : key)}
              aria-pressed={isActive}
              className="flex w-full flex-col items-center gap-3 rounded-2xl p-3 text-center transition-colors hover:bg-gold/10"
            >
              <span
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm transition-colors",
                  isActive ? "bg-gold text-navy" : "bg-navy text-gold"
                )}
              >
                <Icon className="h-6 w-6" />
              </span>
              <p className={cn("font-semibold transition-colors", isActive && "text-gold")}>
                {t(key)}
              </p>
              <p className="text-sm text-foreground-muted">{t(`${key}Desc`)}</p>
            </button>
          </Reveal>
        );
      })}
    </div>
  );
}
