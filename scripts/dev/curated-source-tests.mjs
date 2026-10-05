import assert from 'node:assert/strict';
import fs from 'node:fs';
import {curatedSources,validateCitation,CORPUS_HASH} from '../../src/lib/legal/corpus.ts';
import {createDb,signUp,asUser} from './pg-harness.mjs';
assert.equal(curatedSources.length,8);assert.equal(new Set(curatedSources.map(s=>s.id)).size,8);
for(const source of curatedSources){assert.equal(new URL(source.sourceUrl).hostname,'www.mol.gov.jo');assert.equal(source.sourceSha256,CORPUS_HASH);assert.equal(source.legalStatus,'unverified');assert.equal(source.applicability,'requires_review');assert.equal(source.gazetteIssue,null);assert.ok(source.pdfPage>0);assert.equal(validateCitation(source.id,source.excerptAr,curatedSources).id,source.id);assert.equal(validateCitation(source.id,'fabricated text',curatedSources),undefined);}
const db=await createDb();try{
 const user=await signUp(db,'fictional-source@example.test',{role:'citizen'});
 const text='The fictional employer shall pay 317 dinars monthly.';
 const analysis={summaryAr:'ملخص تجريبي',summaryEn:'Fictional summary',overallRisk:'unknown'};
 for(const source of curatedSources){
  const id=(await asUser(db,user,()=>db.query("insert into documents(user_id,file_name,citizen_description,status) values($1,'fictional.txt',$2,'processing') returning id",[user,text]))).rows[0].id;
  const clause={id:crypto.randomUUID(),clauseNumber:'1',sourceText:text,sourceStart:0,sourceEnd:text.length,category:'financial',riskLevel:'unknown',legalSourceId:source.id};
  await asUser(db,user,()=>db.query('select finalize_document_analysis($1,$2,$3)',[id,JSON.stringify([clause]),JSON.stringify(analysis)]));assert.equal((await db.query('select legal_reference_id from document_clauses where document_id=$1',[id])).rows[0].legal_reference_id,source.id);
 }
 await db.exec(fs.readFileSync('supabase/migrations/009_curated_labour_references.sql','utf8'));assert.equal((await db.query('select count(*)::int as n from document_clauses')).rows[0].n,8);
}finally{await db.close();}
console.log('curated-source-tests: eight provenance records, exact citation validation, additive 009 persistence and non-destructive rerun PASS (local disposable Postgres).');
