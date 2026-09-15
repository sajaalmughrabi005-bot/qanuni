"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Send, MessageCircleQuestion, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiDisclaimer } from "@/components/shared/ai-disclaimer";
import { useAppStore } from "@/lib/store/app-store";
import { askTheLawTurn } from "@/lib/ai/actions";
import { legalSources } from "@/lib/mock-data";
import { DocumentClause } from "@/types";
import { cn } from "@/lib/utils";

const EMPTY_MESSAGES: never[] = [];

export function AskTheLawPanel({ documentId, clauses }: { documentId: string; clauses: DocumentClause[] }) {
  const t = useTranslations("citizen.askTheLaw");
  const locale = useLocale();
  const scenarioChats = useAppStore((s) => s.scenarioChats);
  const messages = scenarioChats[documentId] || EMPTY_MESSAGES;
  const appendScenarioChat = useAppStore((s) => s.appendScenarioChat);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const send = async () => {
    const question = input.trim();
    if (!question) return;
    setInput("");
    appendScenarioChat(documentId, {
      id: `u-${Date.now()}`,
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    });
    setThinking(true);
    const reply = await askTheLawTurn({
      history: messages,
      question,
      clauses,
      sources: legalSources,
      locale: locale as "ar" | "en",
    });
    appendScenarioChat(documentId, reply);
    setThinking(false);
  };

  return (
    <div className="flex h-[480px] flex-col rounded-2xl border border-border bg-surface">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
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
          <Button onClick={send} size="icon" disabled={!input.trim() || thinking}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
