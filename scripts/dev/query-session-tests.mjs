// Actual React hooks/provider with controlled reads. No remote auth/DB evidence.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadSource,loadExternalRenderer} from './source-test-loader.mjs';
const require=createRequire(import.meta.url),React=require('react');
if(!process.env.HAQ_TEST_RENDERER)throw new Error('Set HAQ_TEST_RENDERER to the external React 19.2.8 test renderer development file.');
const renderer=loadExternalRenderer(process.env.HAQ_TEST_RENDERER,React),{act}=React;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const queryFailures=loadSource('src/lib/data/query-failure.ts');
const {useScopedQuery}=loadSource('src/lib/data/use-scoped-query.ts',{'./query-failure':queryFailures});
let state,root;
function Query({id,read}){state=useScopedQuery(id,read,[]);return React.createElement('span',null,state.data.join(','));}
const first=deferred(),second=deferred();
await act(async()=>{root=renderer.create(React.createElement(Query,{id:'A',read:()=>first.promise}));});
await act(async()=>{first.resolve(['PRIVATE_A']);});assert.deepEqual(state.data,['PRIVATE_A']);
const readB=()=>second.promise;await act(async()=>root.update(React.createElement(Query,{id:'B',read:readB})));
assert.deepEqual(state.data,[]);assert.equal(state.loading,true);
await act(async()=>second.reject(new Error('controlled read denial')));assert.equal(state.error,'query_failed');assert.deepEqual(state.data,[]);assert.equal(state.loading,false);
const pending=[],read=()=>{const d=deferred();pending.push(d);return d.promise;};
await act(async()=>root.update(React.createElement(Query,{id:'C',read})));
let older,newer;await act(async()=>{older=state.refetch();newer=state.refetch();});
await act(async()=>{pending[2].resolve(['LATEST_C']);await newer;});await act(async()=>{pending[1].resolve(['STALE_C']);await older;pending[0].resolve(['INITIAL_C']);});assert.deepEqual(state.data,['LATEST_C']);
let failed;await act(async()=>{failed=state.refetch();});await act(async()=>{pending[3].reject(new Error('controlled network error'));await failed;});assert.equal(state.error,'query_failed');assert.deepEqual(state.data,['LATEST_C']);
await act(async()=>root.update(React.createElement(Query,{id:'none',read:null})));assert.equal(state.loading,false);assert.deepEqual(state.data,[]);assert.equal(state.error,null);await act(async()=>root.unmount());
console.log('query: filter isolation, loading/error, stale overlapping responses, same-scope failure retention and disabled reads PASS');

let caller='ACCOUNT_A',hookReads=[];
const hookClient={from:table=>({select(){return this;},eq(column,value){this.filter={column,value};return this;},in(){return this;},order(){const pending=deferred();hookReads.push({table,filter:this.filter,...pending});return pending.promise;},maybeSingle(){const pending=deferred();hookReads.push({table,filter:this.filter,...pending});return pending.promise;}})};
const hooks=loadSource('src/lib/data/hooks.ts',{
 '@/lib/supabase/client':{createSupabaseBrowserClient:()=>hookClient},'@/lib/supabase/mappers':{mapCaseNote:row=>row},'@/lib/demo/store':{useDemoStore:fn=>fn({caseNotes:[]})},'@/lib/demo/use-demo':{useDemoRole:()=>null},'@/lib/mock-data':{demoClauses:[]},'@/lib/auth/use-session':{useSession:()=>({session:{userId:caller},isDemo:false,loading:false})},'./use-scoped-query':{useScopedQuery}
});
function Notes({id}){state=hooks.useCaseNotes(id);return null;}
await act(async()=>{root=renderer.create(React.createElement(Notes,{id:'CASE_A'}));});
assert.equal(hookReads[0].filter.value,'CASE_A');await act(async()=>hookReads[0].resolve({data:[{id:'PRIVATE_NOTE_A'}],error:null}));assert.equal(state.data[0].id,'PRIVATE_NOTE_A');
await act(async()=>root.update(React.createElement(Notes,{id:'CASE_B'})));assert.deepEqual(state.data,[]);assert.equal(state.loading,true);assert.equal(hookReads[1].filter.value,'CASE_B');
caller='ACCOUNT_B';await act(async()=>root.update(React.createElement(Notes,{id:'CASE_B'})));await act(async()=>{hookReads[1].resolve({data:[{id:'OLD_ACCOUNT'}],error:null});hookReads[2].resolve({data:null,error:{message:'controlled denial'}});});assert.deepEqual(state.data,[]);assert.equal(state.error,'query_failed');assert.equal(state.loading,false);
await act(async()=>root.update(React.createElement(Notes,{id:undefined})));assert.deepEqual(state.data,[]);assert.equal(state.loading,false);assert.equal(state.error,null);assert.equal(hookReads.length,3);await act(async()=>root.unmount());
const publicDirectory=loadSource('src/lib/data/public-directory.ts',{'./query-failure':queryFailures,'@/lib/supabase/mappers':{mapLawyer:row=>row}});
const lawyers=loadSource('src/lib/auth/use-lawyer.ts',{
 '@/lib/data/public-directory':publicDirectory,
 '@/lib/supabase/client':{createSupabaseBrowserClient:()=>hookClient},'@/lib/supabase/mappers':{mapLawyer:row=>row},'@/lib/demo/store':{useDemoStore:fn=>fn({lawyers:[]})},'@/lib/demo/use-demo':{useDemoRole:()=>null},'@/lib/auth/use-session':{useSession:()=>({})},'@/lib/data/use-scoped-query':{useScopedQuery}
});
function Lawyer({id}){state=lawyers.useLawyer(id);return null;}
await act(async()=>{root=renderer.create(React.createElement(Lawyer,{id:'LAWYER_A'}));});await act(async()=>hookReads[3].resolve({data:[{id:'LAWYER_A',profile_id:'P',full_name:'Synthetic Lawyer',verification_status:'approved'}],error:null}));assert.equal(state.lawyer.id,'LAWYER_A');
await act(async()=>root.update(React.createElement(Lawyer,{id:'LAWYER_B'})));assert.equal(state.lawyer,undefined);assert.equal(state.loading,true);await act(async()=>hookReads[4].resolve({data:null,error:{message:'controlled denial'}}));assert.equal(state.lawyer,undefined);assert.equal(state.error,'directory_unavailable');await act(async()=>root.unmount());
console.log('actual case-note and public-lawyer hooks: filter/identity switches, cancelled old identity, query errors and disabled filters PASS');

