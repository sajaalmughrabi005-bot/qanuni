"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCheck, FileQuestion, MessageCircleQuestion, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMessages } from "@/lib/data/hooks";
import { markMessagesRead, sendMessage } from "@/lib/data/actions";
import { errorKey } from "@/lib/data/error-key";
import { canMessage } from "@/lib/cases/lifecycle";
import { formatDateTime, cn } from "@/lib/utils";
import type { CaseStatus, MessageKind } from "@/types";

/**
 * Case chat between the client and the assigned lawyer only. Sender,
 * receiver and role are stamped by the database from the session, so the
 * browser can't spoof them; read receipts come from `read_at`.
 */
export function CaseMessages({
  caseId,
  status,
  role,
  myUserId,
  onActivity,
}: {
  caseId: string;
  status: CaseStatus;
  role: "lawyer" | "client";
  myUserId: string;
  /** Called after a message is sent, so the parent can refresh the case status the message may have changed. */
  onActivity?: () => void;
}) {
  const t = useTranslations("cases.messages");
  const tErr = useTranslations("cases.errors");
  const locale = useLocale();
  const { data: messages, refetch } = useMessages(caseId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const unreadForMe = messages.some((m) => m.receiverId === myUserId && !m.readAt);

  useEffect(() => {
    if (unreadForMe) markMessagesRead(caseId, role).then(() => refetch());
    // only when unread state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadForMe, caseId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  const send = async (kind: MessageKind = "text", body = text) => {
    if (sending || !body.trim()) return;
    setSending(true);
    const res = await sendMessage(caseId, body, role, kind);
    setSending(false);
    if (!res.ok) {
      toast.error(tErr(errorKey(res.error) as "unknown"));
      return;
    }
    if (kind === "text") setText("");
    await refetch();
    onActivity?.();
  };

  const open = canMessage(status);

  return (
    <div className="space-y-3">
      <div className="max-h-96 space-y-2.5 overflow-y-auto rounded-xl border border-border bg-surface-muted/40 p-3">
        {messages.length === 0 && <p className="py-6 text-center text-sm text-foreground-muted">{t("empty")}</p>}
        {messages.map((m) => {
          const mine = m.senderId === myUserId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                  mine ? "bg-navy text-white" : "bg-surface text-foreground shadow-sm"
                )}
              >
                {m.kind !== "text" && (
                  <p className={cn("mb-1 flex items-center gap-1 text-[11px] font-semibold", mine ? "text-gold-light" : "text-gold")}>
                    {m.kind === "document_request" ? <FileQuestion className="h-3 w-3" /> : <MessageCircleQuestion className="h-3 w-3" />}
                    {m.kind === "document_request" ? t("kindDocument") : t("kindClarification")}
                  </p>
                )}
                <p className="whitespace-pre-line">{m.message}</p>
                <p className={cn("mt-1 flex items-center gap-1 text-[10px]", mine ? "text-white/60" : "text-foreground-muted")}>
                  {formatDateTime(m.createdAt, locale)}
                  {mine && <CheckCheck className={cn("h-3 w-3", m.readAt ? "text-gold-light" : "opacity-50")} aria-label={m.readAt ? t("read") : t("sent")} />}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {open ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("placeholder")}
              className="min-h-10"
              maxLength={5000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
              }}
            />
            <Button size="icon" onClick={() => send()} disabled={sending || !text.trim()} aria-label={t("send")}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {role === "lawyer" && status !== "resolved" && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => send("document_request")} disabled={sending || !text.trim()}>
                <FileQuestion className="h-3.5 w-3.5" />
                {t("documentRequest")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => send("clarification_request")} disabled={sending || !text.trim()}>
                <MessageCircleQuestion className="h-3.5 w-3.5" />
                {t("clarificationRequest")}
              </Button>
              <p className="w-full text-[11px] text-foreground-muted">{t("requestHint")}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-foreground-muted">{status === "requested" ? t("requestedNotice") : t("closedNotice")}</p>
      )}
    </div>
  );
}
