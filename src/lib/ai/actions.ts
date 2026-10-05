"use server";
import { headers } from "next/headers";
import { z } from "zod";
import type { ChatMessage, DocumentClause, DocumentType, ExtractedCaseData, LegalSource, Locale, UserRole } from "@/types";
import { retrieveLegalSources } from "@/lib/legal/retrieval";
import { validateCitation } from "@/lib/legal/corpus";
import { selectDocumentContext } from "@/lib/documents/context";
import { checkProviderHealth, requestJSON, requestText, AIError } from "./provider";
import { getAccessContext, getProfessionalAccessContext } from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeRateLimit, privateRateKey, validateTextSize } from "./limits";
import { analyzeText, LEGAL_SYSTEM, splitDocument } from "./analysis-service";
import { classifyLegalSections } from "./relevance";
import { heuristicParseVoiceCommand, checkMeaningfulContent, type VoiceCommandResult } from "./engine";

async function authorize(roles:UserRole[]=["citizen","lawyer","admin"], charge=true) {
  const access=await (roles.includes("admin")?getAccessContext():getProfessionalAccessContext());
  if(access.level==="none" || !access.id || !access.role) throw new Error("unauthenticated");
  if(!roles.includes(access.role)) throw new Error("not_allowed");
  if(charge) {
    const h=await headers();
    consumeRateLimit(`ai:${access.level}:${access.id}`,access.level==="demo"?8:20);
    if(access.level==="demo") consumeRateLimit("demo-ai:worker",30);
    if(access.level==="demo") consumeRateLimit(`demo-ip:${privateRateKey(h.get("x-forwarded-for")?.split(",")[0]?.trim()||"local")}`,16);
  }
  return access;
}
export async function processVoiceCommandAction(transcript:string):Promise<VoiceCommandResult> {
  await authorize(["lawyer"]);validateTextSize(transcript,4000);return heuristicParseVoiceCommand(transcript);
}
export async function aiProviderStatus() {
  try { await authorize(); return await checkProviderHealth(); }
  catch { return {connected:false,code:"unauthenticated"}; }
}
export async function analyzeDocumentAction(params:{text:string;rawContent:string;fileName:string;documentId:string;userId:string;documentType:DocumentType;locale:Locale}) {
  const access=await authorize(["citizen"]);
  validateTextSize(params.rawContent);
  let text=params.rawContent;
  if(access.level==="real") {
    const supabase=await createSupabaseServerClient();
    const {data,error}=await supabase!.from("documents").select("citizen_description,user_id,document_type").eq("id",params.documentId).single();
    if(error||!data||data.user_id!==access.id) throw new Error("not_allowed");
    if(!data.citizen_description || data.citizen_description!==text) throw new Error("document_context_mismatch");
    text=data.citizen_description;
  }
  const meaningful=checkMeaningfulContent(text);
  if(!meaningful.meaningful) return {status:"not_recognized" as const,reasonAr:meaningful.reasonAr,reasonEn:meaningful.reasonEn};
  try {
    const relevant=await classifyLegalSections(splitDocument(text).map(c=>c.text),access.id!);
    if(relevant===false)return {status:"not_recognized" as const,reasonAr:"لا يبدو أن المحتوى يتعلق بمستند أو موضوع قانوني.",reasonEn:"This content does not appear to concern a legal document or matter."};
    return await analyzeText(text,params.documentId,access.id!,params.documentType);
  }
  catch(cause) { return {status:"ai_unavailable" as const,code:cause instanceof AIError?cause.code:"provider",reasonAr:"تعذر التحليل بالذكاء الاصطناعي. لم تُنشأ نتيجة بديلة. حاول مجدداً.",reasonEn:"AI analysis failed. No substitute result was generated. Please retry."}; }
}

