"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Check, Briefcase } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { matchLawyersToCase } from "@/lib/ai/engine";
import { lawyers } from "@/lib/mock-data";
import { Analysis, DocumentClause, LegalDocument, LawyerSpecialty } from "@/types";
import { initials, cn } from "@/lib/utils";

const typeToSpecialty: Record<string, LawyerSpecialty> = {
  rental: "rental",
  employment: "employment",
  service: "commercial",
  sale: "commercial",
  general: "civil",
};

export function CreateCaseDialog({
  document,
  analysis,
  clauses,
  open,
  onOpenChange,
}: {
  document: LegalDocument;
  analysis: Analysis;
  clauses: DocumentClause[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("citizen.results");
  const tFind = useTranslations("citizen.findLawyer");
  const tSpec = useTranslations("marketplace.specialties");
  const tActions = useTranslations("common.actions");
  const locale = useLocale();
  const router = useRouter();
  const { session, profile } = useSession();
  const createCase = useAppStore((s) => s.createCase);
  const [selectedLawyerId, setSelectedLawyerId] = useState<string | null>(null);

  const specialty = typeToSpecialty[document.documentType] || "civil";

  const matches = useMemo(
    () => matchLawyersToCase(lawyers, specialty, profile?.city, locale).slice(0, 3),
    [specialty, profile?.city, locale]
  );

  const topLawyerId = selectedLawyerId || matches[0]?.lawyer.id;

  const handleSend = () => {
    if (!session || !profile) return;
    const match = matches.find((m) => m.lawyer.id === topLawyerId) || matches[0];

    createCase({
      clientId: session.userId,
      clientName: profile.fullName,
      lawyerId: match?.lawyer.id,
      title: `${t("overview")} - ${document.fileName}`,
      category: specialty,
      status: "new",
      priority: analysis.overallRisk === "high" ? "high" : "medium",
      summaryAr: analysis.summaryAr,
      summaryEn: analysis.summaryEn,
      clientStoryAr: analysis.concernsAr.join(" "),
      clientStoryEn: analysis.concernsEn.join(" "),
      relevantClauseIds: clauses.filter((c) => c.riskLevel !== "low").map((c) => c.id),
      documentIds: [document.id],
      keyDatesAr: analysis.deadlinesAr,
      keyDatesEn: analysis.deadlinesEn,
      questionsAr: analysis.questionsForLawyerAr,
      questionsEn: analysis.questionsForLawyerEn,
      suggestedSpecialty: specialty,
      matchScore: match?.score,
    });

    toast.success(locale === "ar" ? "تم إرسال قضيتك إلى المحامي بنجاح" : "Your case was sent to the lawyer");
    onOpenChange(false);
    router.push("/citizen/cases");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-4.5 w-4.5 text-gold" />
            {t("createCase")}
          </DialogTitle>
          <DialogDescription>{t("createCaseDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-foreground-muted">{locale === "ar" ? analysis.summaryAr : analysis.summaryEn}</p>

          <div>
            <p className="mb-2 text-sm font-medium">{tFind("matchTitle")}</p>
            <div className="space-y-2">
              {matches.map(({ lawyer, score }) => (
                <button
                  key={lawyer.id}
                  onClick={() => setSelectedLawyerId(lawyer.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-start transition",
                    topLawyerId === lawyer.id ? "border-gold bg-gold/5" : "border-border hover:bg-surface-muted"
                  )}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{initials(lawyer.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{lawyer.fullName}</p>
                    <p className="text-xs text-foreground-muted">{lawyer.specialties.map((s) => tSpec(s)).join(" · ")}</p>
                  </div>
                  <Badge variant="gold">{score}%</Badge>
                  {topLawyerId === lawyer.id && <Check className="h-4 w-4 shrink-0 text-gold" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {tActions("cancel")}
          </Button>
          <Button variant="gold" onClick={handleSend}>
            {tFind("title")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
