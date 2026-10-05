import type { DocumentClause } from "@/types";
export function verifiedHighlights(text:string, clauses:DocumentClause[]) {
  const candidates=clauses.filter(c=>c.sourceText && Number.isInteger(c.sourceStart) && Number.isInteger(c.sourceEnd)
    && c.sourceStart!>=0 && c.sourceEnd!<=text.length && c.sourceEnd!>c.sourceStart!
    && text.slice(c.sourceStart,c.sourceEnd)===c.sourceText
    && text.indexOf(c.sourceText!,text.indexOf(c.sourceText!)+1)===-1);
  // Reject all overlapping mappings; choosing one could misattribute a risk.
  return candidates.filter(c=>!candidates.some(other=>other.id!==c.id && other.sourceStart!<c.sourceEnd! && other.sourceEnd!>c.sourceStart!)).sort((a,b)=>a.sourceStart!-b.sourceStart!);
}
