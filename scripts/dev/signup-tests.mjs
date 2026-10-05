// Controlled Auth/DB adapters; no remote account creation or credentials.
import assert from 'node:assert/strict';
import {loadSource} from './source-test-loader.mjs';
let outcome,profile,lawyer,host='127.0.0.1:3005',calls=0,signouts=0,request,logs=[];
const original=console.info;console.info=(...args)=>logs.push(args);
const client={auth:{signUp:async input=>{calls++;request=input;if(outcome instanceof Error)throw outcome;return outcome;},signOut:async()=>{signouts++;return {error:null};}},from:table=>({select(){return this;},eq(){return this;},single:async()=>table==='profiles'?profile:lawyer})};
let configured=true;
const {signUpAction}=loadSource('src/lib/auth/actions.ts',{
 '@/lib/supabase/server':{createSupabaseServerClient:async()=>configured?client:null},
 '@/lib/supabase/admin':{createSupabaseAdminClient:()=>{throw Error('Privileged client forbidden in signup test');}},
 'next/headers':{headers:async()=>new Map([['host',host]]),cookies:async()=>({delete(){}})},
 '@/lib/governorates':{isGovernorate:value=>value==='amman'},
 '@/lib/demo/session':{DEMO_SESSION_COOKIE:'demo-session'},'@/lib/demo/mode':{DEMO_COOKIE:'demo'}
});
const input={fullName:'Fictional Applicant',email:'fictional@example.test',password:'SYNTHETIC_PASSWORD_317',role:'citizen',language:'en'};
const good={data:{user:{id:'synthetic-user',identities:[{}]},session:{}},error:null};
profile={data:{id:'synthetic-user',role:'citizen',account_status:'active'},error:null};
try {
 configured=false;assert.equal((await signUpAction(input)).error,'not_configured');assert.equal(calls,0);configured=true;
 for(const [code,error] of [['weak_password','weak_password'],['email_exists','email_taken'],['over_email_send_rate_limit','rate_limit'],['signup_disabled','service_unavailable'],['unexpected_failure','generic']]){
  outcome={data:{},error:{code,status:400,message:'INTERNAL_SQL_SECRET'}};assert.equal((await signUpAction(input)).error,error);
 }
 outcome={data:{},error:{message:'Database error saving new user INTERNAL_SQL_SECRET'}};assert.equal((await signUpAction(input)).error,'generic');assert.equal(logs.at(-1)[1].category,'database_trigger');
 outcome=Object.assign(new Error('fetch failed INTERNAL_SQL_SECRET'),{name:'AuthRetryableFetchError'});assert.equal((await signUpAction(input)).error,'service_unavailable');assert.equal(logs.at(-1)[1].stage,'auth_signup');
 outcome={data:{user:{identities:[]}},error:null};assert.equal((await signUpAction(input)).error,'email_taken');
 outcome={data:{user:null,session:null},error:null};assert.equal((await signUpAction(input)).ok,false);
 outcome={...good,data:{...good.data,session:null}};assert.deepEqual(await signUpAction(input),{ok:true,session:false});assert.equal(logs.at(-1)[1].stage,'email_confirmation');assert.ok(request.options.emailRedirectTo.startsWith('http://127.0.0.1:3005/en/auth/callback?'));
 outcome=good;profile={data:null,error:{message:'RLS DENIED SECRET'}};assert.equal((await signUpAction(input)).error,'profile_unavailable');assert.equal(signouts,1);
 profile={data:{id:'synthetic-user',role:'admin',account_status:'active'},error:null};assert.equal((await signUpAction(input)).error,'profile_unavailable');
 profile={data:{id:'synthetic-user',role:'citizen',account_status:'active'},error:null};assert.deepEqual(await signUpAction(input),{ok:true,session:true,role:'citizen'});
 profile.data.role='lawyer';lawyer={data:{profile_id:'synthetic-user',verification_status:'pending'},error:null};assert.equal((await signUpAction({...input,role:'lawyer',barNumber:'SYN317',specialty:'rental',city:'amman'})).ok,true);
 lawyer.data.verification_status='approved';assert.equal((await signUpAction({...input,role:'lawyer',barNumber:'SYN317',specialty:'rental',city:'amman'})).error,'profile_unavailable');
 const before=calls;host='example.test/path';assert.equal((await signUpAction(input)).ok,false);assert.equal(calls,before);
 assert.ok(!JSON.stringify(logs).includes('SECRET'));assert.ok(!JSON.stringify(logs).includes(input.email));assert.ok(!JSON.stringify(logs).includes(input.password));
 original('signup-tests: configuration, Auth categories, duplicate, trigger, transport, confirmation, profile/role/lawyer verification, redirect and safe diagnostics PASS');
}finally{console.info=original;}
