import assert from 'node:assert/strict';
import {loadSource} from './source-test-loader.mjs';
let replies=[],calls=0;
const {classifyLegalSections}=loadSource('src/lib/ai/relevance.ts',{'./provider':{requestJSON:async request=>{calls++;const result=replies.shift();if(result instanceof Error)throw result;return request.schema.parse(result);},completeJSON:async()=>{throw Error('Legacy gate must not be used');}}});
const legal='The employer shall pay the worker 317 dinars monthly for the agreed services.';
const verdict=(outcome,reasonCode='no_legal_structure',evidenceQuotes=[])=>({outcome,reasonCode,evidenceQuotes});
replies=[verdict('LEGAL','legal_structure',[legal])];assert.equal((await classifyLegalSections([legal],'legal')).outcome,'LEGAL');const cached=calls;await classifyLegalSections([legal],'legal');assert.equal(calls,cached);
for(const outcome of ['NON_LEGAL','UNCERTAIN']){replies=[verdict(outcome,outcome==='UNCERTAIN'?'partial_or_unclear':'no_legal_structure')];assert.equal((await classifyLegalSections(['Menu 317 dinars 17 May'],'scope'+outcome)).outcome,outcome);}
replies=[verdict('LEGAL','legal_structure',['Invented quote never in document'])];assert.deepEqual(await classifyLegalSections([legal],'fabricated'),{outcome:'UNCERTAIN',reasonCode:'unverified_evidence'});
replies=[verdict('LEGAL','legal_structure',[legal]),verdict('NON_LEGAL')];assert.deepEqual(await classifyLegalSections([legal,'Restaurant menu soup 5'],'mixed'),{outcome:'UNCERTAIN',reasonCode:'mixed_content'});
replies=[verdict('NON_LEGAL'),verdict('LEGAL','legal_structure',[legal])];assert.equal((await classifyLegalSections(['Ordinary invoice',legal],'reverse-mixed')).outcome,'UNCERTAIN');
replies=[{outcome:'LEGAL'}];await assert.rejects(classifyLegalSections([legal],'malformed'));
replies=[new Error('provider_unavailable')];await assert.rejects(classifyLegalSections([legal],'provider'));
console.log('legal-document-gate-tests: strict outcomes, exact evidence, all-section mixed content, scope cache, malformed/provider failure closure PASS');

// Actual server action: neither blocked outcome may reach RAG/full analysis.
let mode='demo',outcome='NON_LEGAL',analyzed=0,retrieved=0;
const {analyzeDocumentAction}=loadSource('src/lib/ai/actions.ts',{
 'next/headers':{headers:async()=>new Map()},
 '@/lib/auth/access':{getProfessionalAccessContext:async()=>({level:mode,id:'caller',role:'citizen'})},
 '@/lib/supabase/server':{createSupabaseServerClient:async()=>({from:()=>({select(){return this;},eq(){return this;},single:async()=>({data:{citizen_description:legal,user_id:'caller'},error:null})})})},
 '@/lib/legal/retrieval':{retrieveLegalSources:async()=>{retrieved++;throw Error('Should not retrieve blocked documents');}},
 '@/lib/legal/corpus':{},'@/lib/documents/context':{},
 './provider':{AIError:class extends Error{}},'./limits':{consumeRateLimit(){},privateRateKey:()=>'',validateTextSize(){}},
 './analysis-service':{splitDocument:text=>[{text}],analyzeText:async()=>{analyzed++;return {status:'ok'};}},
 './relevance':{classifyLegalSections:async()=>{if(outcome==='failure')throw Error('provider failed');return {outcome,reasonCode:'partial_or_unclear'};}},
 './engine':{checkMeaningfulContent:()=>({meaningful:true})}
});
const params={rawContent:legal,text:legal,documentId:'doc',userId:'spoofed',fileName:'fictional.txt',documentType:'general',locale:'en'};
for(mode of ['demo','real']){
 for(const [result,status]of [['NON_LEGAL','not_recognized'],['UNCERTAIN','uncertain_document'],['failure','ai_unavailable']]){outcome=result;assert.equal((await analyzeDocumentAction(params)).status,status);assert.equal(analyzed,0);assert.equal(retrieved,0);}
}
outcome='LEGAL';assert.equal((await analyzeDocumentAction(params)).status,'ok');assert.equal(analyzed,1);
console.log('actual action: signed-demo/registered adapter parity, uncertain/non-legal/provider stop before RAG and full analysis, legal continuation PASS');
