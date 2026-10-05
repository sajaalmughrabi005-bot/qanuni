// Write private, run-scoped cookie files for Playwright context.addCookies.
// Never serve bearer cookies under public/ and never print their values.
import {createClient} from '@supabase/supabase-js';
import {readFileSync,mkdirSync,writeFileSync,lstatSync,existsSync} from 'node:fs';
import {requireStagingTarget,readQaRun} from './qa-target.mjs';
const target=requireStagingTarget(),run=readQaRun(target.ref);
const credentials=JSON.parse(readFileSync(new URL('../../.qa-credentials.json',import.meta.url),'utf8'));
const base=new URL('../../.qa-sessions/',import.meta.url),outDir=new URL(`${run.runId}/`,base);
if((existsSync(base)&&lstatSync(base).isSymbolicLink())||(existsSync(outDir)&&lstatSync(outDir).isSymbolicLink()))throw new Error('Refusing session output through a directory link.');
mkdirSync(outDir,{recursive:true,mode:0o700});
for(const [who,entry] of Object.entries(run.users)) {
 const credential=credentials[who];if(credential?.id!==entry.id||credential.email!==entry.email)throw new Error('QA credentials differ from the run manifest.');
 const sb=createClient(target.url,target.anonKey,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data,error}=await sb.auth.signInWithPassword({email:credential.email,password:credential.password});
 if(error||!data.session||data.user?.id!==entry.id)throw new Error('QA session creation failed.');
 const value='base64-'+Buffer.from(JSON.stringify(data.session)).toString('base64url'),name=`sb-${target.ref}-auth-token`,chunks=[];
 for(let i=0;i<value.length;i+=3180)chunks.push(value.slice(i,i+3180));
 const cookies=chunks.length===1?[[name,chunks[0]]]:chunks.map((chunk,i)=>[`${name}.${i}`,chunk]);
 writeFileSync(new URL(`${who}.json`,outDir),JSON.stringify(cookies),{mode:0o600});console.log('private session ready:',who);
}
