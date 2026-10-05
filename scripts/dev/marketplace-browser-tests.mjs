// Controlled browser UI fixtures, not live Supabase integration evidence.
// Public reads are intercepted; no remote data access or mutation is allowed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.HAQ_QA_URL||'http://127.0.0.1:3005';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Loopback QA only.');
const {chromium}=await import(process.env.HAQ_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.HAQ_CHROME_PATH,headless:true});
const id='00000000-0000-4000-8000-000000000321';
const lawyer={id,profile_id:id,full_name:'Synthetic UI fixture lawyer',specialties:['rental'],city:'amman',languages:['en','ar'],consultation_types:['video'],verification_status:'approved',availability_status:'available_today',accepting_new_cases:true};
try {
 for(const locale of ['en','ar']) {
  const context=await browser.newContext({viewport:{width:locale==='ar'?390:1440,height:900}}),page=await context.newPage();
  let release,mode='failure';const gate=new Promise(resolve=>{release=resolve;});
  await context.route(url=>url.hostname.endsWith('.supabase.co'),async route=>{
   const request=route.request(),url=new URL(request.url());
   const headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':request.headers()['access-control-request-headers']||'*'};
   if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
   if(request.method()!=='GET'){await route.abort();return;}
   if(url.pathname.endsWith('/lawyers_public')){await route.fulfill({json:[lawyer],headers});return;}
   if(url.pathname.endsWith('/reviews')){
    if(mode==='failure'){await gate;await route.fulfill({status:503,json:{message:'Synthetic controlled read failure'},headers});}
    else await route.fulfill({json:[],headers});
    return;
   }
   await route.abort();
  });
  const t=JSON.parse(fs.readFileSync(`src/messages/${locale}/marketplace.json`,'utf8')).profile;
  const errorText=locale==='ar'?'تعذر تحميل البيانات. هذه حالة خطأ وليست قائمة فارغة.':'Unable to load data. This is an error, not an empty list.';
  await page.goto(`${base}/${locale}/lawyers/${id}`);
  await page.getByText(t.reviewsLoading,{exact:true}).waitFor();assert.equal(await page.getByText(t.noReviews,{exact:true}).count(),0);
  release();await page.getByText(errorText,{exact:true}).waitFor();assert.equal(await page.getByText(t.noReviews,{exact:true}).count(),0);
  mode='empty';await page.reload();await page.getByText(t.noReviews,{exact:true}).waitFor();assert.equal(await page.getByText(errorText,{exact:true}).count(),0);
  console.log(`${locale}: controlled review pending/failure/successful-empty states PASS; all Supabase requests intercepted.`);await context.close();
 }
 for(const locale of ['en','ar']) {
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();let remote=0;
  page.on('request',r=>{if(/supabase.*\/(rest|storage)\//.test(r.url()))remote++;});
  const landing=JSON.parse(fs.readFileSync(`src/messages/${locale}/landing.json`,'utf8')),market=JSON.parse(fs.readFileSync(`src/messages/${locale}/marketplace.json`,'utf8')),citizen=JSON.parse(fs.readFileSync(`src/messages/${locale}/citizen.json`,'utf8'));
  await page.goto(`${base}/${locale}`);await page.getByText(landing.demoEntry.citizen,{exact:true}).click();await page.waitForURL('**/citizen/dashboard');
  await page.goto(`${base}/${locale}/lawyers`);const save=page.getByRole('button',{name:market.card.save,exact:true}).first();await save.click();await page.waitForFunction(()=>document.querySelector('button[aria-pressed=true]'));
  await page.locator(`a[href="/${locale}/citizen/dashboard"]`).first().click();await page.waitForURL('**/citizen/dashboard');
  await page.locator(`a[href="/${locale}/citizen/lawyers"]`).first().click();await page.waitForURL('**/citizen/lawyers');
  assert.equal(await page.getByText(citizen.lawyers.empty,{exact:true}).count(),0);const unSave=page.getByRole('button',{name:market.card.save,exact:true}).first();assert.equal(await unSave.getAttribute('aria-pressed'),'true');await unSave.click();await page.getByText(citizen.lawyers.empty,{exact:true}).waitFor();assert.equal(remote,0);
  console.log(`${locale}: isolated demo save -> saved list -> unsave with zero Supabase REST/storage traffic PASS`);await context.close();
 }
}finally{await browser.close();}
