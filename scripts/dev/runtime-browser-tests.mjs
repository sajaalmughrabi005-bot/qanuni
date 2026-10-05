// Loopback upload boundary probes: invalid synthetic bytes, no AI or database writes.
import assert from 'node:assert/strict';import fs from 'node:fs';
const base=process.env.HAQ_QA_URL||'http://127.0.0.1:3005';if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Loopback only.');
const {chromium}=await import(process.env.HAQ_PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({executablePath:process.env.HAQ_CHROME_PATH,headless:true});
try{for(const locale of ['en','ar']){
 const context=await browser.newContext({viewport:{width:locale==='ar'?390:1440,height:900}}),page=await context.newPage();let remote=0;
 page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(30000);
 console.log(`${locale}: opening isolated citizen demo`);
 page.on('request',r=>{if(/supabase.*\/(rest|storage)\//.test(r.url()))remote++;});
 const landing=JSON.parse(fs.readFileSync(`src/messages/${locale}/landing.json`,'utf8'));
 await page.goto(`${base}/${locale}`);await page.getByText(landing.demoEntry.citizen,{exact:true}).click();await page.waitForURL('**/citizen/dashboard');await page.goto(`${base}/${locale}/citizen/analyze/new`);
 const bytes=Buffer.alloc(10*1024*1024);Buffer.from('89504e470d0a1a0a','hex').copy(bytes);
 const responsePromise=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes('/citizen/analyze/new'),{timeout:45000});
 await page.locator('input[type=file]').first().setInputFiles({name:'synthetic-corrupt.png',mimeType:'image/png',buffer:bytes});
 console.log(`${locale}: synthetic 10 MiB upload submitted`);
 const response=await responsePromise;assert.equal(response.status(),200);
 await page.getByText(locale==='ar'?'تعذرت قراءة الملف. قد يكون تالفاً؛ جرّب نسخة أوضح أو الصق النص.':'Unable to read this file. It may be corrupt; upload a clearer copy or paste text.',{exact:true}).waitFor();
 assert.equal(await page.locator('textarea').inputValue(),'');assert.equal(remote,0);
 console.log(`${locale}: validation error visible; checking oversized envelope`);
 const request=response.request(),headers=await request.allHeaders();
 delete headers['content-length'];
 // Use actual action headers and an oversized synthetic body. Chromium does not
 // expose multipart file payloads; rejection must occur before parsing the body.
 // Never log cookies/headers.
 const result=await context.request.post(request.url(),{headers,data:Buffer.alloc(12*1024*1024),timeout:45000});
 assert.equal(result.status(),413);
 console.log(`${locale}: actual 10 MiB action body reaches byte validation; corrupted file rejected, input/loading recover; over-11-MB action rejected with 413; zero browser Supabase traffic PASS`);
 await context.close();
}}finally{await browser.close();}
