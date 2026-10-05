// Run against a loopback server launched with a deliberately invalid test key.
import assert from 'node:assert/strict';import fs from 'node:fs';
const base=process.env.HAQ_QA_FAILURE_URL||'http://127.0.0.1:3006';if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Loopback only.');
const {chromium}=await import(process.env.HAQ_PLAYWRIGHT_MODULE||'playwright');const browser=await chromium.launch({executablePath:process.env.HAQ_CHROME_PATH,headless:true});
try {
 for(const locale of ['en','ar']) {
  const context=await browser.newContext({viewport:{width:locale==='ar'?390:1440,height:900}}),page=await context.newPage();let remote=0;page.on('request',r=>{if(/supabase.*\/(rest|storage)\//.test(r.url()))remote++;});
  const landing=JSON.parse(fs.readFileSync(`src/messages/${locale}/landing.json`,'utf8')),messages=JSON.parse(fs.readFileSync(`src/messages/${locale}/lawyer.json`,'utf8')).drafter;
  await page.goto(`${base}/${locale}`);await page.getByText(landing.demoEntry.lawyer,{exact:true}).click();await page.waitForURL('**/lawyer/dashboard');await page.goto(`${base}/${locale}/lawyer/drafts/new`);
  const input='Draft a fictional rental agreement for 317 dinars monthly.';await page.locator('textarea').first().fill(input);await page.getByRole('button',{name:messages.generate,exact:true}).click();
  await page.getByText(locale==='ar'?'تعذر الحصول على نتيجة. لم تُنشأ نتيجة بديلة. حاول مجدداً.':'Unable to obtain an AI result. No substitute was generated. Please retry.',{exact:true}).waitFor();
  assert.equal(await page.locator('textarea').first().inputValue(),input);assert.equal(await page.locator('textarea').nth(1).inputValue(),'');assert.ok(await page.getByRole('button',{name:messages.generate,exact:true}).isEnabled());assert.equal(remote,0);
  console.log(`${locale}: actual provider 401 -> truthful error, empty output, retained input, loading recovered, zero Supabase traffic PASS`);await context.close();
 }
 const context=await browser.newContext();await context.addCookies([{name:'qanuni_demo',value:'lawyer',url:base}]);const page=await context.newPage(),messages=JSON.parse(fs.readFileSync('src/messages/en/lawyer.json','utf8')).drafter;
 await page.goto(`${base}/en/lawyer/drafts/new`);await page.locator('textarea').first().fill('Draft fictional rent 317.');await page.getByRole('button',{name:messages.generate,exact:true}).click();await page.getByText('Unable to obtain an AI result. No substitute was generated. Please retry.',{exact:true}).waitFor();assert.equal(await page.locator('textarea').nth(1).inputValue(),'');console.log('Client-only demo cookie cannot grant server AI access PASS');await context.close();
}finally{await browser.close();}
