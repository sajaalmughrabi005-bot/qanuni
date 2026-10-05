// Existing isolated demo/manual-input workflows. No fake LLM output or remote writes.
import assert from 'node:assert/strict';import fs from 'node:fs';
import {useDemoStore} from '../../src/lib/demo/store.ts';
const base=process.env.HAQ_QA_URL||'http://127.0.0.1:3005';if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Loopback only.');
const {chromium}=await import(process.env.HAQ_PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({executablePath:process.env.HAQ_CHROME_PATH,headless:true});
try{for(const locale of ['en','ar']){
 const context=await browser.newContext({viewport:{width:locale==='ar'?390:1440,height:900}}),page=await context.newPage();let remote=0;page.on('request',r=>{if(/supabase.*\/(rest|storage)\//.test(r.url()))remote++;});
 const landing=JSON.parse(fs.readFileSync(`src/messages/${locale}/landing.json`,'utf8')),lawyer=JSON.parse(fs.readFileSync(`src/messages/${locale}/lawyer.json`,'utf8'));
 await page.goto(`${base}/${locale}`);await page.getByText(landing.demoEntry.lawyer,{exact:true}).click();await page.waitForURL('**/lawyer/dashboard');
 await page.goto(`${base}/${locale}/lawyer/drafts/new?draftId=does-not-exist`);await page.getByText(locale==='ar'?'تعذر تحميل البيانات. هذه حالة خطأ وليست قائمة فارغة.':'Unable to load data. This is an error, not an empty list.',{exact:true}).waitFor();assert.equal(await page.locator('textarea').count(),0);
 await page.goto(`${base}/${locale}/lawyer/drafts/new`);await page.locator('#draft-instructions').fill('Manually entered verification draft');await page.locator('#draft-content').fill('USER_DRAFT_MARKER_738: Tenant pays 317 dinars monthly.');
 await page.getByRole('button',{name:lawyer.drafter.saveDraft,exact:true}).click();await page.getByText(lawyer.drafter.savedSuccess,{exact:true}).waitFor();await page.locator('#draft-content').waitFor();assert.ok((await page.locator('#draft-content').inputValue()).includes('USER_DRAFT_MARKER_738'));
 // Preserve memory through locale-aware client navigation to the list and back.
 await page.locator(`a[href="/${locale}/lawyer/drafts"]`).first().evaluate(el=>el.click());await page.waitForURL('**/lawyer/drafts');
 await page.locator('a[href*="draftId="]').filter({hasText:'Manually entered verification draft'}).first().evaluate(el=>el.click());await page.waitForURL(/draftId=/);await page.locator('#draft-content').waitFor();assert.ok((await page.locator('#draft-content').inputValue()).includes('USER_DRAFT_MARKER_738'));
 const savedDraftUrl=page.url();
 await page.evaluate(()=>window.history.pushState(null,'','?draftId=does-not-exist'));
 await page.getByText(locale==='ar'?'تعذر تحميل البيانات. هذه حالة خطأ وليست قائمة فارغة.':'Unable to load data. This is an error, not an empty list.',{exact:true}).waitFor();assert.equal(await page.locator('textarea').count(),0);
 await page.evaluate(url=>window.history.pushState(null,'',url),savedDraftUrl);await page.locator('#draft-content').waitFor();assert.ok((await page.locator('#draft-content').inputValue()).includes('USER_DRAFT_MARKER_738'));
 await page.goto(`${base}/${locale}/lawyer/cases/case-demo-3`);await page.getByRole('heading',{level:1}).waitFor();assert.equal(await page.locator('a[href^="tel:"],a[href^="mailto:"],a[href*="wa.me"]').count(),0);
 const profile=useDemoStore.getState().profiles.find(p=>p.id===useDemoStore.getState().cases.find(c=>c.id==='case-demo-3').clientId);if(profile?.phone){await page.getByRole('button',{name:profile.phone,exact:true}).focus();await page.keyboard.press('Enter');await page.getByText(lawyer.caseDetail.demoContact,{exact:true}).waitFor();}
 assert.equal(remote,0);console.log(`${locale}: missing draft errors, manual save/reopen, case contact isolation/keyboard, zero Supabase REST/storage traffic PASS`);await context.close();
}}finally{await browser.close();}
