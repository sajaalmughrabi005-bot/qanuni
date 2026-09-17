"use client";

import { Fragment } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  MessageSquareQuote,
  FileSearch,
  Scale,
  Sparkles,
  FileEdit,
  Send,
  MessageCircle,
  Phone,
  Mail,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { RiskBadge } from "@/components/shared/risk-badge";
import { CaseFinancialTracker } from "@/components/lawyer/case-financial-tracker";
import { useAppStore } from "@/lib/store/app-store";
import { useSession } from "@/lib/auth/use-session";
import { legalSources, demoProfiles } from "@/lib/mock-data";
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

  const registeredUsers = useAppStore((s) => s.registeredUsers);

  const item = cases.find((c) => c.id === params.id && c.lawyerId === session?.userId);
  const relevantClauses = allClauses.filter((c) => item?.relevantClauseIds.includes(c.id));
  const caseMessages = allMessages.filter((m) => m.caseId === params.id);
  const clientProfile = item
    ? demoProfiles[item.clientId] || Object.values(registeredUsers).find((u) => u.profile.id === item.clientId)?.profile
    : undefined;

  if (!item) {
    return <EmptyState icon={FileSearch} title="Not found" className="mx-auto mt-16 max-w-lg" />;
  }

  const ar = locale === "ar";
  const whatsappHref = clientProfile?.phone
    ? `https://wa.me/${clientProfile.phone.replace(/\D/g, "")}`
    : undefined;

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
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <p className="text-foreground-muted">{item.clientName}</p>
            {clientProfile?.phone && (
              <a href={`tel:${clientProfile.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground">
                <Phone className="h-3.5 w-3.5" />
                {clientProfile.phone}
              </a>
            )}
            {clientProfile?.email && (
              <a href={`mailto:${clientProfile.email}`} className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground">
                <Mail className="h-3.5 w-3.5" />
                {clientProfile.email}
              </a>
            )}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full bg-risk-low/10 px-2.5 py-1 text-xs font-medium text-risk-low hover:bg-risk-low/20"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {t("whatsappContact")}
              </a>
            )}
          </div>
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

      {/* Client Story — shown first */}
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

      {/* Evidence vs. Legal Context comparison table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("evidenceVsLegal")}</CardTitle>
        </CardHeader>
        <CardContent>
          {relevantClauses.length === 0 ? (
            <p className="text-sm text-foreground-muted">—</p>
          ) : (
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border text-sm">
              <div className="flex items-center gap-2 bg-surface-muted p-2.5 font-medium">
                <FileSearch className="h-3.5 w-3.5 text-ink" />
                {t("evidence")}
              </div>
              <div className="flex items-center gap-2 bg-surface-muted p-2.5 font-medium">
                <Scale className="h-3.5 w-3.5 text-ink" />
                {t("legalContext")}
              </div>
              {relevantClauses.map((c) => {
                const source = legalSources.find((s) => s.id === c.legalSourceId);
                return (
                  <Fragment key={c.id}>
                    <div className="bg-surface p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-foreground-muted">#{c.clauseNumber}</span>
                        <RiskBadge level={c.riskLevel} />
                      </div>
                      {ar ? c.clauseTextAr : c.clauseTextEn}
                    </div>
                    <div className="bg-surface p-3">
                      {source ? (
                        <>
                          <Badge variant="subtle" className="mb-1 text-[10px]">
                            {source.isDemoPlaceholder ? "Demo placeholder" : "Verified"}
                          </Badge>
                          <p className="font-medium">{ar ? source.titleAr : source.titleEn}</p>
                          <p className="text-xs text-foreground-muted">{source.article}</p>
                        </>
                      ) : (
                        <p className="text-foreground-muted">{t("noMatchingSource")}</p>
                      )}
                    </div>
                  </Fragment>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CaseFinancialTracker item={item} />

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
