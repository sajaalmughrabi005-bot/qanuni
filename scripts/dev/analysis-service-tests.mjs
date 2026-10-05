import assert from "node:assert/strict";
import { splitDocument, risk, analyzeText } from "../../src/lib/ai/analysis-service.ts";
import { analysisSchema } from "../../src/lib/ai/analysis-service.ts";
const input=('Rental payment is due monthly.\n').repeat(1700)+'FINAL TERM: refund within 17 days.';
const chunks=splitDocument(input);
assert.equal(chunks.map(c=>c.text).join(''),input);
assert.ok(chunks.every(c=>c.text.length<=24000));
assert.equal(chunks.at(-1).start+chunks.at(-1).text.length,input.length);
assert.equal(risk(null),'unknown');assert.equal(risk('invalid'),'unknown');
assert.throws(()=>splitDocument('x'.repeat(240001)),/too_large/);
const original=globalThis.fetch;process.env.OPENAI_API_KEY='test-not-real';
let calls=0;
globalThis.fetch=async(_url,options)=>{
 const request=JSON.parse(options.body);if(String(_url).endsWith("embeddings")) return new Response(JSON.stringify({data:request.input.map((_,index)=>({index,embedding:Array(1536).fill(0)}))}));
 calls++; const body=JSON.parse(request.messages[1].content);const section=body.document||"Consolidated rental terms.";
 const quote=section.includes('FINAL TERM:')?'FINAL TERM: refund within 17 days.':section.slice(0,29);
 const response={citations:[],documentType:"rental",isLegalDocument:true,notRecognizedReasonAr:'',notRecognizedReasonEn:'',clauses:[{clauseNumber:'1',sourceText:quote,clauseTextAr:'نص',clauseTextEn:quote,riskLevel:null,category:'financial',explanationAr:'تفسير',explanationEn:'interpretation'}],overallRisk:null,riskCategories:[],summaryAr:'ملخص',summaryEn:'summary'};
 for(const key of ['yourObligations','otherPartyObligations','deadlines','paymentTerms','cancellationTerms','concerns','questionsForLawyer']) for(const lang of ['Ar','En']) response[key+lang]=[];
 if(body.document?.includes('FINAL TERM:'))response.deadlinesEn=['Refund within 17 days.'];
 assert.ok(analysisSchema.safeParse(response).success);
 return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(response)}}]}));
};
try {
 const result=await analyzeText(input,crypto.randomUUID(),crypto.randomUUID(),'rental');
 assert.equal(result.status,'ok');assert.equal(calls,chunks.length+1);assert.equal(result.analysis.coverage.coveragePercent,100);
 assert.equal(result.analysis.overallRisk,'unknown');assert.ok(result.clauses.some(c=>c.sourceText.includes('17 days')));
 for(const clause of result.clauses) assert.equal(input.slice(clause.sourceStart,clause.sourceEnd),clause.sourceText);
 assert.ok(result.clauses.every(c=>c.confidence===null));
 assert.ok(result.analysis.deadlinesEn.includes('Refund within 17 days.'),'Empty consolidation must retain section facts.');
 console.log('analysis-service-tests: 12 checks passed; '+chunks.length+' sections, consolidation retention, final-section coverage and exact offsets verified (mocked transport)');
} finally {globalThis.fetch=original;}
