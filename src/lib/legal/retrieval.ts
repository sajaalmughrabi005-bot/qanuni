import "server-only";
import { z } from "zod";
import { AIError, requestOpenAI } from "@/lib/ai/provider";
import { curatedSources, normalizeLegalText } from "./corpus";

export async function embedTexts(texts: string[]) {
  const json = await requestOpenAI({ model: process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small", dimensions:1536, input: texts, encoding_format: "float" }, "embeddings");
  const parsed = z.object({data:z.array(z.object({index:z.number().int(),embedding:z.array(z.number().finite()).length(1536)}))}).safeParse(json);
  if(!parsed.success || parsed.data.data.length !== texts.length) throw new AIError("malformed_output");
  const result=parsed.data.data.sort((a,b)=>a.index-b.index);
  if(result.some((row,i)=>row.index!==i)) throw new AIError("malformed_output");
  return result.map(row=>row.embedding);
}
export function cosine(a:number[],b:number[]) {
  if(a.length!==b.length||!a.length) return 0;
  const dot=a.reduce((n,v,i)=>n+v*b[i],0), aa=a.reduce((n,v)=>n+v*v,0),bb=b.reduce((n,v)=>n+v*v,0);
  return aa&&bb?dot/Math.sqrt(aa*bb):0;
}
let publicVectors:Promise<number[][]>|undefined;
// Public law excerpts alone are cached. No user text or query embedding is cached.
export async function retrieveLegalSources(query:string) {
  const normalized=normalizeLegalText(query);
  const lexical=curatedSources.map(s=>s.keywords.reduce((n,k)=>n+(normalized.includes(normalizeLegalText(k))?1:0),0));
  const ready=publicVectors || (publicVectors=embedTexts(curatedSources.map(s=>s.excerptAr!)).catch(error=>{publicVectors=undefined;throw error;}));
  const querySections=[];for(let i=0;i<query.length;i+=6000) querySections.push(query.slice(i,i+6000));
  const [vectors,questions]=await Promise.all([ready,embedTexts(querySections.length?querySections:["No legal question supplied"])]);
  const ranked=curatedSources.map((source,i)=>({source,lexical:lexical[i],semantic:Math.max(...questions.map(question=>cosine(question,vectors[i])))}));
  // Similarity is a retrieval metric, never a confidence or legal correctness score.
  return ranked.filter(r=>r.lexical>0||r.semantic>=0.5).sort((a,b)=>(b.lexical+ b.semantic)-(a.lexical+a.semantic)).slice(0,4).map(r=>r.source);
}
