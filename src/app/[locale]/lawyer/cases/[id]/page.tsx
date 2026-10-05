"use client";
import { DataLoadError } from "@/components/shared/data-load-error";

import { Fragment, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  FileSearch,
  Scale,
  Sparkles,
  FileEdit,
  MessageCircle,
  Phone,
  Mail,
  Check,
  X,
  Flag,
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
import { CaseStatusBadge } from "@/components/cases/status-badge";
import { CaseTimeline } from "@/components/cases/case-timeline";
import { CaseMessages } from "@/components/cases/case-messages";
import { LinkedAnalysisDocuments } from "@/components/cases/linked-analysis-documents";
import { CaseDocumentsPanel } from "@/components/cases/case-documents-panel";
import { CaseStatusActions } from "@/components/cases/status-actions";
import { RejectDialog } from "@/components/cases/reject-dialog";
import { ReportDialog } from "@/components/cases/report-dialog";
import { useCases, useCaseEvents, useCaseNotes, useClausesByIds } from "@/lib/data/hooks";
import { addCaseNote, markCaseViewed, respondToCase, updateCaseFields } from "@/lib/data/actions";
import { errorKey } from "@/lib/data/error-key";
import { useSession } from "@/lib/auth/use-session";
import { useMyLawyer } from "@/lib/auth/use-lawyer";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapProfile } from "@/lib/supabase/mappers";
import { useDemoStore } from "@/lib/demo/store";
import { curatedSources as legalSources } from "@/lib/legal/corpus";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { CasePriority, Profile, RejectionReason } from "@/types";

