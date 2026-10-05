"use client";
import { useLocale } from "next-intl";
export function DataLoadError() {
 const ar=useLocale()==="ar";
 return <div role="alert" className="rounded-xl border border-risk-high p-4"><p>{ar?"تعذر تحميل البيانات. هذه حالة خطأ وليست قائمة فارغة.":"Unable to load data. This is an error, not an empty list."}</p><button className="mt-3 underline" onClick={()=>window.location.reload()}>{ar?"إعادة المحاولة":"Retry"}</button></div>;
}