type QuestionParams={question:string;clauses:DocumentClause[];sources:LegalSource[];locale:Locale;documentId?:string;history?:ChatMessage[];documentText?:string};
async function authorizedContext(params:QuestionParams, access:Awaited<ReturnType<typeof authorize>>) {
  if(access.level==="demo") {
    const documentId=params.documentId||params.clauses[0]?.documentId;
    const clauses=params.clauses.filter(c=>c.documentId===documentId);
    const text=params.documentText || clauses.map(c=>c.sourceText||c.clauseTextAr||c.clauseTextEn).join("\n");validateTextSize(text||"No document context.");
    return {text,clauseIds:clauses.map(c=>c.id),history:boundedHistory(params.history||[])};
  }
  const id=params.documentId;
  if(!id) return {text:"No document selected.",clauseIds:[] as string[],history:[]};
  const supabase=await createSupabaseServerClient();
  const {data:doc,error}=await supabase!.from("documents").select("citizen_description").eq("id",id).single();
  if(error||!doc) throw new Error("not_allowed");
  const [{data:clauses,error:clauseError},{data:history,error:historyError}]=await Promise.all([
    supabase!.from("document_clauses").select("id").eq("document_id",id),
    supabase!.from("ai_history").select("prompt,answer").eq("document_id",id).eq("user_id",access.id).eq("kind","ask").order("created_at",{ascending:false}).limit(10),
  ]);
  if(clauseError||historyError) throw new Error("context_unavailable");
  const text=doc.citizen_description||"No extracted text available.";validateTextSize(text);
  return {text,clauseIds:(clauses||[]).map(c=>c.id as string),history:boundedHistory((history||[]).reverse().flatMap(h=>[{role:"user",content:h.prompt},{role:"assistant",content:String(h.answer?.content||"")}]))};
}
function boundedHistory(history:{role:string;content:string}[]) {
  const turns: {role:string;content:string}[]=[];let chars=0;
  for(const item of history.slice(-20).reverse()) {
    if((item.role!=="user"&&item.role!=="assistant")||typeof item.content!=="string") continue;
    if(chars+item.content.length>16_000) break;
    chars+=item.content.length;turns.unshift({role:item.role,content:item.content});
  }
  return turns;
}
export async function askTheLawAction(params:QuestionParams) {
  const access=await authorize(["citizen","lawyer"]);validateTextSize(params.question,4000);
  const context=await authorizedContext(params,access);
  const sources=await retrieveLegalSources(params.question);
  const selected=selectDocumentContext(context.text,params.question);
  const result=await requestJSON({name:"contract_answer",schema:z.object({answer:z.string(),citations:z.array(z.object({sourceId:z.string(),quote:z.string()})),matchedClauseIds:z.array(z.string())}),system:LEGAL_SYSTEM,user:JSON.stringify({task:"Answer in requested language, grounded in supplied document sections and previous turns. If partial=true, explicitly say only retrieved sections were considered; do not assert absence of a term from the entire document. Cite only supplied excerpts supporting the claim, with the exact full Arabic excerpt as quote. Source existence is verified; current/historical applicability requires lawyer review. Corpus covers two annual-leave articles only. Unsupported law/claims are unverified. Never cite other laws.",locale:params.locale,document:selected,clauseIds:context.clauseIds,verifiedExcerpts:sources,history:context.history,question:params.question})});
  return {answer:result.answer,sourceIds:result.citations.flatMap(c=>validateCitation(c.sourceId,c.quote,sources)?[c.sourceId]:[]),matchedClauseIds:result.matchedClauseIds.filter(id=>context.clauseIds.includes(id)),source:"ai" as const};
}
export async function simulateScenarioAction(params:QuestionParams) {
  const access=await authorize(["citizen","lawyer"]);validateTextSize(params.question,4000);
  const context=await authorizedContext(params,access);
  const res=await requestJSON({name:"scenario",schema:z.object({consequenceAr:z.string(),consequenceEn:z.string(),affectedClauseId:z.string().nullable(),questionsAr:z.array(z.string()),questionsEn:z.array(z.string())}),system:LEGAL_SYSTEM,
    user:JSON.stringify({task:"Explain this hypothetical scenario, separating contract facts from assumptions, never a guaranteed legal outcome.",document:selectDocumentContext(context.text,params.question),clauseIds:context.clauseIds,question:params.question})});
  return {...res,affectedClauseId:res.affectedClauseId&&context.clauseIds.includes(res.affectedClauseId)?res.affectedClauseId:undefined,source:"ai" as const};
}
export async function extractCaseDataAction(text:string):Promise<ExtractedCaseData & {source:"ai"}> {
  await authorize(["lawyer"]);validateTextSize(text);
  const schema=z.object({clientName:z.string().nullable(),opposingParty:z.string().nullable(),caseNumber:z.string().nullable(),court:z.string().nullable(),importantDates:z.array(z.string()),amounts:z.array(z.string()),claims:z.array(z.string()),deadline:z.string().nullable()});
  const results:z.infer<typeof schema>[]=[];
  for(const chunk of splitDocument(text)) results.push(await requestJSON({schema,name:"case_extraction",system:LEGAL_SYSTEM,user:JSON.stringify({task:"Extract only facts actually present in this document section. Unknown scalars null, absent lists empty. No inferred dates or parties.",document:chunk.text})}));
  const first=(key:"clientName"|"opposingParty"|"caseNumber"|"court"|"deadline")=>results.find(r=>r[key])?.[key]||undefined;
  const all=(key:"importantDates"|"amounts"|"claims")=>[...new Set(results.flatMap(r=>r[key]))];
  return {clientName:first("clientName"),opposingParty:first("opposingParty"),caseNumber:first("caseNumber"),court:first("court"),deadline:first("deadline"),importantDates:all("importantDates"),amounts:all("amounts"),claims:all("claims"),confidence:null,source:"ai"};
}
export async function generateDraftAction(params:{instructions:string;locale:Locale;mode?:"generate"|"shorten"|"formal"|"translate";existingContent?:string}) {
  await authorize(["lawyer"]);validateTextSize(params.instructions,16_000);
  if(params.existingContent) validateTextSize(params.existingContent,48_000);
  if(params.mode&&params.mode!=="generate"&&!params.existingContent?.trim()) throw new Error("ai_invalid_input");
  const verifiedExcerpts=await retrieveLegalSources(params.instructions);
  const outputLanguage=params.mode==="translate"?(params.locale==="ar"?"English":"Arabic"):(params.locale==="ar"?"Arabic":"English");
  const content=await requestText({system:LEGAL_SYSTEM+" Produce a professional draft for a Jordanian lawyer. Use clearly labeled missing facts for details not supplied; do not output a placeholder instead of a draft. Shorten preserves material terms; formal changes wording only; translate changes language faithfully into the specified outputLanguage. A lawyer must review before use.",user:JSON.stringify({...params,outputLanguage,verifiedExcerpts,sourceScope:"Only two annual-leave articles, July 2025 snapshot. No invented references; all applicability requires lawyer review. Do not introduce law numbers/articles outside these supplied excerpts."})});
  return {content,source:"ai" as const};
}
export async function assistantChatAction(params:{message:string;locale:Locale;history?:{role:string;content:string}[]}) {
  await authorize();validateTextSize(params.message,4000);
  const reply=await requestText({system:LEGAL_SYSTEM+" You are HAQ's help assistant. Help navigate contract analysis, Ask the Law, scenarios, lawyer marketplace, cases, lawyer drafting and calendar. Keep concise. Do not claim to have taken any action on behalf of the user.",user:JSON.stringify({...params,history:boundedHistory(params.history||[])})});
  return {reply,source:"ai" as const};
}
export async function askTheLawTurn(params:QuestionParams & {history:ChatMessage[]}):Promise<ChatMessage> {
  const res=await askTheLawAction(params);
  return {id:crypto.randomUUID(),role:"assistant",content:res.answer,sourceIds:res.sourceIds,createdAt:new Date().toISOString(),showLawyerCta:true};
}
