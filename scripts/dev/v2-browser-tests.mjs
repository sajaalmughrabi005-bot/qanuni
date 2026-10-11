// Isolated loopback app only, built with EMPTY Supabase/provider keys.
// All external browser traffic is aborted. Never run against the owner's :3000.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const base=new URL(process.env.HAQ_V2_QA_URL||'http://127.0.0.1:3015');
if(!['localhost','127.0.0.1'].includes(base.hostname)||base.port!=='3015')throw Error('Dedicated isolated QA port 3015 only.');
const {chromium}=await import(process.env.HAQ_PLAYWRIGHT_MODULE||'playwright');
const out=process.env.HAQ_V2_EVIDENCE;
if(!out)throw Error('Private evidence directory required.');
const browser=await chromium.launch({executablePath:process.env.HAQ_CHROME_PATH,headless:true});
const results=[];
let citizenState,lawyerState;
try {
 const before=process.argv.includes('--before');
 for(const [locale,width,reducedMotion] of (before?[['ar',390,'reduce'],['en',1440,'reduce']]:[['ar',360,'reduce'],['ar',390,'no-preference'],['en',1440,'no-preference'],['en',390,'reduce']])){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion,storageState:citizenState});
  const external=[];
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(['data:','blob:'].includes(url.protocol)||url.origin===base.origin)return route.continue();external.push(url.hostname);return route.abort();});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const noOverflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No mobile horizontal overflow');
  const landing=JSON.parse(fs.readFileSync(`src/messages/${locale}/landing.json`,'utf8'));
  await page.goto(`${base}/${locale}`);
  if(!citizenState){await page.getByText(landing.demoEntry.citizen,{exact:true}).click();await page.waitForURL('**/citizen/dashboard');citizenState=await context.storageState();}
  await page.goto(`${base}/${locale}/citizen/analyze/doc-demo-rental`);
  if(before){await page.locator('#result-explanation').waitFor();await page.screenshot({path:path.join(out,`before-citizen-${locale}-${width}.png`),fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(`Captured actual baseline citizen ${locale}/${width}`);await context.close();continue;}
  await page.locator('[data-results-summary]').waitFor();
  await page.locator('[data-action-finding]').first().waitFor();
  assert.equal(await page.locator('html').getAttribute('dir'),locale==='ar'?'rtl':'ltr');
  const count=await page.locator('[data-action-finding]:visible').count();assert.ok(count>0&&count<=3);
  assert.ok((await page.locator('[data-attention-count]').innerText()).length>10);
  assert.equal(await page.locator('[data-coverage]').count(),1,'Legacy sample has unknown coverage');
  assert.ok(await page.locator('[data-evidence-state="unsupported_domain"]').count()>0,'Rental sample must not borrow employment legal authority');
  assert.ok(await page.locator('[data-step-category="unsupported_action"]').count()>0);
  const caseAction=page.locator('main button.bg-gold').first();
  const contrast=await caseAction.evaluate(node=>{const css=getComputedStyle(node),rgb=c=>c.match(/[\d.]+/g).slice(0,3).map(Number),lum=c=>rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);const a=lum(css.color),b=lum(css.backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);});assert.ok(contrast>=4.5,'Citizen handoff action readable contrast');
  const more=page.locator('[data-more-findings] > summary');
  if(await more.count()){await more.focus();await page.keyboard.press('Enter');assert.ok(await page.locator('[data-action-finding]:visible').count()>count);}
  await noOverflow();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,`citizen-${locale}-${width}-${reducedMotion}.png`),fullPage:true});
  await page.screenshot({path:path.join(out,`citizen-viewport-${locale}-${width}-${reducedMotion}.png`)});
  const advanced=page.getByText(locale==='ar'?'التفاصيل المتقدمة وجميع البنود':'Advanced details and all clauses',{exact:true});
  await advanced.click();const clause=page.locator('[role="button"][tabindex="0"]').first();await clause.focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
  await page.getByRole('tab',{name:locale==='ar'?'اسأل حق':'Ask the Law',exact:true}).click();
  await page.getByRole('tab',{name:locale==='ar'?'شو بصير لو…؟':'Scenario Simulator',exact:true}).click();
  if(process.argv.includes('--all')){
    const question='Fictional QA: what if the stated payment is delayed?';
    await page.locator('#scenario-question').fill(question);
    await page.getByRole('button',{name:locale==='ar'?'شغّل المحاكاة':'Run Simulation',exact:true}).click();
    // Dedicated server has an empty provider key; rejection is real, not a fake answer.
    await page.getByText(locale==='ar'?'تعذر الحصول على نتيجة. لم تُنشأ نتيجة بديلة. حاول مجدداً.':'Unable to obtain an AI result. No substitute was generated. Please retry.',{exact:true}).waitFor();
    assert.equal(await page.locator('#scenario-question').inputValue(),question);
    assert.ok(await page.locator('#scenario-question').isEnabled());
  }
  await page.getByRole('button',{name:locale==='ar'?'عرض المستند الأصلي':'View original document',exact:true}).click();
  await page.locator('#original-document').waitFor();assert.ok(await page.getByRole('tab').first().getAttribute('aria-selected')==='true');
  if(process.argv.includes('--all')){
    await page.goto(`${base}/${locale}`);
    if(width<768)await page.getByRole('button',{name:'menu',exact:true}).click();
    await page.getByRole('link',{name:locale==='ar'?'حق للشركات':'HAQ Enterprise',exact:true}).click();
    await page.waitForURL('**/enterprise');
    let inquiryPosts=0;page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname.includes('/enterprise'))inquiryPosts++;});
    const ar=locale==='ar';
    assert.ok(await page.locator('#inquiry-company').isDisabled());
    await page.getByLabel(ar?'تفعيل تجربة النموذج ببيانات وهمية':'Enable form demo with fictional data',{exact:true}).check();
    await page.locator('#inquiry button[type="submit"]').click();
    await page.getByText(ar?'تعذر التحقق. صحح الحقول التالية؛ لم يُرسل شيء.':'Validation failed. Check the following fields; nothing was sent.',{exact:true}).waitFor();
    for(const [field,value] of [['company','Fictional QA Company'],['industry','Synthetic services'],['contact','Fictional QA Person'],['email','demo@example.test'],['concern','Fictional contract portfolio review only.']])await page.locator(`#inquiry-${field}`).fill(value);
    await page.locator('#inquiry-volume').selectOption('11-50');await page.locator('input[name=categories][value=employment]').check();await page.locator('#inquiry-demoConsent').check();
    await page.locator('#inquiry button[type="submit"]').click();
    await page.getByText(ar?'اجتازت البيانات التحقق المحلي فقط. لم يُرسل طلب ولم تُحفظ البيانات ولن يتم التواصل معك.':'Local validation passed only. No inquiry was sent, no data was saved and no contact will occur.',{exact:true}).waitFor();
    assert.equal(inquiryPosts,0);await noOverflow();await page.screenshot({path:path.join(out,`enterprise-inquiry-${locale}-${width}.png`),fullPage:true});
    await page.reload();assert.equal(await page.locator('#inquiry-company').inputValue(),'');assert.ok(await page.locator('#inquiry-company').isDisabled());
    await page.getByRole('link',{name:ar?'شاهد محفظة تجريبية':'Explore a synthetic portfolio',exact:true}).click();await page.waitForURL('**/enterprise/demo');
    assert.equal(await page.locator('[data-portfolio-stat=contracts]').innerText(),'3');assert.equal(await page.locator('[data-portfolio-stat=affected]').innerText(),'2');assert.equal(await page.locator('[data-portfolio-stat=clauses]').innerText(),'3');assert.equal(await page.locator('[data-portfolio-stat=reviewed]').innerText(),'0');assert.equal(await page.locator('[data-impact-finding]').count(),3);
    await page.getByRole('button',{name:ar?'أضف لقائمة المراجعة المحلية':'Add to local demo review list',exact:true}).first().click();assert.ok((await page.locator('[data-review-queue]').innerText()).includes('1'));
    for(const scenario of ['none','unrelated']){await page.locator('#impact-scenario').selectOption(scenario);assert.equal(await page.locator('[data-impact-finding]').count(),0);assert.equal(await page.locator('[data-portfolio-stat=affected]').innerText(),'0');await page.locator('[data-no-impacts]').waitFor();}
    for(const [scenario,limit] of [['missing','missing_provenance'],['expired','expired_version'],['unsupported','unsupported_domain']]){await page.locator('#impact-scenario').selectOption(scenario);assert.equal(await page.locator(`[data-impact-limit=${limit}]`).count(),3);}
    await page.locator('#impact-scenario').selectOption('mapped');const trace=page.locator('[data-impact-finding] summary').first();await trace.focus();await page.keyboard.press('Enter');await page.getByText('a-before → a-proposed',{exact:true}).first().waitFor();
    await noOverflow();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,`enterprise-demo-${locale}-${width}.png`),fullPage:true});await page.screenshot({path:path.join(out,`enterprise-demo-viewport-${locale}-${width}.png`)});
    await page.getByRole('button',{name:ar?'أضف لقائمة المراجعة المحلية':'Add to local demo review list',exact:true}).first().click();await page.reload();assert.ok((await page.locator('[data-review-queue]').innerText()).includes('0'));assert.equal(await page.locator('[data-portfolio-stat=reviewed]').innerText(),'0');
    console.log(`PASS enterprise ${locale}/${width}: disabled production inquiry, validated demo only/no POST/persistence, six computed scenarios, keyboard trace and local review list`);
  }
  await noOverflow();assert.deepEqual(errors,[],'No page/hydration errors');assert.deepEqual(external,[],'No external requests');
  results.push({locale,width,reducedMotion,primaryFindings:count,externalRequests:external.length,pageErrors:errors.length});
  console.log(`PASS citizen ${locale}/${width}/${reducedMotion}: actual demo results, uncertainty, next steps, disclosure keyboard, clause dialog, chat/scenario tabs`);
  await context.close();
 }
 if(process.argv.includes('--all'))for(const [locale,width] of [['ar',390],['en',1440]]){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce',storageState:lawyerState});const external=[],errors=[];
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base.origin||['blob:','data:'].includes(url.protocol))return route.continue();external.push(url.hostname);return route.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const ar=locale==='ar',landing=JSON.parse(fs.readFileSync(`src/messages/${locale}/landing.json`,'utf8'));
  await page.goto(`${base}/${locale}`);if(!lawyerState){await page.getByText(landing.demoEntry.lawyer,{exact:true}).click();await page.waitForURL('**/lawyer/dashboard');lawyerState=await context.storageState();}else await page.goto(`${base}/${locale}/lawyer/dashboard`);
  await page.getByRole('heading',{name:ar?'طلبات المواطنين':'Citizen requests',exact:true}).waitFor();
  if(width<768)await page.getByRole('button',{name:'menu',exact:true}).click();assert.equal(await page.locator('nav:visible > a').count(),6);
  const extra=page.locator('nav:visible summary').filter({hasText:ar?'أدوات إضافية':'Additional tools'});await extra.focus();await page.keyboard.press('Enter');assert.ok(await page.locator('a[href$="/lawyer/calendar"]:visible').count()>0);
  await page.locator('a[href$="/lawyer/subscription"]:visible').first().click();await page.getByRole('heading',{name:ar?'اشتراك المحامي':'Lawyer subscription',exact:true}).waitFor();assert.equal(await page.locator('main button').count(),0,'No purchase control');
  await page.goto(`${base}/${locale}/lawyer/reviews`);await page.getByRole('heading',{name:ar?'تقييمات المواطنين':'Citizen reviews',exact:true}).waitFor();assert.equal(await page.locator('main form').count(),0,'Lawyer cannot submit own review');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,`lawyer-reviews-${locale}-${width}.png`)});
  await page.goto(`${base}/${locale}/lawyer/messages`);await page.getByRole('heading').first().waitFor();await page.goto(`${base}/${locale}/lawyer/requests`);await page.getByRole('heading').first().waitFor();
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);console.log(`PASS lawyer ${locale}/${width}: focused navigation/legacy disclosure, subscription truthfulness, read-only reviews, messages/requests`);await context.close();
 }
 fs.writeFileSync(path.join(out,'browser-citizen.json'),JSON.stringify(results,null,2));
} finally {await browser.close();}
