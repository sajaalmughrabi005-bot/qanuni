// Opt-in actual provider, fictional text and synthetic scans only. No Supabase.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {classifyLegalSections} from '../../src/lib/ai/relevance.ts';
import {extractWithOCR} from '../../src/lib/documents/ocr.ts';
import {legalDocumentCases} from './fixtures/legal-document-cases.mjs';
if(!process.argv.includes('--live'))throw Error('Requires explicit --live (existing provider usage).');
if(!process.env.OPENAI_API_KEY)process.loadEnvFile('.env.local');
const evidence=[];
for(const fixture of legalDocumentCases){const result=await classifyLegalSections([fixture.text],'qa-live-'+fixture.name);evidence.push({fixture:fixture.name,expected:fixture.expected,...result});console.log(JSON.stringify(evidence.at(-1)));}
// Scan/image acceptance and random readable-image rejection use actual OCR text.
for(const [file,expected]of [['scripts/dev/fixtures/ocr/ar.png','LEGAL'],['scripts/dev/fixtures/ocr/en.png','LEGAL'],['scripts/dev/fixtures/ocr/scanned.pdf','LEGAL'],[process.env.HAQ_QA_RANDOM_IMAGE,'NON_LEGAL']]){
 if(!file)throw Error('Set HAQ_QA_RANDOM_IMAGE to a synthetic readable non-legal image.');
 const ocr=await extractWithOCR(fs.readFileSync(file),file.endsWith('.pdf')?'application/pdf':'image/png');
 const result=await classifyLegalSections([ocr.text],'qa-live-image-'+path.basename(file));evidence.push({fixture:path.basename(file),expected,...result,readable:ocr.readable,complete:ocr.complete});console.log(JSON.stringify(evidence.at(-1)));
}
const out=path.join(process.env.TEMP||'.','haq-pre-staging-20261005');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'document-gate-live.json'),JSON.stringify(evidence,null,2));
assert.equal(evidence.filter(r=>r.outcome!==r.expected).length,0,'Actual classification mismatches recorded in evidence.');
console.log('legal-document-gate-live-tests: '+evidence.length+'/'+evidence.length+' actual provider classifications PASS; no full analysis/DB writes.');
