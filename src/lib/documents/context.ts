// Bounded, query-ranked sections. Omitted sections are explicitly disclosed to
// the model; this is retrieval, never a claim that the whole contract was read.
import { normalizeLegalText } from "@/lib/legal/corpus";
export function selectDocumentContext(text:string, question:string, limit=32000) {
  if(text.length<=limit) return {text,totalCharacters:text.length,includedCharacters:text.length,partial:false};
  const tokens=[...new Set(normalizeLegalText(question).split(/[^\p{L}\p{N}]+/u).filter(t=>t.length>2))];
  const sections=[];
  for(let start=0;start<text.length;start+=4000) {
    const value=text.slice(start,start+4000), normalized=normalizeLegalText(value);
    const score=tokens.reduce((n,t)=>n+(normalized.split(t).length-1),0);
    sections.push({start,value,score});
  }
  const selected=sections.sort((a,b)=>b.score-a.score||a.start-b.start).slice(0,Math.floor(limit/4000)).sort((a,b)=>a.start-b.start);
  return {text:selected.map(s=>`[characters ${s.start}-${s.start+s.value.length}]\n${s.value}`).join("\n\n"),totalCharacters:text.length,includedCharacters:selected.reduce((n,s)=>n+s.value.length,0),partial:true};
}
