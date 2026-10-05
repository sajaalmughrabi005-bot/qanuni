"use client";
import { DataLoadError } from "@/components/shared/data-load-error";
import { toast } from "sonner";

import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Send, MessageCircleQuestion, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiDisclaimer } from "@/components/shared/ai-disclaimer";
import { askTheLawTurn } from "@/lib/ai/actions";
import { useSession } from "@/lib/auth/use-session";
import { useAiHistory } from "@/lib/data/hooks";
import { saveAiHistory } from "@/lib/data/actions";
import { curatedSources as legalSources } from "@/lib/legal/corpus";
import { LegalEvidence } from "./legal-evidence";
import { useDemoStore } from "@/lib/demo/store";
import { ChatMessage, DocumentClause } from "@/types";
import { cn } from "@/lib/utils";

export function AskTheLawPanel({ clauses, documentId }: { clauses: DocumentClause[]; documentId?: string }) {
  const {session}=useSession();
  return <ScopedAskPanel key={`${session?.userId}:${documentId||"general"}`} clauses={clauses} documentId={documentId}/>;
}

function ScopedAskPanel({ clauses, documentId }: { clauses: DocumentClause[]; documentId?: string }) {
  const t = useTranslations("citizen.askTheLaw");
  const locale = useLocale();
  const tCommon=useTranslations("common.status");
  const { session } = useSession();
  const { data: history, refetch:refetchHistory, loading:historyLoading,error:historyError } = useAiHistory("ask", documentId);
  const [fresh, setFresh] = useState<ChatMessage[]>([]);
  // Earlier exchanges come from the user's private history in the database.
  const saved = useMemo<ChatMessage[]>(
    () =>
      [...history].reverse().flatMap((h) => [
        { id: `hu-${h.id}`, role: "user" as const, content: h.prompt, createdAt: h.createdAt },
        {
          id: `ha-${h.id}`,
          role: "assistant" as const,
          content: String(h.answer.content ?? ""),
          sourceIds: Array.isArray(h.answer.sourceIds)?h.answer.sourceIds as string[]:[],
          showLawyerCta: Boolean(h.answer.showLawyerCta),
          createdAt: h.createdAt,
        },
      ]),
    [history]
  );
  const messages = useMemo(() => [...saved, ...fresh], [saved, fresh]);
  const setMessages = setFresh;
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const send = async () => {
    if (thinking) return;
    const question = input.trim();
    if (!question) return;
    setInput("");
    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMessage]);
    setThinking(true);
    try {
    const reply = await askTheLawTurn({
      documentId,
      documentText: useDemoStore.getState().documents.find(d=>d.id===documentId)?.citizenDescription,
      history: messages,
      question,
      clauses,
      sources: legalSources,
      locale: locale as "ar" | "en",
    });
    setMessages((m) => [...m, reply]);

    if (session) {
      try {
      const persisted=await saveAiHistory({
        userId: session.userId,
        kind: "ask",
        documentId,
        prompt: question,
        answer: { sourceIds:reply.sourceIds,content: reply.content, showLawyerCta: Boolean(reply.showLawyerCta) },
      });
      if(persisted.ok){if((await refetchHistory())!==false)setFresh([]);}else toast.warning(locale==="ar"?"\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629.":"Unable to save conversation history.");
      }catch{toast.warning(locale==="ar"?"تعذر حفظ المحادثة.":"Unable to save conversation history.");}
    }
    } catch { setMessages(m=>m.filter(item=>item.id!==userMessage.id));setInput(question); toast.error(locale === "ar" ? "تعذر الحصول على نتيجة. لم تُنشأ نتيجة بديلة. حاول مجدداً." : "Unable to obtain an AI result. No substitute was generated. Please retry."); } finally { setThinking(false); }
  };

  return (
    <div className="flex h-[480px] flex-col rounded-2xl border border-border bg-surface">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {historyError?<DataLoadError/>:historyLoading&&!history.length?<p role="status">{tCommon("loading")}</p>:null}
        {messages.length === 0 && !historyLoading && !historyError && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-foreground-muted">
            <MessageCircleQuestion className="h-8 w-8 text-gold" />
            {t("emptyState")}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm",
                m.role === "user" ? "bg-navy text-white" : "bg-surface-muted text-foreground"
              )}
            >
              {m.content}
              {m.sourceIds?.length ? <LegalEvidence sourceIds={m.sourceIds}/> : null}
              {m.showLawyerCta && (
                <Button asChild size="sm" variant="gold" className="mt-3 w-full">
                  <Link href="/lawyers">{t("talkToLawyer")}</Link>
                </Button>
              )}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <Sparkles className="h-4 w-4 animate-pulse text-gold" />
            {t("thinking")}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border p-3">
        <AiDisclaimer className="mb-2" />
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={t("placeholder")}
          />
          <Button onClick={send} size="icon" aria-label={t("send")} disabled={!input.trim() || thinking}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
