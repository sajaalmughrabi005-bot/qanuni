// Loopback only. Controlled directory reads and aborted signup submissions;
// --live additionally uses actual AI on synthetic documents in signed demo memory.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {legalDocumentCases} from './fixtures/legal-document-cases.mjs';
const base=process.env.HAQ_QA_URL||'http://127.0.0.1:3005';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Loopback only.');
const {chromium}=await import(process.env.HAQ_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.HAQ_CHROME_PATH,headless:true});
const out=path.join(process.env.TEMP||'.','haq-pre-staging-20261005');fs.mkdirSync(out,{recursive:true});
const id='00000000-0000-4000-8000-000000000321';
const lawyer={id,profile_id:id,full_name:'Synthetic directory fixture lawyer',specialties:['rental'],city:'amman',languages:['ar','en'],consultation_types:['video'],verification_status:'approved',availability_status:'available_today',accepting_new_cases:true};
const messages=(locale,file)=>JSON.parse(fs.readFileSync(`src/messages/${locale}/${file}.json`,'utf8'));
const noOverflow=async page=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
try{
 for(const locale of ['en','ar']){
  const ar=locale==='ar',context=await browser.newContext({viewport:{width:ar?390:1440,height:900},reducedMotion:'no-preference'}),page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let mode='failure',reads=0,release;const pending=new Promise(resolve=>release=resolve);
  await context.route(url=>url.hostname.endsWith('.supabase.co'),async route=>{
   const req=route.request(),url=new URL(req.url()),headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':req.headers()['access-control-request-headers']||'*'};
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(req.method()!=='GET')return route.abort();
   if(url.pathname.endsWith('/lawyers_public')){reads++;if(mode==='failure'){await pending;return route.fulfill({status:503,json:{message:'Synthetic read failure'},headers});}return route.fulfill({json:mode==='empty'?[]:[lawyer],headers});}
   return route.abort();
  });
  const landing=messages(locale,'landing'),market=messages(locale,'marketplace'),auth=messages(locale,'auth').signup;
  await page.goto(`${base}/${locale}`);await page.locator('[data-legal-motion="active"]').waitFor();assert.equal(await page.locator('html').getAttribute('dir'),ar?'rtl':'ltr');await noOverflow(page);
  await page.screenshot({path:path.join(out,`home-${locale}.png`)});
  const contrast=async button=>button.evaluate(node=>{const css=getComputedStyle(node),channels=color=>color.match(/[\d.]+/g).slice(0,3).map(Number),luminance=color=>channels(color).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,value,i)=>sum+value*[.2126,.7152,.0722][i],0);const a=luminance(css.color),b=luminance(css.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});
  const primary=page.getByRole('button',{name:landing.hero.ctaPrimary,exact:true}).first();assert.ok(await contrast(primary)>=4.5);await primary.hover();await page.waitForFunction(()=>getComputedStyle(document.querySelector('.haq-landing button')).backgroundColor==='rgb(216, 190, 137)');assert.ok(await contrast(primary)>=4.5);
  await page.getByRole('button',{name:landing.hero.ctaPrimary,exact:true}).first().click();await page.waitForURL(`**/${locale}/login?*`);
  assert.equal(new URL(page.url()).searchParams.get('next'),`/${locale}/citizen/analyze/new`);await page.goBack();await page.locator('[data-legal-motion="active"]').waitFor();
  assert.ok((await page.getByRole('link',{name:landing.hero.ctaSecondary,exact:true}).first().getAttribute('href')).endsWith(`/${locale}/lawyers`));
  await page.evaluate(()=>{window.__qaRouteSamples=[];const end=performance.now()+2500;function sample(){for(const node of document.querySelectorAll('[data-route-transition]')){window.__qaRouteSamples.push({path:node.dataset.routeTransition,opacity:Number(getComputedStyle(node).opacity),pointer:getComputedStyle(node).pointerEvents});}if(performance.now()<end)requestAnimationFrame(sample);}sample();});
  await page.getByRole('link',{name:landing.hero.ctaSecondary,exact:true}).first().click();await page.waitForURL(`**/${locale}/lawyers`);
  await page.getByText(market.states.loading,{exact:true}).waitFor();
  await page.waitForFunction(()=>window.__qaRouteSamples?.some(s=>s.path.endsWith('/lawyers')&&s.opacity>.2));
  const samples=await page.evaluate(()=>window.__qaRouteSamples);assert.ok(samples.some(s=>s.path.endsWith('/lawyers')&&s.opacity>.2));assert.ok(samples.every(s=>s.pointer==='none'));
  await page.screenshot({path:path.join(out,`directory-loading-${locale}.png`)});release();await page.getByText(market.states.errorTitle,{exact:true}).waitFor();assert.equal(await page.getByText(market.states.directoryEmpty,{exact:true}).count(),0);await noOverflow(page);
  await page.screenshot({path:path.join(out,`directory-error-${locale}.png`)});
  mode='empty';await page.getByRole('button',{name:ar?'إعادة المحاولة':'Retry',exact:true}).click();await page.getByText(market.states.directoryEmpty,{exact:true}).waitFor();assert.ok(reads>=2);assert.equal(await page.getByText(market.states.errorTitle,{exact:true}).count(),0);
  mode='success';await page.reload();await page.getByText(lawyer.full_name,{exact:true}).waitFor();await page.getByPlaceholder(market.search.placeholder).fill('no matching lawyer');await page.getByText(market.empty,{exact:true}).waitFor();await noOverflow(page);
  // No real signup POST is permitted. Exercise network rejection and recovery.
  await page.goto(`${base}/${locale}/signup`);await page.route(`**/${locale}/signup`,route=>route.request().method()==='POST'?route.abort():route.continue());
  await page.locator('#fullName').fill('Fictional Browser Applicant');await page.locator('#email').fill('fictional@example.test');await page.locator('input[type=password]').fill('fictional-password-317');
  await page.locator('form button[type=submit]').click();await page.getByText(auth.errors.service_unavailable,{exact:true}).waitFor();assert.ok(await page.locator('form button[type=submit]').isEnabled());assert.equal(await page.locator('#email').inputValue(),'fictional@example.test');await noOverflow(page);
  assert.deepEqual(errors,[]);console.log(`${locale}: actual localized navigation/visible scale, nonblocking cue, directory loading/failure/retry/empty/success/filter and aborted-signup recovery PASS (controlled adapters).`);
  await context.close();
 }
 for(const locale of ['en','ar']){
  const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();await context.route(url=>url.hostname.endsWith('.supabase.co'),route=>route.abort());
  await page.goto(`${base}/${locale}`);await page.locator('[data-legal-motion="reduced"]').waitFor();await page.getByRole('link',{name:messages(locale,'landing').hero.ctaSecondary,exact:true}).first().click();await page.waitForURL(`**/${locale}/lawyers`);assert.equal(await page.locator('[data-route-transition]').count(),0);console.log(`${locale}: reduced-motion navigation has no scale pulse PASS`);await context.close();
 }
 if(process.argv.includes('--live'))for(const locale of ['en','ar']){
  const ar=locale==='ar',context=await browser.newContext({viewport:{width:ar?390:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();let remote=0;const errors=[];
  page.on('request',r=>{if(/\.supabase\.co\//.test(r.url()))remote++;});page.on('pageerror',e=>errors.push(e.message));
  const landing=messages(locale,'landing'),citizen=messages(locale,'citizen');await page.goto(`${base}/${locale}`);await page.getByText(landing.demoEntry.citizen,{exact:true}).click();await page.waitForURL('**/citizen/dashboard');
  await page.goto(`${base}/${locale}/citizen/analyze/new`);
  await page.getByRole('button',{name:citizen.upload.useDemo,exact:true}).waitFor();
  // Random image can stop at OCR's early relevance filter or the strict gate.
  const ocrResponse=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes('/citizen/analyze/new'),{timeout:150000});
  await page.locator('input[type=file]').first().setInputFiles(path.join(out,'random-readable.png'));
  assert.equal((await ocrResponse).status(),200);
  await page.waitForFunction(()=>document.querySelector('#contract-text')?.value||document.querySelector('[data-sonner-toast]'),null,{timeout:150000});
  const extracted=await page.locator('textarea').first().inputValue();if(extracted){await page.getByRole('button',{name:citizen.upload.analyzeButton,exact:true}).click();await page.getByText(ar?'لا يبدو أن المحتوى مستنداً قانونياً. ارفع عقداً أو إنذاراً أو مستنداً قانونياً واضحاً.':'This content does not appear to be a legal document. Upload a clear contract, legal notice or legal instrument.',{exact:true}).waitFor({timeout:150000});}
  assert.ok(page.url().endsWith('/analyze/new'));console.log(locale+': actual non-legal readable image stopped before result PASS');
  await page.locator('textarea').first().fill(legalDocumentCases.find(f=>f.name==='Cropped contract').text);await page.getByRole('button',{name:citizen.upload.analyzeButton,exact:true}).click();await page.getByText(ar?'تعذر التحقق بشكل موثوق من أن هذا مستند قانوني. ارفع مستنداً قانونياً أوضح وكاملاً؛ لم يبدأ التحليل.':'We could not reliably verify that this is a legal document. Upload a clearer, complete legal document; analysis has not started.',{exact:true}).waitFor({timeout:150000});assert.ok(page.url().endsWith('/analyze/new'));
  // Actual legal image -> OCR -> gate -> RAG -> AI result in isolated memory.
  await page.locator('input[type=file]').first().setInputFiles(`scripts/dev/fixtures/ocr/${locale}.png`);await page.waitForFunction(()=>document.querySelector('textarea')?.value.includes('317'),null,{timeout:150000});await page.getByRole('button',{name:citizen.upload.analyzeButton,exact:true}).click();await page.waitForURL(/citizen\/analyze\/(?!new)/,{timeout:200000});
  await page.locator('#result-explanation').waitFor();assert.ok((await page.locator('#result-explanation').locator('..').locator('..').locator('p').innerText()).length>30);assert.ok((await page.locator('body').innerText()).includes('317'));
  assert.ok(await page.locator('mark').count()>0);const quote=await page.locator('mark').first().innerText();await page.locator('mark').first().click();await page.getByRole('dialog').waitFor();assert.ok((await page.getByRole('dialog').innerText()).includes(quote));await page.keyboard.press('Escape');
  const advanced=page.locator('details').filter({hasText:ar?'التفاصيل المتقدمة وجميع البنود':'Advanced details and all clauses'}).first();assert.equal(await advanced.getAttribute('open'),null);await advanced.locator('summary').click();assert.notEqual(await advanced.getAttribute('open'),null);
  await page.screenshot({path:path.join(out,`result-${locale}.png`)});await noOverflow(page);
  const [original]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:ar?'تحميل الملف الأصلي':'Download original',exact:true}).click()]);assert.equal(original.suggestedFilename(),`${locale}.png`);
  const [report]=await Promise.all([page.waitForEvent('popup'),page.getByRole('button',{name:ar?'تصدير التقرير إلى PDF / طباعة':'Export report to PDF / print',exact:true}).click()]);await report.locator('#haq-report').waitFor();const reportText=await report.locator('#haq-report').innerText();assert.ok(reportText.includes('317'));assert.ok(reportText.includes(ar?'المكتبة محدودة بمقتطفات مختارة من قانون العمل.':'Corpus contains selected Labour Law excerpts only.'));await report.close();
  await page.getByRole('tab',{name:citizen.results.tabAsk,exact:true}).click();const active='[role=tabpanel][data-state=active]';await page.locator(active+' input').fill(ar?'ما المبلغ المذكور في المستند؟':'What payment amount is specified in the document?');await page.getByRole('button',{name:citizen.askTheLaw.send,exact:true}).click();await page.waitForFunction(()=>document.querySelector('[role=tabpanel][data-state=active]')?.textContent.includes('317'),null,{timeout:150000});
  assert.equal(remote,0);assert.deepEqual(errors,[]);console.log(`${locale}: actual uncertain stop, legal-image OCR/gate/analysis, summary-first/progressive details, exact highlight/dialog, original/export/chat, no overflow/page errors and zero Supabase requests PASS`);await context.close();
 }
}finally{await browser.close();}
