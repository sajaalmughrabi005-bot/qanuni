// Optional external Playwright installation. Only loopback targets and isolated
// demo workflows; real provider usage, no registered accounts/production writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
if(!process.argv.includes('--live'))throw new Error('Requires --live and a local production server.');
const base=process.env.HAQ_QA_URL||'http://127.0.0.1:3005';if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Only loopback QA targets allowed.');
const {chromium}=await import(process.env.HAQ_PLAYWRIGHT_MODULE||'playwright');
const output=path.join(process.env.TEMP||process.env.TMP||'.','haq-browser-evidence');fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.HAQ_CHROME_PATH,headless:true});
const active='[role=tabpanel][data-state=active]';
try {
 for(const locale of ['en','ar']) {
  const ar=locale==='ar',context=await browser.newContext({viewport:{width:ar?390:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();let remote=0;
  page.on('request',r=>{if(/supabase.*\/(rest|storage)\//.test(r.url()))remote++;});
  await page.goto(`${base}/${locale}`);await page.locator('[data-legal-motion="reduced"]').waitFor();
  assert.ok((await page.locator('body').innerText()).includes(ar?'حق':'HAQ'));assert.equal(await page.locator('html').getAttribute('dir'),ar?'rtl':'ltr');
  const messages=JSON.parse(fs.readFileSync(`src/messages/${locale}/landing.json`,'utf8')),citizen=JSON.parse(fs.readFileSync(`src/messages/${locale}/citizen.json`,'utf8'));
  await page.getByText(messages.demoEntry.citizen,{exact:true}).click();await page.waitForURL('**/citizen/dashboard');
  await page.goto(`${base}/${locale}/citizen/analyze/new`);
  await page.locator('input[type=file]').first().setInputFiles(`scripts/dev/fixtures/ocr/${locale}.png`);
  await page.waitForFunction(()=>document.querySelector('textarea')?.value.includes('317'),null,{timeout:150000});
  console.log(locale+': actual OCR complete');
  await page.getByRole('button',{name:citizen.upload.analyzeButton,exact:true}).click();await page.waitForURL(/citizen\/analyze\/(?!new)/,{timeout:200000});
  assert.ok(await page.locator('mark').count()>0);await page.locator('mark').first().click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
  const [file]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:ar?'تحميل الملف الأصلي':'Download original',exact:true}).click()]);assert.equal(file.suggestedFilename(),`${locale}.png`);
  const [report]=await Promise.all([page.waitForEvent('popup'),page.getByRole('button',{name:ar?'تصدير التقرير إلى PDF / طباعة':'Export report to PDF / print',exact:true}).click()]);
  await report.locator('#haq-report').waitFor();await report.evaluate(()=>document.fonts.ready);const reportText=await report.locator('#haq-report').innerText();assert.ok(reportText.includes('317'));assert.ok(!reportText.includes('QANUNI'));assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(reportText));
  await report.pdf({path:path.join(output,`analysis-${locale}.pdf`),format:'A4',printBackground:true});await report.screenshot({path:path.join(output,`report-${locale}.png`)});await report.close();
  // Explicit export failure without creating a fake success state.
  await page.evaluate(()=>{window.__qaOpen=window.open;window.open=()=>null;});
  await page.getByRole('button',{name:ar?'تصدير التقرير إلى PDF / طباعة':'Export report to PDF / print',exact:true}).click();
  await page.getByText(ar?'تعذر فتح التقرير. اسمح بالنوافذ المنبثقة وأعد المحاولة.':'Unable to open report. Allow popups and retry.',{exact:true}).waitFor();
  await page.evaluate(()=>{window.open=window.__qaOpen;delete window.__qaOpen;});
  await page.getByRole('tab',{name:citizen.results.tabAsk,exact:true}).click();
  const ask=async(question,term)=>{await page.locator(active+' input').fill(question);await page.waitForFunction(()=>!document.querySelector('[role=tabpanel][data-state=active]')?.textContent.includes('Thinking...')&&!document.querySelector('[role=tabpanel][data-state=active]')?.textContent.includes('أفكّر'),null,{timeout:150000});await page.getByRole('button',{name:citizen.askTheLaw.send,exact:true}).click();await page.waitForFunction(expected=>document.querySelector('[role=tabpanel][data-state=active]')?.textContent.includes(expected),term,{timeout:150000});};
  await ask(ar?'ما المبلغ المستحق وفق النص؟':'What payment amount is specified in this document?','317');
  if(!ar)await ask('What is twice that payment? Refer to your previous answer.','634');
  // Consented, isolated case handoff uses the existing marketplace/form.
  const cases=JSON.parse(fs.readFileSync(`src/messages/${locale}/cases.json`,'utf8'));
  await page.getByRole('tab',{name:citizen.results.tabRisk,exact:true}).click();
  assert.ok((await page.getByRole('link',{name:ar?'ابحث عن محامٍ':'Find a lawyer',exact:true}).first().getAttribute('href')).endsWith(`/${locale}/lawyers`));
  await page.getByRole('button',{name:citizen.results.createCase,exact:true}).click();const dialog=page.getByRole('dialog');
  assert.ok(await dialog.getByText(cases.request.noContract,{exact:true}).isVisible());
  await dialog.getByRole('combobox').last().click();await page.getByRole('option',{name:new RegExp(`${locale}\\.png`)}).click();
  await dialog.locator('input[type=file]').setInputFiles(`scripts/dev/fixtures/ocr/${locale}.png`);
  await dialog.getByRole('button',{name:cases.request.submit,exact:true}).click();await page.waitForURL('**/citizen/cases/*');
  assert.ok((await page.locator('body').innerText()).includes(`${locale}.png`));
  const [attachment]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'download',exact:true}).first().click()]);assert.equal(attachment.suggestedFilename(),`${locale}.png`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(remote,0);
  console.log(locale+': real upload/analysis, exact highlight/dialog, original download, selected report/PDF, contract chat, reduced-motion/layout and zero Supabase traffic PASS');
  await context.close();
 }
 const p=await browser.newPage();const r=await p.request.get(`${base}/en/auth/callback?next=https://example.com`,{maxRedirects:0});assert.ok(['localhost','127.0.0.1'].includes(new URL(r.headers().location).hostname));console.log('Callback external redirect blocked.');
}finally{await browser.close();}