export default function LawyerCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("lawyer.caseDetail");
  const tCase = useTranslations("cases");
  const tPriority = useTranslations("lawyer.cases.priority");
  const tSpec = useTranslations("marketplace.specialties");
  const locale = useLocale();
  const ar = locale === "ar";
  const { session, isDemo } = useSession();
  const { lawyer: me } = useMyLawyer();
  const demoProfiles = useDemoStore((s) => s.profiles);

  const { data: cases, loading, refetch , error: dataError0 } = useCases();
  const item = cases.find((c) => c.id === params.id);
  const { data: relevantClauses,error:clausesError } = useClausesByIds(item?.relevantClauseIds || []);
  const { data: events, error:eventsError, refetch: refetchEvents } = useCaseEvents(item?.id);
  const { data: notes, error:notesError, refetch: refetchNotes } = useCaseNotes(item?.id);

  const [realClient, setRealClient] = useState<Profile | undefined>(undefined);
  const [contactRead,setContactRead]=useState({id:"",error:false});
  const [noteText, setNoteText] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const clientProfile = isDemo ? demoProfiles.find((p) => p.id === item?.clientId) : realClient?.id===item?.clientId ? realClient : undefined;
  const contactVisible = !!item && item.status !== "requested" && item.status !== "rejected";

  // Contact details are only readable after acceptance (RLS enforces this too).
  useEffect(() => {
    if (isDemo || !item?.clientId || !contactVisible) return;
    let cancelled=false;
    const id=item.clientId;
    const supabase = createSupabaseBrowserClient();
    if(!supabase){Promise.resolve().then(()=>{if(!cancelled)setContactRead({id,error:true});});return ()=>{cancelled=true;};}
    Promise.resolve(supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle()).then(({data,error})=>{
        if(cancelled)return;
        setContactRead({id,error:!!error});
        if(!error)setRealClient(data?mapProfile(data):undefined);
      }).catch(()=>{if(!cancelled)setContactRead({id,error:true});});
    return ()=>{cancelled=true;};
  }, [item?.clientId, contactVisible,isDemo]);

  // Opening a request is recorded once on the timeline (server-side, idempotent).
  useEffect(() => {
    if (item && item.status === "requested" && !item.viewedByLawyerAt) {
      markCaseViewed(item.id).then(result => {
        if(!result.ok)toast.error(tCase(`errors.${errorKey(result.error)}` as "errors.unknown"));
        else return refetchEvents();
      }).catch(()=>toast.error(tCase("errors.unknown")));
    }
    // only on first load of this case
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  if(dataError0 || clausesError || eventsError || notesError) return <DataLoadError/>;
  if (loading) return <p role="status">{t("loading")}</p>;
  if (!item || !session) {
    return <EmptyState icon={FileSearch} title={t("notFound")} className="mx-auto mt-16 max-w-lg" />;
  }

  const refreshAll = () => {
    refetch();
    refetchEvents();
  };
  const whatsappHref = clientProfile?.phone ? `https://wa.me/${clientProfile.phone.replace(/\D/g, "")}` : undefined;

  const accept = async () => {
    if(busy)return;
    setBusy(true);
    try {
    const res = await respondToCase(item.id, true);
    if (!res.ok) return toast.error(tCase(`errors.${errorKey(res.error)}` as "errors.unknown"));
    toast.success(tCase("requests.accepted"));
    refreshAll();
    }catch{toast.error(tCase("errors.unknown"));}finally{setBusy(false);}
  };
  const reject = async (reason: RejectionReason, note: string) => {
    if(busy)return;
    setBusy(true);
    try {
    const res = await respondToCase(item.id, false, reason, note);
    if (!res.ok) return toast.error(tCase(`errors.${errorKey(res.error)}` as "errors.unknown"));
    toast.success(tCase("requests.rejected"));
    setRejectOpen(false);
    refreshAll();
    }catch{toast.error(tCase("errors.unknown"));}finally{setBusy(false);}
  };
  const changePriority = async (priority: CasePriority) => {
    try {
    const res = await updateCaseFields(item.id, { priority });
    if (!res.ok) toast.error(tCase(`errors.${errorKey(res.error)}` as "errors.unknown"));
    refetch();
    }catch{toast.error(tCase("errors.unknown"));}
  };
  const saveNote = async () => {
    if (!me || !noteText.trim()) return;
    try {
    const res = await addCaseNote(item.id, me.id, noteText);
    if (!res.ok) return toast.error(tCase(`errors.${errorKey(res.error)}` as "errors.unknown"));
    setNoteText("");
    refetchNotes();
    }catch{toast.error(tCase("errors.unknown"));}
  };

  const workable = item.status !== "requested" && item.status !== "rejected";
  const hasSummary = !!((ar ? item.summaryAr : item.summaryEn) || item.keyDatesAr.length || item.questionsAr.length);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{item.title}</h1>
            <CaseStatusBadge status={item.status} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <p className="text-foreground-muted">
              {item.clientName}
              {item.isManual && <span className="ms-2 text-xs">({tCase("client.manual")})</span>}
            </p>
            {contactVisible && clientProfile?.phone && (
              <a href={isDemo?undefined:`tel:${clientProfile.phone.replace(/\s/g, "")}`} role={isDemo?"button":undefined} tabIndex={isDemo?0:undefined} onKeyDown={isDemo?(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toast.info(t("demoContact"));}}:undefined} onClick={isDemo?()=>toast.info(t("demoContact")):undefined} className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground">
                <Phone className="h-3.5 w-3.5" />
                {clientProfile.phone}
              </a>
            )}
            {contactVisible && clientProfile?.email && (
              <a href={isDemo?undefined:`mailto:${clientProfile.email}`} role={isDemo?"button":undefined} tabIndex={isDemo?0:undefined} onKeyDown={isDemo?(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toast.info(t("demoContact"));}}:undefined} onClick={isDemo?()=>toast.info(t("demoContact")):undefined} className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground">
                <Mail className="h-3.5 w-3.5" />
                {clientProfile.email}
              </a>
            )}
            {contactVisible && whatsappHref && !isDemo && (
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
            {!contactVisible && !item.isManual && <p className="text-xs text-foreground-muted">{tCase("client.contactHidden")}</p>}
            {contactVisible && item.clientId && !isDemo && (contactRead.id!==item.clientId ? <p role="status">{t("loadingContact")}</p> : contactRead.error ? <DataLoadError/> : null)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={item.priority} onValueChange={(v) => changePriority(v as CasePriority)} disabled={!workable}>
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
          <Button size="sm" variant="ghost" onClick={() => setReportOpen(true)}>
            <Flag className="h-3.5 w-3.5" />
            {tCase("actions.report")}
          </Button>
        </div>
      </div>

      <Card className="border-gold/30 bg-gold/5">
        <CardContent className="space-y-3 p-5">
          <p className="text-sm">{tCase(`nextAction.lawyer.${item.status}`)}</p>
          {item.status === "requested" && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="gold" disabled={busy} onClick={accept}>
                <Check className="h-3.5 w-3.5" />
                {tCase("actions.accept")}
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejectOpen(true)}>
                <X className="h-3.5 w-3.5" />
                {tCase("actions.reject")}
              </Button>
            </div>
          )}
          <CaseStatusActions caseId={item.id} status={item.status} role="lawyer" onDone={refreshAll} />
          {item.status === "rejected" && item.rejectionReason && (
            <p className="text-sm text-foreground-muted">
              {tCase("rejection.clientView", { reason: tCase(`rejectionReason.${item.rejectionReason}`) })}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tCase("sections.request")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="whitespace-pre-line text-foreground-muted">{item.requestDescription || (ar ? item.clientStoryAr : item.clientStoryEn) || "—"}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="subtle">{tSpec(item.category)}</Badge>
            <Badge variant={item.urgency === "urgent" || item.urgency === "high" ? "high" : "outline"}>{tCase(`urgency.${item.urgency}`)}</Badge>
            <Badge variant="subtle">{formatDateTime(item.requestedAt, locale)}</Badge>
            {item.acceptedAt && <Badge variant="low">{tCase("timeline.accepted")} · {formatDate(item.acceptedAt, locale)}</Badge>}
          </div>
          {item.requestMessage && <p className="rounded-lg bg-surface-muted p-3 text-foreground-muted">{item.requestMessage}</p>}
        </CardContent>
      </Card>

      {hasSummary && (
      <Card className="border-gold/30 bg-gold/5">
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <Sparkles className="h-4.5 w-4.5 text-gold" />
          <CardTitle className="text-base">{t("aiSummary")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-foreground-muted">{t("situation")}</p>
            <p className="mt-1 text-sm">{(ar ? item.summaryAr : item.summaryEn) || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground-muted">{t("importantDates")}</p>
            <ul className="mt-1 text-sm text-foreground-muted">
              {(ar ? item.keyDatesAr : item.keyDatesEn).map((d, i) => (
                <li key={i}>• {d}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground-muted">{t("questionsForReview")}</p>
            <ul className="mt-1 text-sm text-foreground-muted">
              {(ar ? item.questionsAr : item.questionsEn).map((q, i) => (
                <li key={i}>• {q}</li>
              ))}
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
      )}

      {relevantClauses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("evidenceVsLegal")}</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {workable && <CaseFinancialTracker item={item} onChanged={refetch} />}

      {workable && (
        <div className="flex gap-3">
          <Button asChild variant="gold">
            <Link href={`/lawyer/drafts/new?caseId=${item.id}`}>
              <FileEdit className="h-4 w-4" />
              {t("openDrafter")}
            </Link>
          </Button>
        </div>
      )}

      {item.status !== "rejected" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tCase("sections.messages")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CaseMessages caseId={item.id} status={item.status} role="lawyer" myUserId={session.userId} onActivity={refreshAll} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tCase("sections.documents")}</CardTitle>
            </CardHeader>
            <CardContent>
              <LinkedAnalysisDocuments ids={item.documentIds} clauseIds={item.relevantClauseIds}/>
              <CaseDocumentsPanel caseId={item.id} status={item.status} role="lawyer" onActivity={refreshAll} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{tCase("sections.notes")}</CardTitle>
              <Badge variant="subtle">{tCase("notes.private")}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {notes.length === 0 && <p className="text-sm text-foreground-muted">{tCase("notes.empty")}</p>}
              {notes.map((n) => (
                <div key={n.id} className="rounded-lg bg-surface-muted p-3 text-sm">
                  <p className="whitespace-pre-line">{n.note}</p>
                  <p className="mt-1 text-xs text-foreground-muted">{formatDateTime(n.createdAt, locale)}</p>
                </div>
              ))}
              <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder={tCase("notes.placeholder")} maxLength={5000} />
              <Button size="sm" variant="outline" onClick={saveNote} disabled={!noteText.trim() || !me}>
                {tCase("notes.add")}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tCase("sections.timeline")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CaseTimeline events={events} />
        </CardContent>
      </Card>

      <RejectDialog open={rejectOpen} onOpenChange={setRejectOpen} busy={busy} onConfirm={reject} />
      <ReportDialog targetType="case" targetId={item.id} open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  );
}
