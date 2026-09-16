"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Bot, Send, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiDisclaimer } from "@/components/shared/ai-disclaimer";
import { assistantChatAction } from "@/lib/ai/actions";
import { cn } from "@/lib/utils";

interface LocalMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function AiAssistantWidget() {
  const t = useTranslations("common.assistant");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const send = async () => {
    const message = input.trim();
    if (!message) return;
    setInput("");
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", content: message }]);
    setThinking(true);
    const res = await assistantChatAction({ message, locale: locale as "ar" | "en" });
    setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: res.reply }]);
    setThinking(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("title")}
        className="fixed bottom-5 end-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-navy text-gold shadow-lg transition hover:bg-navy-light"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 end-5 z-50 flex h-[440px] w-[min(360px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border bg-navy px-4 py-3 text-white">
            <Sparkles className="h-4 w-4 text-gold" />
            <p className="text-sm font-semibold">{t("title")}</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-foreground-muted">
                <Bot className="h-7 w-7 text-gold" />
                {t("emptyState")}
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm",
                    m.role === "user" ? "bg-navy text-white" : "bg-surface-muted text-foreground"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-2 text-sm text-foreground-muted">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-gold" />
                {t("thinking")}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border p-2.5">
            <AiDisclaimer className="mb-2 text-[11px]" text={t("disclaimer")} />
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
      )}
    </>
  );
}
