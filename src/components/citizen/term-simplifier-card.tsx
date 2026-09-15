"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { glossary } from "@/lib/ai/glossary";

export function TermSimplifierCard() {
  const t = useTranslations("citizen.termSimplifier");
  const locale = useLocale();
  const [index, setIndex] = useState(0);
  const term = glossary[index];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-gold" />
          <p className="font-semibold">{t("title")}</p>
        </div>
        <div className="mt-3">
          <Select value={String(index)} onValueChange={(v) => setIndex(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {glossary.map((g, i) => (
                <SelectItem key={g.termEn} value={String(i)}>
                  {locale === "ar" ? g.termAr : g.termEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 space-y-2 rounded-xl bg-surface-muted p-4">
          <p className="text-sm">{locale === "ar" ? term.explanationAr : term.explanationEn}</p>
          {locale === "ar" && <p className="text-xs text-foreground-muted">{t("englishEquivalent")}: {term.termEn}</p>}
          <p className="text-xs italic text-foreground-muted">
            {t("example")}: {locale === "ar" ? term.exampleAr : term.exampleEn}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
