"use client";

import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  MessageSquareQuote,
  FileSearch,
  Scale,
  Sparkles,
  FileEdit,
  Send,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { RiskBadge } from "@/components/shared/risk-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useSession } from "@/lib/auth/use-session";
import { legalSources } from "@/lib/mock-data";
import { CaseStatus, CasePriority } from "@/types";
import { formatDate } from "@/lib/utils";
import { useState } from "react";

export default function LawyerCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("lawyer.caseDetail");
  const tCol = useTranslations("lawyer.cases.columns");
  const tPriority = useTranslations("lawyer.cases.priority");
  const tMessages = useTranslations("lawyer.messages");
  const locale = useLocale();
  const { session, profile } = useSession();
  const [messageInput, setMessageInput] = useState("");

  const cases = useAppStore((s) => s.cases);
  const allClauses = useAppStore((s) => s.clauses);
  const allMessages = useAppStore((s) => s.messages);
  const updateCase = useAppStore((s) => s.updateCase);
  const addMessage = useAppStore((s) => s.addMessage);

  const item = cases.find((c) => c.id === params.id);
  const relevantClauses = allClauses.filter((c) => item?.relevantClauseIds.includes(c.id));
  const caseMessages = allMessages.filter((m) => m.caseId === params.id);
  const sources = legalSources.filter((s) => relevantClauses.some((c) => c.legalSourceId === s.id));

  if (!item) {
    return <EmptyState icon={FileSearch} title="Not found" className="mx-auto mt-16 max-w-lg" />;
  }

  const ar = locale === "ar";

  const sendMessage = () => {
    if (!messageInput.trim() || !session || !profile) return;
    addMessage({
      caseId: item.id,
      senderId: session.userId,
      senderName: profile.fullName,
      senderRole: "lawyer",
      message: messageInput.trim(),
    });
    setMessageInput("");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{item.title}</h1>
          <p className="mt-1 text-foreground-muted">{item.clientName}</p>
        </div>
        <div className="flex gap-2">
          <Select value={item.status} onValueChange={(v) => updateCase(item.id, { status: v as CaseStatus })}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["new", "contacted", "reviewing", "in_progress", "court", "closed"] as CaseStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {tCol(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={item.priority} onValueChange={(v) => updateCase(item.id, { priority: v as CasePriority })}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["low", "medium", "high", "urgent"] as CasePriority[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {tPriority(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI Summary */}
      <Card className="border-gold/30 bg-gold/5">
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <Sparkles className="h-4.5 w-4.5 text-gold" />
          <CardTitle className="text-base">{t("aiSummary")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-foreground-muted">{t("situation")}</p>
            <p className="mt-1 text-sm">{ar ? item.summaryAr : item.summaryEn}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground-muted">{t("importantDates")}</p>
            <ul className="mt-1 text-sm text-foreground-muted">
              {(ar ? item.keyDatesAr : item.keyDatesEn).map((d, i) => <li key={i}>• {d}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground-muted">{t("questionsForReview")}</p>
            <ul className="mt-1 text-sm text-foreground-muted">
              {(ar ? item.questionsAr : item.questionsEn).map((q, i) => <li key={i}>• {q}</li>)}
            </ul>
          </div>
          {item.matchScore !== undefined && (
            <div>
              <p className="text-xs font-medium text-foreground-muted">{t("keyIssue")}</p>
              <Badge variant="gold" className="mt-1">
                {item.matchScore}% match
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3-layer summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <MessageSquareQuote className="h-4.5 w-4.5 text-ink" />
            <CardTitle className="text-base">{t("clientStory")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm italic text-foreground-muted">
              {(ar ? item.clientStoryAr : item.clientStoryEn) || "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <FileSearch className="h-4.5 w-4.5 text-ink" />
            <CardTitle className="text-base">{t("evidence")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {relevantClauses.length === 0 && <p className="text-sm text-foreground-muted">—</p>}
            {relevantClauses.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-2.5 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-foreground-muted">#{c.clauseNumber}</span>
                  <RiskBadge level={c.riskLevel} />
                </div>
                {ar ? c.clauseTextAr : c.clauseTextEn}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Scale className="h-4.5 w-4.5 text-ink" />
            <CardTitle className="text-base">{t("legalContext")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sources.length === 0 && <p className="text-sm text-foreground-muted">—</p>}
            {sources.map((s) => (
              <div key={s.id} className="rounded-lg border border-border p-2.5 text-sm">
                <Badge variant="subtle" className="mb-1 text-[10px]">
                  {s.isDemoPlaceholder ? "Demo placeholder" : "Verified"}
                </Badge>
                <p className="font-medium">{ar ? s.titleAr : s.titleEn}</p>
                <p className="text-xs text-foreground-muted">{s.article}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button asChild variant="gold">
          <Link href={`/lawyer/drafts/new?caseId=${item.id}`}>
            <FileEdit className="h-4 w-4" />
            {t("openDrafter")}
          </Link>
        </Button>
      </div>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tMessages("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {caseMessages.length === 0 ? (
            <p className="text-sm text-foreground-muted">{tMessages("empty")}</p>
          ) : (
            caseMessages.map((m) => (
              <div key={m.id} className="rounded-lg bg-surface-muted p-3 text-sm">
                <p className="mb-0.5 text-xs font-medium text-foreground-muted">
                  {m.senderName} · {formatDate(m.createdAt, locale)}
                </p>
                {m.message}
              </div>
            ))
          )}
          <div className="flex gap-2">
            <Textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={tMessages("placeholder")}
              className="min-h-10"
            />
            <Button size="icon" onClick={sendMessage} disabled={!messageInput.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
