import assert from 'node:assert/strict';
import {validateStagingTarget,verifyQaRun,verifyOwnedQaUser} from './qa-target.mjs';
import {spawnSync} from 'node:child_process';
const env={HAQ_QA_ENVIRONMENT:'staging',HAQ_QA_PROJECT_REF:'synthetic-staging',NEXT_PUBLIC_SUPABASE_URL:'https://synthetic-staging.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic-key'};
assert.equal(validateStagingTarget(env).ref,'synthetic-staging');
for(const patch of [{HAQ_QA_ENVIRONMENT:''},{HAQ_QA_PROJECT_REF:''},{NEXT_PUBLIC_SUPABASE_URL:'https://other.supabase.co'},{NEXT_PUBLIC_SUPABASE_URL:'http://synthetic-staging.supabase.co'},{NEXT_PUBLIC_SUPABASE_URL:'https://synthetic-staging.supabase.co/path'},{NEXT_PUBLIC_SUPABASE_ANON_KEY:''}])assert.throws(()=>validateStagingTarget({...env,...patch}));
const run={projectRef:'synthetic-staging',runId:'0123456789abcdef',users:{citizenA:{id:'00000000-0000-4000-8000-000000000001',email:'qa-0123456789abcdef-citizena@example.com'}}};
assert.equal(verifyQaRun(run,'synthetic-staging'),run);assert.throws(()=>verifyQaRun(run,'different-target'));
assert.throws(()=>verifyQaRun({...run,users:{citizenA:{...run.users.citizenA,email:'unrelated@example.com'}}},run.projectRef));
const user={...run.users.citizenA,user_metadata:{haq_qa_run:run.runId}};verifyOwnedQaUser(run,run.users.citizenA,user);
assert.throws(()=>verifyOwnedQaUser(run,run.users.citizenA,{...user,user_metadata:{haq_qa_run:'other-run'}}));
assert.throws(()=>verifyOwnedQaUser(run,run.users.citizenA,{...user,id:'unrelated-id'}));
for(const script of ['qa-fixtures','qa-session','live-authz']) {
 const result=spawnSync(process.execPath,[`scripts/dev/${script}.mjs`,'create'],{encoding:'utf8',env:{...process.env,HAQ_QA_ENVIRONMENT:'',HAQ_QA_PROJECT_REF:'',NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_ANON_KEY:'',SUPABASE_SERVICE_ROLE_KEY:''}});
 assert.notEqual(result.status,0);assert.match(result.stderr,/owner-designated staging/);
}
console.log('qa-target-tests: designation/URL/run/account checks and all 3 credentialed entrypoint denial checks PASS. No remote calls or QA files created.');
