// Actual server actions and byte validators, with isolated auth/Storage/DB doubles.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadSource} from './source-test-loader.mjs';
const owner='00000000-0000-4000-8000-000000000111',doc='00000000-0000-4000-8000-000000000222';
let mode,stored,docPath,uploads,removed,writes,metadataReadError;
function reset(value='normal'){mode=value;stored=new Map();docPath=null;uploads=0;removed=[];writes=0;metadataReadError=false;}
const bucket={
 async upload(path,bytes){uploads++;if(mode==='upload_failed')return {error:{statusCode:'503'}};if(stored.has(path))return {error:{statusCode:'409'}};stored.set(path,Buffer.from(bytes));return {error:null};},
 async download(path){return stored.has(path)?{data:new Blob([stored.get(path)]),error:null}:{data:null,error:{statusCode:'404'}};},
 async remove(paths){removed.push(...paths);for(const path of paths)stored.delete(path);return {error:null};}
};
const supabase={storage:{from:()=>bucket},from(table){let update;
 return {select(){return this;},eq(){return this;},is(){return this;},update(value){update=value;return this;},
  async single(){if(table==='cases')return {data:{id:doc},error:null};if(mode==='schema_read')return {data:null,error:{code:'42703',message:'private schema details'}};return metadataReadError?{data:null,error:{code:'READ_FAILURE'}}:{data:{id:doc,original_storage_path:docPath},error:null};},
  async maybeSingle(){writes++;if(mode==='metadata_lost'){docPath=update.original_storage_path;return {data:null,error:{code:'LOST_RESPONSE'}};}if(mode==='metadata_uncertain'){metadataReadError=true;return {data:null,error:{code:'LOST_RESPONSE'}};}if(mode==='other_writer'){docPath='confirmed-other-path';return {data:null,error:null};}docPath=update.original_storage_path;return {data:{id:doc},error:null};},
  async insert(){writes++;return mode==='case_metadata_lost'?{error:{code:'LOST_RESPONSE'}}:{error:null};}
 };
}};
const validation=loadSource('src/lib/documents/validation.ts',{'server-only':{}});
const actions=loadSource('src/lib/documents/storage-actions.ts',{
 '@/lib/auth/access':{getAccessContext:async()=>({level:'real',id:owner,role:'citizen'})},'@/lib/supabase/server':{createSupabaseServerClient:async()=>supabase},'./validation':validation,'@/lib/ai/limits':{consumeRateLimit(){}}
});
const text='Synthetic legal rent 317 dinars.',digest=createHash('sha256').update(text).digest('hex'),expected=`${owner}/${doc}/${digest}.txt`;
const form=(value=text,type='text/plain')=>{const data=new FormData();data.set('file',new File([value],'synthetic.txt',{type}));return data;};
let passed=0;const test=async(name,fn)=>{await fn();passed++;console.log('ok',name);};
await test('content-derived path and successful metadata',async()=>{reset();assert.equal((await actions.storeCitizenSourceAction(doc,form())).ok,true);assert.equal(docPath,expected);assert.equal(stored.get(expected).toString(),text);});
await test('same input retries preserve original without uploading again',async()=>{assert.equal((await actions.storeCitizenSourceAction(doc,form())).ok,true);assert.equal(uploads,1);assert.equal(removed.length,0);});
await test('changed bytes are rejected rather than claiming original saved',async()=>{const r=await actions.storeCitizenSourceAction(doc,form('Different legal contract 890 dinars.'));assert.equal(r.error,'submission_changed');assert.equal(uploads,1);});
await test('committed metadata with lost response is confirmed without deletion',async()=>{reset('metadata_lost');assert.equal((await actions.storeCitizenSourceAction(doc,form())).ok,true);assert.equal(removed.length,0);assert.ok(stored.has(docPath));});
await test('uncertain metadata and failed reread retain bytes and report failure',async()=>{reset('metadata_uncertain');assert.equal((await actions.storeCitizenSourceAction(doc,form())).error,'source_metadata_uncertain');assert.equal(removed.length,0);assert.ok(stored.has(expected));});
await test('retry verifies existing bytes after lost response, no duplicate object',async()=>{mode='normal';metadataReadError=false;assert.equal((await actions.storeCitizenSourceAction(doc,form())).ok,true);assert.equal(stored.size,1);assert.equal(docPath,expected);assert.equal(removed.length,0);});
await test('conflicting bytes under same path are never accepted/overwritten',async()=>{reset();stored.set(expected,Buffer.from('X'.repeat(Buffer.byteLength(text))));assert.equal((await actions.storeCitizenSourceAction(doc,form())).error,'source_bytes_mismatch');assert.equal(writes,0);assert.equal(removed.length,0);});
await test('only confirmed unreferenced duplicate is cleaned',async()=>{reset('other_writer');stored.set('confirmed-other-path',Buffer.from(text));assert.equal((await actions.storeCitizenSourceAction(doc,form())).ok,true);assert.deepEqual(removed,[expected]);assert.equal(docPath,'confirmed-other-path');});
await test('invalid MIME rejected before Storage write',async()=>{reset();assert.equal((await actions.storeCitizenSourceAction(doc,form(text,'image/png'))).ok,false);assert.equal(uploads,0);});
await test('case insert response lost retains original object, reports uncertainty',async()=>{reset('case_metadata_lost');assert.equal((await actions.uploadCaseFileAction(doc,form())).error,'upload_metadata_uncertain');assert.equal(removed.length,0);assert.equal(stored.size,1);});
await test('known upload rejection does not claim metadata saved',async()=>{reset('upload_failed');assert.equal((await actions.uploadCaseFileAction(doc,form())).error,'upload_failed');assert.equal(writes,0);assert.equal(removed.length,0);});
await test('missing original column is separate schema category, before Storage writes',async()=>{reset('schema_read');const result=await actions.storeCitizenSourceAction(doc,form());assert.deepEqual(result,{ok:false,error:'schema_unavailable'});assert.equal(uploads,0);assert.equal(writes,0);assert.doesNotMatch(JSON.stringify(result),/private schema details/);});
console.log(`upload-recovery-tests: ${passed} scenarios passed; no actual Supabase requests.`);
