import {spawnSync} from 'node:child_process';
const tests=['analysis-coverage-tests','meaningful-content-tests','extract-text-tests','legal-relevance-classifier-tests','authz-tests','smoke','provider-tests','session-security-tests','ingestion-tests','analysis-service-tests','security-regression-tests','source-storage-tests','context-and-citations-tests','report-tests','demo-workflow-tests','workflow-adapter-tests','upload-recovery-tests','qa-target-tests','reminder-tests','signup-tests','directory-tests','legal-document-gate-tests','curated-source-tests','v2-next-steps-tests','v2-results-render-tests','v2-impact-tests','v2-inquiry-tests','v2-scenario-tests','v2-lawyer-tests'];
const noDb=process.argv.includes('--no-db');
const sqlSuites=new Set(['authz-tests','smoke','security-regression-tests','source-storage-tests','curated-source-tests']);
let passed=0,skipped=0;for(const test of tests){
 if(noDb&&sqlSuites.has(test)){console.log(`\nSKIPPED ${test}: --no-db prohibits SQL, including disposable databases.`);skipped++;continue;}
 console.log(`\nRunning ${test}`);const result=spawnSync(process.execPath,['--experimental-loader','./scripts/dev/alias-loader.mjs',`scripts/dev/${test}.mjs`],{stdio:'inherit',env:{...process.env,OPENAI_API_KEY:'',SUPABASE_SERVICE_ROLE_KEY:'',NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_ANON_KEY:'',DEMO_SESSION_SECRET:''}});if(result.status!==0){console.error(`${test} FAILED (${result.status})`);process.exitCode=1;}else passed++;
}
console.log(`\nsafe test suites: ${passed}/${tests.length} passed; ${skipped} explicitly skipped. No real credentials or production data used.`);
