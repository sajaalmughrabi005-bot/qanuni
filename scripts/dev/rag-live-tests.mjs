// Explicit opt-in: real OpenAI requests using synthetic/public input only.
import assert from 'node:assert/strict';
if(!process.argv.includes('--live')) throw new Error('Requires --live; real provider usage, no Supabase writes.');
process.loadEnvFile('.env.local');
const {retrieveLegalSources}=await import('../../src/lib/legal/retrieval.ts');
const {analyzeText}=await import('../../src/lib/ai/analysis-service.ts');
const sources=await retrieveLegalSources('An employee waives all annual leave. Unused leave will not be paid when employment ends.');
assert.ok(sources.some(s=>s.article==='64'));assert.ok(sources.some(s=>s.article==='63'));
const result=await analyzeText('EMPLOYMENT AGREEMENT IN JORDAN. Employee salary is 881 dinars monthly. The employee waives all annual leave and receives no pay for unused annual leave on termination. Either party may end employment with 17 days notice.',crypto.randomUUID(),crypto.randomUUID(),'general');
assert.equal(result.status,'ok');assert.equal(result.documentType,'employment');assert.equal(result.analysis.coverage.coveragePercent,100);assert.ok(result.clauses.some(c=>c.legalSourceId));
assert.ok(result.clauses.every(c=>!c.legalSourceId||sources.some(s=>s.id===c.legalSourceId)));
console.log(`rag-live-tests: actual embeddings + analysis passed; ${sources.length} retrieved public excerpts, ${result.clauses.filter(c=>c.legalSourceId).length} allowlisted clause citations. Applicability is unverified.`);
