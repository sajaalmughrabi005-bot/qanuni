"use client";
import { useLocale } from "next-intl";
import { useDocuments, useAnalyses, useClausesByIds } from "@/lib/data/hooks";
import { SourceDocument } from "@/components/citizen/source-document";
export function LinkedAnalysisDocuments({ids,clauseIds}:{ids:string[];clauseIds:string[]}) {
 const ar=useLocale()==="ar",{data:documents,loading,error}=useDocuments(),{data:analyses,error:analysisError}=useAnalyses(),{data:clauses,error:clauseError}=useClausesByIds(clauseIds);
 if(!ids.length)return null;
 if(error||analysisError||clauseError) return <p role="alert">{ar?"تعذر تحميل المستندات المشتركة.":"Unable to load shared documents."}</p>;
 if(loading)return <p role="status">{ar?"تحميل المستندات…":"Loading documents…"}</p>;
 return <div className="space-y-4">{ids.map(id=>{const doc=documents.find(d=>d.id===id),analysis=analyses.find(a=>a.documentId===id);return doc?<details key={id} className="rounded-xl border border-border p-4"><summary className="cursor-pointer font-medium">{doc.fileName}</summary>{analysis&&<p className="my-3 whitespace-pre-line text-sm">{ar?analysis.summaryAr:analysis.summaryEn}</p>}<SourceDocument document={doc} clauses={clauses.filter(c=>c.documentId===id)}/></details>:<p key={id} role="alert">{ar?"المستند المشترك غير متاح.":"Shared document unavailable."}</p>;})}</div>;
}
