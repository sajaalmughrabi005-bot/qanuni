"use client";
import { useLocale } from "next-intl";
export function DataLoadError({title,message,onRetry,retrying=false}:{title?:string;message?:string;onRetry?:()=>void;retrying?:boolean}) {
 const ar=useLocale()==="ar";
 return <div role="alert" className="rounded-xl border border-border bg-surface p-5"><p className="font-medium">{title||(ar?"تعذر تحميل المعلومات":"Unable to load this information")}</p><p className="mt-2 text-sm text-foreground-muted">{message||(ar?"حاول مرة أخرى بعد قليل.":"Please try again in a moment.")}</p><button disabled={retrying} className="mt-4 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-60" onClick={onRetry||(()=>window.location.reload())}>{retrying?(ar?"جارٍ إعادة المحاولة…":"Retrying…"):(ar?"إعادة المحاولة":"Retry")}</button></div>;
}
