"use client";

import { useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useSession } from "@/lib/auth/use-session";
import { useDemoStore } from "@/lib/demo/store";
import { DEMO_LAWYER_ID } from "@/lib/demo/lawyers";
import { parseConsultationPrice } from "@/lib/lawyers/consultation-price";
import { saveConsultationPriceAction } from "@/lib/lawyers/price-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Separate fee edit avoids unrelated profile writes and stale-profile fee
 * overwrites. Demo persists only in existing memory store; failed real writes
 * preserve entered text. Identity changes remount via the parent's key. */
export function ConsultationPriceEditor({ lawyerId, price, onSavedAction }: { lawyerId: string; price: number; onSavedAction: () => Promise<void> }) {
  const ar = useLocale() === "ar", { isDemo, session } = useSession();
  const [value, setValue] = useState(String(price));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pending = useRef(false);
  return <section className="rounded-xl border border-border bg-surface p-5" aria-labelledby="fee-heading">
    <h2 id="fee-heading" className="font-semibold">{ar ? "سعر الاستشارة" : "Consultation price"}</h2>
    <p className="mt-2 text-sm text-foreground-muted">{ar ? "سعر معلن بالدينار الأردني؛ لا تُحصّل دفعة هنا." : "Advertised price in Jordanian dinars; no payment is collected here."}</p>
    {isDemo && <p className="mt-2 text-sm">{ar ? "تعديل تجريبي محلي فقط؛ يعود السعر الأصلي عند إعادة تحميل الصفحة." : "Local demo edit only; the initial price returns on reload."}</p>}
    <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={async e => {
      e.preventDefault(); if (pending.current) return; setMessage(null);
      const parsed = parseConsultationPrice(value);
      if (parsed === null) { setMessage(ar ? "أدخل مبلغاً من 0 إلى 10000 بخانتين عشريتين كحد أقصى." : "Enter an amount from 0 to 10000 with at most two decimal places."); return; }
      pending.current = true; setBusy(true);
      try {
        if (isDemo) {
          if (session?.role !== "lawyer" || lawyerId !== DEMO_LAWYER_ID) throw new Error("not_allowed");
          useDemoStore.getState().updateLawyer(lawyerId, { consultationPrice: parsed });
        } else {
          const result = await saveConsultationPriceAction(lawyerId, value);
          if (!result.ok) { setMessage(ar ? "تعذر تأكيد حفظ السعر. المبلغ باقٍ؛ تحقق من صلاحية حسابك وتوفر الخدمة قبل إعادة المحاولة." : "The price save could not be confirmed. Your amount is retained; check account access and service availability before retrying."); return; }
        }
        setMessage(isDemo ? (ar ? "تم تحديث سعر التجربة المحلية فقط." : "Local demo price updated only.") : (ar ? "تم حفظ السعر." : "Price saved."));
        await onSavedAction();
      } catch { setMessage(ar ? "تعذر تحديث العرض؛ تحقق من السعر المحفوظ قبل المحاولة مجدداً." : "Unable to update the display; check the saved price before retrying."); }
      finally { pending.current = false; setBusy(false); }
    }}>
      <div><label htmlFor="consultation-price" className="mb-2 block text-sm">{ar ? "السعر (د.أ)" : "Price (JOD)"}</label><Input id="consultation-price" type="text" inputMode="decimal" maxLength={10} value={value} onChange={e => { setValue(e.target.value); setMessage(null); }} disabled={busy}/></div>
      <Button type="submit" variant="gold" className="text-navy" disabled={busy}>{busy ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ السعر" : "Save price")}</Button>
    </form>
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </section>;
}
