// Requires a dedicated :3015 app backed by the test-only loopback provider fixture.
// Actual demo state/ingestion/actions, no SQL or external network/provider/account.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fictionalContract} from './citizen-findings-provider-fixture.mjs';
const base=new URL(process.env.HAQ_V2_QA_URL||'http://127.0.0.1:3015');
if(!['localhost','127.0.0.1'].includes(base.hostname)||base.port!=='3015')throw Error('Dedicated isolated QA port 3015 only.');
const out=process.env.HAQ_V2_EVIDENCE;if(!out)throw Error('Private evidence directory required.');
const {chromium}=await import(process.env.HAQ_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.HAQ_CHROME_PATH,headless:true});
let citizenState;
try{for(const [locale,width] of [['ar',390],['en',1440]]){
  const ar=locale==='ar',context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce',storageState:citizenState});
  const external=[],errors=[];
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===base.origin||['data:','blob:'].includes(u.protocol))return r.continue();external.push(u.hostname);return r.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error'&&/hydration|hydrated|did not match|Minified React error|server rendered/i.test(message.text()))errors.push('hydration_console_error');});
  const landing=JSON.parse(fs.readFileSync(`src/messages/${locale}/landing.json`,'utf8')),citizen=JSON.parse(fs.readFileSync(`src/messages/${locale}/citizen.json`,'utf8'));
  await page.goto(`${base}/${locale}`);if(!citizenState){await page.getByText(landing.demoEntry.citizen,{exact:true}).click();await page.waitForURL('**/citizen/dashboard');citizenState=await context.storageState();}
  await page.goto(`${base}/${locale}/citizen/analyze/new`);
  await page.locator('input[type=file]').first().setInputFiles({name:'MOCK-QA-employment.txt',mimeType:'text/plain',buffer:Buffer.from(fictionalContract)});
  await page.waitForFunction(()=>document.querySelector('#contract-text')?.value.startsWith('MOCK QA written'));
  await page.getByRole('button',{name:citizen.upload.analyzeButton,exact:true}).click();
  await page.waitForURL(/\/citizen\/analyze\/(?!new|doc-demo-rental)[^/]+$/);
  await page.locator('[data-results-summary]').waitFor();await page.locator('[data-route-transition]').waitFor({state:'detached'});assert.ok((await page.locator('[data-results-summary]').innerText()).includes('MOCK QA'));
  const checked=page.locator('[data-action-finding]').filter({has:page.locator('[data-evidence-state="source_text_checked"]')});assert.equal(await checked.count(),1);
  await checked.locator('summary').focus();await page.keyboard.press('Enter');
  assert.equal((await checked.locator('blockquote').first().innerText()),fictionalContract.split('\n')[1]);
  const citation=checked.getByRole('link');assert.ok((await citation.getAttribute('href')).startsWith('https://www.mol.gov.jo/'));
  await checked.getByRole('button',{name:ar?'عرض البند في الأصل':'View clause in original',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#original-document')?.open);
  const focused=page.locator('[data-source-clause]:focus');assert.equal(await focused.count(),1);assert.equal(await focused.innerText(),fictionalContract.split('\n')[1]);
  await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();assert.ok((await page.getByRole('dialog').innerText()).includes('7(b)'));await page.keyboard.press('Escape');
  await page.screenshot({path:path.join(out,`actual-linked-highlight-viewport-${locale}-${width}.png`)});
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,`actual-linked-highlight-${locale}-${width}.png`),fullPage:true});
  const download=page.waitForEvent('download');await page.getByRole('button',{name:ar?'تحميل الملف الأصلي':'Download original',exact:true}).click();const file=await download;assert.equal(file.suggestedFilename(),'MOCK-QA-employment.txt');assert.equal(fs.readFileSync(await file.path(),'utf8'),fictionalContract);
  const popupPromise=context.waitForEvent('page');await page.getByRole('button',{name:ar?'تصدير التقرير إلى PDF / طباعة':'Export report to PDF / print',exact:true}).click();const popup=await popupPromise;
  await popup.locator('#haq-report').waitFor();assert.ok((await popup.locator('#haq-report').innerText()).includes('MOCK QA'));await popup.pdf({path:path.join(out,`mock-report-${locale}.pdf`),format:'A4',printBackground:true});await popup.close();
  await page.getByRole('tab',{name:ar?'اسأل حق':citizen.results.tabAsk,exact:true}).click();
  const chat=page.locator('[role=tabpanel] input');await chat.fill('MOCK QA: what does clause 7(b) say?');
  await page.getByRole('button',{name:citizen.askTheLaw.send,exact:true}).click();await page.waitForFunction(()=>document.querySelector('[role=tabpanel][data-state=active]')?.textContent.includes('MOCK QA: synthetic contract-chat result only, not legal advice.'));
  await page.getByRole('tab',{name:ar?'شو بصير لو…؟':citizen.results.tabScenario,exact:true}).click();await page.locator('#scenario-question').fill('MOCK QA: what if this term changes?');await page.getByRole('button',{name:ar?'شغّل المحاكاة':'Run Simulation',exact:true}).click();await page.getByText(ar?'MOCK QA: نتيجة افتراضية اصطناعية فقط.':'MOCK QA: synthetic scenario result only.',{exact:true}).waitFor();
  await page.getByRole('button',{name:ar?'عرض المستند الأصلي':'View original document',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#original-document')?.open);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  console.log(`PASS actual MOCK QA ${locale}/${width}: TXT intake -> existing demo action/save -> checked-source disclosure -> exact highlight focus/dialog -> original bytes -> current report/PDF -> chat/What-if -> return to original; zero external/page errors (native print-dialog acceptance unverified)`);
  await context.close();
}}finally{await browser.close();}