let callback,reads=[],authFailure=false;
const client={auth:{getSession:async()=>authFailure?Promise.reject(new Error('controlled auth error')):{data:{session:null},error:null},onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe(){}}}};}},from:()=>({select(){return this;},eq(){return this;},single(){const d=deferred();reads.push(d);return d.promise;}})};
const provider=loadSource('src/components/providers/session-provider.tsx',{
 '@/lib/supabase/client':{createSupabaseBrowserClient:()=>client},'@/lib/supabase/mappers':{mapProfile:x=>({id:x.id,role:x.role}),mapLawyer:x=>x},'@/lib/demo/mode':{getDemoRole:()=>null},'@/lib/demo/store':{useDemoStore:fn=>fn({profiles:[]})},'@/lib/demo/dataset':{DEMO_ADMIN_ID:'demo-admin'},'@/lib/demo/lawyers':{DEMO_LAWYER_PROFILE_ID:'demo-lawyer'},'@/lib/mock-data/contract':{DEMO_USER_ID:'demo-citizen'}
});
function Observe(){state=provider.useSession();return null;}
const mount=()=>renderer.create(React.createElement(provider.SessionProvider,null,React.createElement(Observe)));
await act(async()=>{root=mount();});assert.equal(state.loading,false);assert.equal(state.session,null);
await act(async()=>{assert.equal(callback('SIGNED_IN',{user:{id:'A'}}),undefined);await new Promise(r=>setTimeout(r,5));});assert.equal(state.loading,true);
await act(async()=>{callback('SIGNED_OUT',null);reads[0].resolve({data:{id:'A',role:'citizen',account_status:'active'},error:null});});assert.equal(state.session,null);assert.equal(state.loading,false);
await act(async()=>{callback('SIGNED_IN',{user:{id:'B'}});await new Promise(r=>setTimeout(r,5));});await act(async()=>{reads[1].reject(new Error('controlled profile failure'));});assert.equal(state.session,null);assert.equal(state.error,'profile_unavailable');assert.equal(state.loading,false);
await act(async()=>{callback('SIGNED_IN',{user:{id:'C'}});await new Promise(r=>setTimeout(r,5));});await act(async()=>{reads[2].resolve({data:{id:'C',role:'citizen',account_status:'active'},error:null});});assert.equal(state.session.userId,'C');assert.equal(state.error,null);
await act(async()=>{callback('TOKEN_REFRESHED',{user:{id:'C'}});await new Promise(r=>setTimeout(r,5));});assert.equal(state.session.userId,'C');assert.equal(state.loading,false);await act(async()=>{reads[3].resolve({data:{id:'C',role:'citizen',account_status:'active'},error:null});});
await act(async()=>root.unmount());authFailure=true;await act(async()=>{root=mount();});assert.equal(state.error,'session_unavailable');assert.equal(state.loading,false);await act(async()=>root.unmount());
console.log('session: synchronous auth callback, sign-out/old-read isolation, profile/auth rejection recovery, same-user refresh preservation PASS');
