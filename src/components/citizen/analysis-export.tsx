"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildAnalysisReport } from "@/lib/documents/report";
import type { Analysis,DocumentClause,LegalDocument,Locale } from "@/types";
export function AnalysisExport({document:source,analysis,clauses}:{document:LegalDocument;analysis:Analysis;clauses:DocumentClause[]}) {
 const locale=useLocale() as Locale,ar=locale==="ar",[busy,setBusy]=useState(false);
 const run=async()=>{setBusy(true);let report:Window|null=null;try {
  report=window.open("","_blank");if(!report)throw new Error("popup_blocked");report.opener=null;
  const styles=Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map(l=>l.href).filter(h=>new URL(h).origin===location.origin);
  report.document.open();report.document.write(buildAnalysisReport(source,analysis,clauses,locale,styles));report.document.close();
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("report_load_timeout")),15000);report!.onload=()=>{clearTimeout(timer);resolve();};report!.onerror=()=>{clearTimeout(timer);reject(new Error("report_load_failed"));};});
  await Promise.race([report.document.fonts.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error("font_timeout")),15000))]);
  if(report.closed)throw new Error("report_closed");report.focus();report.print();
 }catch{report?.close();toast.error(ar?"تعذر فتح التقرير. اسمح بالنوافذ المنبثقة وأعد المحاولة.":"Unable to open report. Allow popups and retry.");}finally{setBusy(false);}};
 return <div className="space-y-1"><Button variant="outline" disabled={busy} onClick={run}>{ar?"تصدير التقرير إلى PDF / طباعة":"Export report to PDF / print"}</Button><p className="text-xs text-foreground-muted">{ar?"اختر حفظ كملف PDF في نافذة الطباعة. يحتوي التقرير على المستند والتحليل المحددين حالياً.":"Choose Save as PDF in the print dialog. The report uses the currently selected document and analysis."}</p></div>;
}
