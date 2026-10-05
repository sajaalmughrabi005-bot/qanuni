// Explicit synthetic-input live AI in isolated demo; no registered-user writes.
import assert from 'node:assert/strict';import fs from 'node:fs';
if(!process.argv.includes('--live'))throw new Error('Requires --live.');const base=process.env.HAQ_QA_URL||'http://127.0.0.1:3005';if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('Loopback only.');
const {chromium}=await import(process.env.HAQ_PLAYWRIGHT_MODULE||'playwright');const browser=await chromium.launch({executablePath:process.env.HAQ_CHROME_PATH,headless:true});
try{for(const locale of ['en','ar']) {
 const context=await browser.newContext({viewport:{width:locale==='ar'?390:1440,height:900}}),page=await context.newPage();let remote=0;page.on('request',r=>{if(/supabase.*\/(rest|storage)\//.test(r.url()))remote++;});
 const landing=JSON.parse(fs.readFileSync(`src/messages/${locale}/landing.json`,'utf8')),t=JSON.parse(fs.readFileSync(`src/messages/${locale}/lawyer.json`,'utf8')).drafter;
 await page.goto(`${base}/${locale}`);await page.getByText(landing.demoEntry.lawyer,{exact:true}).click();await page.waitForURL('**/lawyer/dashboard');await page.goto(`${base}/${locale}/lawyer/drafts/new`);
 const instructions=page.locator('#draft-instructions'),draft=page.locator('#draft-content');
 await instructions.fill('Draft a fictional Jordanian rental agreement with 4 short clauses: rent 317 dinars monthly due day 9; deposit refund 890 dinars within 43 days. Identify parties as landlord and tenant, names unspecified.');
 const transform=async(label)=>{
  const button=page.getByRole('button',{name:label,exact:true});
  await page.waitForFunction(()=>!document.querySelector('#draft-content')?.parentElement.querySelector('.animate-pulse'),null,{timeout:150000});
  const [response]=await Promise.all([page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes('/lawyer/drafts/new'),{timeout:150000}),button.click()]);
  assert.equal(response.status(),200);
  await page.waitForFunction(label=>Array.from(document.querySelectorAll('button')).some(button=>button.textContent.trim()===label&&!button.disabled),label,{timeout:150000});
  assert.equal(await page.getByText(locale==='ar'?'تعذر الحصول على نتيجة. لم تُنشأ نتيجة بديلة. حاول مجدداً.':'Unable to obtain an AI result. No substitute was generated. Please retry.',{exact:true}).count(),0);
  await page.waitForFunction(()=>!document.querySelector('#draft-content')?.parentElement.querySelector('.animate-pulse'),null,{timeout:150000});assert.ok((await draft.inputValue()).includes('317'));console.log(`${locale}: ${label} actual AI response received`);
 };
 await transform(t.generate);await transform(t.shorten);await transform(t.makeFormal);await transform(t.translate);
 const translated=await draft.inputValue();assert.ok(locale==='ar'?/[A-Za-z]{4}/.test(translated):/[\u0600-\u06ff]{4}/.test(translated));
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Synthetic permission denial');}}}));
 await page.getByRole('button',{name:t.copy,exact:true}).click();await page.getByText(locale==='ar'?'تعذر النسخ. يمكنك تحديد النص ونسخه يدوياً.':'Copy failed. Select the text and copy it manually.',{exact:true}).waitFor();
 await page.getByRole('button',{name:t.saveDraft,exact:true}).click();await page.getByText(t.savedSuccess,{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(remote,0);console.log(`${locale}: actual draft/shorten/formal/opposite-language translation preserve 317; clipboard denial, isolated save, layout and zero Supabase traffic PASS`);await context.close();
}}finally{await browser.close();}
