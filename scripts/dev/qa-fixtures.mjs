// Explicit staging only; no emails sent. Cleanup uses exact run-owned identities.
import {createClient} from '@supabase/supabase-js';
import {existsSync,readFileSync,writeFileSync,unlinkSync,rmdirSync,lstatSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {requireStagingTarget,readQaRun,verifyOwnedQaUser} from './qa-target.mjs';
const target=requireStagingTarget(),command=process.argv[2];
if(!['create','remove'].includes(command))throw new Error('Usage: qa-fixtures.mjs create | remove');
if(!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Staging service key missing.');
const sb=createClient(target.url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const credentialsFile=new URL('../../.qa-credentials.json',import.meta.url),runFile=new URL('../../.qa-run.json',import.meta.url);
const specs=[{key:'citizenA',role:'citizen'},{key:'citizenB',role:'citizen'},{key:'lawyerA',role:'lawyer'},{key:'lawyerB',role:'lawyer'},{key:'admin',role:'citizen'}];
if(command==='create') {
 if(existsSync(credentialsFile)||existsSync(runFile))throw new Error('Existing QA artifacts preserved; clean that tracked run first.');
 const run={runId:randomBytes(8).toString('hex'),projectRef:target.ref,users:{}},credentials={};
 writeFileSync(runFile,JSON.stringify(run,null,2),{flag:'wx',mode:0o600});writeFileSync(credentialsFile,'{}',{flag:'wx',mode:0o600});
 for(const spec of specs) {
  const email=`qa-${run.runId}-${spec.key.toLowerCase()}@example.com`,password=randomBytes(20).toString('base64url')+'Aa1!';
  const {data,error}=await sb.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:`Synthetic QA ${spec.key}`,role:spec.role,bar_number:spec.role==='lawyer'?`QA-${run.runId}-${spec.key}`:undefined,specialty:'rental',verification_info:'Synthetic staging QA only',haq_qa_run:run.runId}});
  if(error||!data.user)throw new Error('QA account creation failed; prior created IDs remain tracked for cleanup.');
  run.users[spec.key]={id:data.user.id,email};credentials[spec.key]={id:data.user.id,email,password};
  writeFileSync(runFile,JSON.stringify(run,null,2));writeFileSync(credentialsFile,JSON.stringify(credentials,null,2));
  if(spec.key==='admin'){const result=await sb.from('profiles').update({role:'admin'}).eq('id',data.user.id);if(result.error)throw new Error('QA admin preparation failed; exact account remains tracked.');}
  console.log('created fixture:',spec.key);
 }
} else {
 const run=readQaRun(target.ref);
 const root=fileURLToPath(new URL('../../',import.meta.url)),base=resolve(root,'.qa-sessions'),sessionDir=resolve(base,run.runId);
 if(!sessionDir.startsWith(base+'\\')&&!sessionDir.startsWith(base+'/'))throw new Error('Session path escapes QA directory.');
 if((existsSync(base)&&lstatSync(base).isSymbolicLink())||(existsSync(sessionDir)&&lstatSync(sessionDir).isSymbolicLink()))throw new Error('Refusing cleanup through a session-directory link.');
 for(const [key,entry] of Object.entries({...run.users})) {
  const {data,error}=await sb.auth.admin.getUserById(entry.id);
  if(error)throw new Error('QA identity lookup failed; nothing unverified will be deleted.');
  verifyOwnedQaUser(run,entry,data.user);
  const deletion=await sb.auth.admin.deleteUser(entry.id);if(deletion.error)throw new Error('QA account deletion failed; manifest retained.');
  delete run.users[key];writeFileSync(runFile,JSON.stringify(run,null,2));
  if(existsSync(credentialsFile)){const credentials=JSON.parse(readFileSync(credentialsFile,'utf8'));delete credentials[key];writeFileSync(credentialsFile,JSON.stringify(credentials,null,2));}
  const sessionFile=join(sessionDir,`${key}.json`);if(existsSync(sessionFile))unlinkSync(sessionFile);
  console.log('removed fixture:',key);
 }
 // Only empty directories are removed; unrelated files are preserved.
 if(existsSync(sessionDir)){try{rmdirSync(sessionDir);}catch{}}
 if(existsSync(credentialsFile))unlinkSync(credentialsFile);unlinkSync(runFile);
}
