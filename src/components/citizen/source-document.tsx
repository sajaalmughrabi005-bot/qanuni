"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ClauseDetailDialog } from "./clause-detail-dialog";
import { verifiedHighlights } from "@/lib/documents/highlights";
import { curatedSources } from "@/lib/legal/corpus";
import { getCitizenSourceUrlAction } from "@/lib/documents/storage-actions";
import { useDemoStore } from "@/lib/demo/store";
import { useSession } from "@/lib/auth/use-session";
import type { DocumentClause, LegalDocument } from "@/types";

export function SourceDocument({document,clauses}:{document:LegalDocument;clauses:DocumentClause[]}) {
 const ar=useLocale()==="ar",{isDemo}=useSession();const [selected,setSelected]=useState<DocumentClause|null>(null),[busy,setBusy]=useState(false);
 const text=document.citizenDescription||"", mapped=verifiedHighlights(text,clauses);
 const pieces=[];let end=0;
 for(const c of mapped) {pieces.push(<span key={`text-${c.id}`}>{text.slice(end,c.sourceStart)}</span>);pieces.push(<button key={c.id} data-source-clause={c.id} onClick={()=>setSelected(c)} className="rounded bg-gold/20 text-start underline decoration-dotted underline-offset-4 focus-visible:ring-2 focus-visible:ring-gold" title={`${ar?"تقييم آلي غير متحقق":"Unverified AI risk"}: ${c.riskLevel}`} aria-label={`${ar?"البند":"Clause"} ${c.clauseNumber}: ${c.riskLevel}`}><mark className="bg-transparent text-inherit">{c.sourceText}</mark></button>);end=c.sourceEnd!;}
 pieces.push(<span key="tail">{text.slice(end)}</span>);
 const download=async()=>{setBusy(true);try {
  const file=isDemo?useDemoStore.getState().sourceFiles[document.id]:undefined;
  const url=file?URL.createObjectURL(file):await getCitizenSourceUrlAction(document.id);
  if(!url) throw new Error("source_unavailable");
  if(file){const link=window.document.createElement("a");link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}else window.open(url,"_blank","noopener,noreferrer");
 }catch{toast.error(ar?"تعذر تحميل الملف الأصلي.":"Unable to download the original file.");}finally{setBusy(false);}};
 return <section className="space-y-3 rounded-xl border border-border p-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{ar?"النص المستخدم في التحليل":"Text used for analysis"}</h2>{(document.originalStoragePath||useDemoStore.getState().sourceFiles[document.id])&&<Button variant="outline" size="sm" disabled={busy} onClick={download}>{ar?"تحميل الملف الأصلي":"Download original"}</Button>}</div>
  <p className="text-xs text-foreground-muted">{ar?"اضغط على النص المظلل لقراءة التفسير. التظليل للنص المطابق فقط؛ البنود غير المطابقة أو المتكررة تبقى في قائمة النتائج. التفسير الآلي غير متحقق ويحتاج مراجعة محامٍ.":"Select highlighted text for its explanation. Only exact, unique matches are marked; unmatched or repeated passages remain in the findings list. AI interpretations are unverified and require lawyer review."}</p>
  <div dir="auto" className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-8">{text?pieces:(ar?"النص الأصلي غير متاح لهذا السجل.":"Original text unavailable for this record.")}</div>
  <ClauseDetailDialog clause={selected} source={curatedSources.find(s=>s.id===selected?.legalSourceId)} open={!!selected} onOpenChange={open=>!open&&setSelected(null)}/>
 </section>;
}
