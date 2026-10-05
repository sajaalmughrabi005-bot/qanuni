// External optional Playwright, synthetic report only, no network/provider/DB.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {buildAnalysisReport} from '../../src/lib/documents/report.ts';
import {curatedSources} from '../../src/lib/legal/corpus.ts';
const {chromium}=await import(process.env.HAQ_PLAYWRIGHT_MODULE||'playwright');
const out=path.join(process.env.TEMP||'.','haq-browser-evidence');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.HAQ_CHROME_PATH,headless:true});
const document={id:'private-id',fileName:'Mixed synthetic report',documentType:'rental',citizenDescription:'Rent 317 monthly.',language:'en'};
const analysis={id:'private-analysis',createdAt:'2026-10-04T10:00:00Z',summaryAr:'ملخص عقد إيجار 317 ديناراً',summaryEn:'Synthetic rental 317 dinars',overallRisk:'unknown',legalSources:curatedSources.filter(s=>s.pdfPage===6||s.pdfPage===19),coverage:{analyzedCharacters:17,totalCharacters:17,isTruncated:false}};
for(const field of ['yourObligations','otherPartyObligations','deadlines','paymentTerms','cancellationTerms','concerns','questionsForLawyer'])for(const lang of ['Ar','En'])analysis[field+lang]=Array.from({length:30},(_,i)=>`${lang==='Ar'?'التزام تجريبي مختلط للنص الطويل':'Synthetic mixed long report obligation'} ${i+1}: ${'mixed العربية 317 '.repeat(12)}`);
analysis.questionsForLawyerEn.push('FINAL_REPORT_TERM_890_43');analysis.questionsForLawyerAr.push('FINAL_REPORT_TERM_890_43');
try {
 for(const locale of ['en','ar']) {
  const page=await browser.newPage();await page.setContent(buildAnalysisReport(document,analysis,[],locale));await page.evaluate(()=>document.fonts.ready);
  const bytes=await page.pdf({path:path.join(out,`long-${locale}.pdf`),format:'A4',printBackground:true});
  const canvasPage=await browser.newPage();
  const extracted=await canvasPage.evaluate(async({data,module,worker})=>{
   const src=URL.createObjectURL(new Blob([module],{type:'text/javascript'})),workerSrc=URL.createObjectURL(new Blob([worker],{type:'text/javascript'}));
   const pdfjs=await import(src);pdfjs.GlobalWorkerOptions.workerSrc=workerSrc;
   const pdf=await pdfjs.getDocument({data:new Uint8Array(data)}).promise;let text='';
   for(let i=1;i<=pdf.numPages;i++)text+=(await (await pdf.getPage(i)).getTextContent()).items.map(x=>x.str).join(' ');
   const first=await pdf.getPage(1),v=first.getViewport({scale:1.25}),canvas=document.createElement('canvas');canvas.width=v.width;canvas.height=v.height;document.body.appendChild(canvas);await first.render({canvasContext:canvas.getContext('2d'),viewport:v}).promise;
   return {pages:pdf.numPages,text};
  },{data:Array.from(bytes),module:fs.readFileSync('node_modules/pdfjs-dist/build/pdf.mjs','utf8'),worker:fs.readFileSync('node_modules/pdfjs-dist/build/pdf.worker.mjs','utf8')});
  assert.ok(extracted.pages>5);assert.ok(extracted.text.includes('FINAL_REPORT_TERM_890_43'));assert.ok(extracted.text.includes('317'));assert.ok(!extracted.text.includes('private-id'));assert.ok(/[\u0600-\u06ff]/.test(extracted.text));
  await canvasPage.locator('canvas').screenshot({path:path.join(out,`long-${locale}-pdf-page1.png`)});console.log(`${locale}: ${extracted.pages}-page native PDF, readable mixed Arabic text, final term retained, private ID absent PASS`);await canvasPage.close();await page.close();
 }
}finally{await browser.close();}
