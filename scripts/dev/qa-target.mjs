// Credentialed QA never loads .env.local: target designation must be explicit.
import {readFileSync} from 'node:fs';
export function validateStagingTarget(env) {
 if(env.HAQ_QA_ENVIRONMENT!=='staging'||!env.HAQ_QA_PROJECT_REF)throw new Error('QA requires an owner-designated staging project and HAQ_QA_ENVIRONMENT=staging.');
 const ref=env.HAQ_QA_PROJECT_REF;
 if(!/^[a-z0-9-]+$/.test(ref))throw new Error('Invalid staging project reference.');
 let url;try{url=new URL(env.NEXT_PUBLIC_SUPABASE_URL);}catch{throw new Error('Staging Supabase URL missing or invalid.');}
 if(url.protocol!=='https:'||url.hostname!==`${ref}.supabase.co`||url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Supabase URL does not exactly match the designated staging project.');
 if(!env.NEXT_PUBLIC_SUPABASE_ANON_KEY)throw new Error('Staging public key missing.');
 return {ref,url:url.origin,anonKey:env.NEXT_PUBLIC_SUPABASE_ANON_KEY};
}
export function requireStagingTarget(){return validateStagingTarget(process.env);}
export function verifyQaRun(run,ref) {
 if(run.projectRef!==ref||! /^[a-f0-9]{16}$/.test(run.runId)||!run.users||typeof run.users!=='object')throw new Error('QA manifest does not match this staging target.');
 for(const [key,user] of Object.entries(run.users)) {
  if(!['citizenA','citizenB','lawyerA','lawyerB','admin'].includes(key)||! /^[a-f0-9-]{36}$/.test(user.id)||user.email!==`qa-${run.runId}-${key.toLowerCase()}@example.com`)throw new Error('Invalid run-owned QA identity.');
 }
 return run;
}
export function readQaRun(ref){return verifyQaRun(JSON.parse(readFileSync(new URL('../../.qa-run.json',import.meta.url),'utf8')),ref);}
export function verifyOwnedQaUser(run,entry,user) {
 if(!user||user.id!==entry.id||user.email!==entry.email||user.user_metadata?.haq_qa_run!==run.runId)throw new Error('Refusing cleanup: account ownership differs from this QA run.');
}
