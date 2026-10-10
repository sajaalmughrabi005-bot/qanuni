import assert from 'node:assert/strict';
import {loadSource} from './source-test-loader.mjs';
const corpus=loadSource('src/lib/legal/corpus.ts');
const {curatedSources,validateCitation}=corpus;
const {selectScenarioEvidence}=loadSource('src/lib/legal/scenario-evidence.ts');
const {selectDocumentContext}=loadSource('src/lib/documents/context.ts',{'@/lib/legal/corpus':corpus});
let access={level:'real',id:'owned-citizen',role:'citizen'},denied=false,providerCalls=0,prompt,reply,failure=false;
const source=curatedSources.find(s=>s.article==='64');
const realText='Synthetic employment contract. العامل يتنازل عن إجازته السنوية. Employer pays 317 monthly.';
const db={from(table){return {select(){return this;},eq(){return this;},order(){return this;},limit(){return this;},single:async()=>denied?{error:{code:'42501'},data:null}:{error:null,data:{citizen_description:realText}},then(resolve){resolve({error:null,data:table==='document_clauses'?[{id:'real-clause'}]:[{prompt:'Earlier authorized question',answer:{content:'Prior authorized answer'}}]});}};}};
const {simulateScenarioAction}=loadSource('src/lib/ai/actions.ts',{
 'next/headers':{headers:async()=>new Map()},'@/lib/auth/access':{getProfessionalAccessContext:async()=>access},'@/lib/supabase/server':{createSupabaseServerClient:async()=>db},
 '@/lib/legal/retrieval':{retrieveLegalSources:async()=>{throw Error('Scenario must not request embeddings');}},'@/lib/legal/corpus':{validateCitation},'@/lib/documents/context':{selectDocumentContext},
 '../legal/scenario-evidence':{selectScenarioEvidence},'./provider':{requestJSON:async request=>{providerCalls++;prompt=JSON.parse(request.user);if(failure)throw Error('controlled provider unavailable');return request.schema.parse(reply);}},
 './limits':{consumeRateLimit(){},privateRateKey:()=>'',validateTextSize(s,max=160000){if(!s||s.length>max)throw Error('invalid input');}},'./analysis-service':{LEGAL_SYSTEM:'Test existing legal safety instructions'},'./relevance':{},'./engine':{},
});
const params={documentId:'owned-document',documentText:'FORGED OTHER USER DATA',clauses:[{id:'forged-clause',documentId:'owned-document'}],sources:[{id:'invented-source',verified:true}],question:'What if I waive annual leave?',locale:'en'};
reply={consequenceAr:'تفسير تجريبي غير متحقق',consequenceEn:'Controlled unverified interpretation',affectedClauseId:'forged-clause',questionsAr:[],questionsEn:[],citations:[{sourceId:source.id,quote:source.excerptAr},{sourceId:'invented-source',quote:'fake law'},{sourceId:source.id,quote:'changed quote'}]};
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
await test('real action reloads owned DB context; ignores supplied source/text/clause IDs',async()=>{const r=await simulateScenarioAction(params);assert.ok(prompt.document.text.includes('317'));assert.ok(!JSON.stringify(prompt).includes('FORGED'));assert.ok(!JSON.stringify(prompt).includes('invented-source'));assert.deepEqual(prompt.clauseIds,['real-clause']);assert.equal(r.affectedClauseId,undefined);});
await test('exact allowlisted citations retained, invented/changed citations dropped',async()=>{const r=await simulateScenarioAction(params);assert.deepEqual(r.sourceIds,[source.id]);assert.deepEqual(r.citations,[{sourceId:source.id,quote:source.excerptAr}]);});
await test('existing authorized history passed, explicit limitations in prompt',async()=>{await simulateScenarioAction(params);assert.equal(prompt.history.length,2);assert.match(prompt.task,/Missing evidence is unverified/);assert.match(prompt.task,/Never guarantee/);assert.match(prompt.task,/partial/);});
await test('provider failure rejects, no heuristic success',async()=>{failure=true;await assert.rejects(simulateScenarioAction(params),/controlled provider/);failure=false;});
await test('denied document fails before provider',async()=>{denied=true;const count=providerCalls;await assert.rejects(simulateScenarioAction(params),/not_allowed/);assert.equal(providerCalls,count);denied=false;});
await test('unauthenticated actor fails before provider',async()=>{access={level:'none'};const count=providerCalls;await assert.rejects(simulateScenarioAction(params),/unauthenticated/);assert.equal(providerCalls,count);});
await test('wrong role fails before provider',async()=>{access={level:'real',id:'admin',role:'admin'};const count=providerCalls;await assert.rejects(simulateScenarioAction(params),/not_allowed/);assert.equal(providerCalls,count);});
await test('oversize question fails before provider',async()=>{access={level:'real',id:'owned-citizen',role:'citizen'};const count=providerCalls;await assert.rejects(simulateScenarioAction({...params,question:'x'.repeat(4001)}),/invalid input/);assert.equal(providerCalls,count);});
await test('missing lexical matches explicit empty, no invented references',async()=>assert.deepEqual(selectScenarioEvidence('Apartment paint colours','Walls are white.'),[]));
await test('lexical retrieval bounded at four, public corpus only',async()=>{const r=selectScenarioEvidence('employment contract sick leave annual leave overtime working hours','');assert.ok(r.length<=4);assert.ok(r.every(s=>curatedSources.some(c=>c.id===s.id)));});
const {readScenarioHistory}=loadSource('src/lib/ai/scenario-history.ts');
await test('malformed stored answer fails explicitly instead of crashing on map',async()=>{for(const value of [null,{}, {consequence:'text',questions:'string'}, {consequence:'text',sourceIds:'string'}])assert.equal(readScenarioHistory(value,[]),undefined);});
await test('old saved scenario with no citation stays supported as unverified text',async()=>assert.deepEqual(readScenarioHistory({consequence:'Legacy fictional interpretation'},[]),{consequence:'Legacy fictional interpretation',questions:[],sourceIds:[],citations:[],affectedClauseId:undefined}));
await test('saved foreign clause and source IDs alone cannot be displayed as checked evidence',async()=>{const r=readScenarioHistory({consequence:'Synthetic result',affectedClauseId:'foreign-clause',sourceIds:['invented',source.id,source.id]},['owned-clause']);assert.equal(r.affectedClauseId,undefined);assert.deepEqual(r.sourceIds,[]);});
await test('saved citations require exact canonical source text',async()=>{const r=readScenarioHistory({consequence:'Synthetic result',citations:[{sourceId:source.id,quote:'invented'},{sourceId:source.id,quote:source.excerptAr}]},[]);assert.deepEqual(r.sourceIds,[source.id]);});
console.log(`v2-scenario-tests: ${passed} cases passed (actual action, mocked DB/provider; no network/SQL).`);
