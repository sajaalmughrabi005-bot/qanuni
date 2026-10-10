import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadSource} from './source-test-loader.mjs';
let session={userId:'owned-profile'},lawyer={id:'owned-lawyer'},demo=false,state={data:[],loading:false,error:null},request,key,filter,queryCalls=0,fail=false;
const row={id:'r',clientName:'Public display name',rating:4,review:'<script>not executed</script>',createdAt:'2026-10-01',lawyerId:'owned-lawyer'};
const client={from(table){assert.equal(table,'reviews');queryCalls++;return{select(){return this;},eq(column,id){filter={column,id};return this;},order:async()=>({error:fail?{code:'42501'}:null,data:fail?null:[row]})};}};
const {default:Page}=loadSource('src/app/[locale]/lawyer/reviews/page.tsx',{
 'next-intl':{useLocale:()=> 'en'},'@/lib/auth/use-lawyer':{useMyLawyer:()=>({lawyer})},'@/lib/auth/use-session':{useSession:()=>({session,isDemo:demo})},
 '@/lib/demo/store':{useDemoStore:select=>select({reviews:[row,{...row,id:'foreign',lawyerId:'other-lawyer',review:'foreign-marker'}]})},
 '@/lib/supabase/client':{createSupabaseBrowserClient:()=>client},'@/lib/supabase/mappers':{mapReview:r=>r},'@/lib/data/use-scoped-query':{useScopedQuery:(k,read)=>{key=k;request=read;return {...state,refetch:async()=>true};}},
 '@/components/shared/data-load-error':{DataLoadError:()=>React.createElement('p',{role:'alert'},'load failed')},'@/lib/utils':{formatDate:d=>d},
});
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}const render=()=>renderToStaticMarkup(React.createElement(Page));
await test('real review read scopes target to signed-in lawyer row',async()=>{render();assert.equal(key,'owned-profile:owned-lawyer');assert.ok(request);const rows=await request();assert.deepEqual(filter,{column:'lawyer_id',id:'owned-lawyer'});assert.equal(rows.length,1);});
await test('RLS/query failure rejects, never converted to empty list',async()=>{fail=true;await assert.rejects(request(),/reviews_unavailable/);fail=false;});
await test('loading and error states render instead of fake empty',async()=>{state={data:[],loading:true,error:null};assert.match(render(),/Loading reviews/);state={data:[],loading:false,error:'failed'};assert.match(render(),/load failed/);assert.doesNotMatch(render(),/No reviews are available/);});
await test('demo isolates owner reviews and never executes real read',async()=>{demo=true;state={data:[],loading:false,error:null};const count=queryCalls,html=render();assert.equal(request,null);assert.equal(queryCalls,count);assert.match(html,/Demo review/);assert.doesNotMatch(html,/foreign-marker/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.doesNotMatch(html,/<form|<button/);});
await test('missing lawyer does not query or claim zero reviews',async()=>{demo=false;lawyer=undefined;const html=render();assert.equal(request,null);assert.match(html,/Lawyer information is unavailable/);assert.doesNotMatch(html,/No reviews are available/);});
console.log(`v2-lawyer-tests: ${passed} cases passed (actual review page, isolated adapters; no SQL/accounts).`);
