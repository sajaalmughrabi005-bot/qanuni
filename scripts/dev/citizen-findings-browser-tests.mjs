// Built loopback app with empty Supabase/provider credentials only. Browser input
// is automated, not owner-operated usability or physical screen-reader acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {findingCases,renderFindingFixture} from './citizen-findings-fixtures.mjs';
const base=new URL(process.env.HAQ_V2_QA_URL||'http://127.0.0.1:3015');
if(!['localhost','127.0.0.1'].includes(base.hostname)||base.port!=='3015')throw Error('Dedicated isolated QA port 3015 only.');
const out=process.env.HAQ_V2_EVIDENCE;
if(!out)throw Error('Private evidence directory required.');
const {chromium}=await import(process.env.HAQ_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.HAQ_CHROME_PATH,headless:true});
const before=process.argv.includes('--before'),results=[];
let citizenState;
try{
  for(const [locale,width,motion] of (before?[['ar',390,'reduce'],['en',1440,'reduce']]:[['ar',360,'reduce'],['ar',390,'no-preference'],['ar',1440,'reduce'],['en',360,'no-preference'],['en',390,'reduce'],['en',1440,'no-preference']])){
    const ar=locale==='ar',context=await browser.newContext({viewport:{width,height:950},reducedMotion:motion,storageState:citizenState});
    const external=[],errors=[];
    await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===base.origin||['data:','blob:'].includes(u.protocol))return route.continue();external.push(u.hostname);return route.abort();});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    page.on('console',message=>{if(message.type()==='error'&&/hydration|hydrated|did not match|Minified React error|server rendered/i.test(message.text()))errors.push('hydration_console_error');});
    const settledTabs=()=>page.waitForFunction(()=>document.getAnimations().filter(a=>a.effect?.target instanceof Element&&a.effect.target.matches('[role=tab]')).every(a=>a.playState!=='running'));
    const landing=JSON.parse(fs.readFileSync(`src/messages/${locale}/landing.json`,'utf8'));
    await page.goto(`${base}/${locale}`);
    if(!citizenState){await page.getByText(landing.demoEntry.citizen,{exact:true}).click();await page.waitForURL('**/citizen/dashboard');citizenState=await context.storageState();}
    await page.goto(`${base}/${locale}/citizen/analyze/doc-demo-rental`);
    await page.locator('[data-results-summary]').waitFor();
    const citizen=JSON.parse(fs.readFileSync(`src/messages/${locale}/citizen.json`,'utf8'));
    await page.getByRole('tab',{name:citizen.results.tabSummary,exact:true}).click();
    await settledTabs();
    await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,`${before?'before':'after'}-summary-${locale}-${width}.png`),fullPage:true});
    await page.getByRole('tab').first().click();
    await settledTabs();
    if(before){await page.screenshot({path:path.join(out,`before-findings-${locale}-${width}.png`),fullPage:true});await context.close();continue;}
    assert.equal(await page.locator('html').getAttribute('dir'),ar?'rtl':'ltr');
    assert.equal(await page.getByRole('tab').first().innerText(),citizen.results.tabRisk);
    assert.equal(await page.locator('[data-action-finding]:visible').count(),3);
    assert.equal(await page.locator('[data-action-finding] h3:visible').allTextContents().then(v=>v.join(',')),ar?'البند 7,البند 9,البند 11':'Clause 7,Clause 9,Clause 11');
    assert.ok((await page.locator('#attention-heading').innerText()).includes('(4)'));
    assert.equal(await page.locator('[data-finding-details][open]').count(),0);
    assert.equal(await page.locator('[data-action-finding] blockquote:visible').count(),0);
    const wordCounts=await page.locator('[data-finding-brief]:visible').evaluateAll(nodes=>nodes.map(n=>n.innerText.trim().split(/\s+/).length));
    assert.ok(wordCounts.every(n=>n<=90),'Collapsed cards stay below 90 words');
    assert.equal(await page.locator('[data-evidence-state="unsupported_domain"]:visible').count(),3);
    assert.ok(await page.locator('[data-coverage]').isVisible(),'Unknown coverage remains visible');
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:path.join(out,`after-findings-${locale}-${width}.png`),fullPage:true});
    await page.locator('[data-action-finding]').first().scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,`after-findings-viewport-${locale}-${width}.png`)});
    const detail=page.locator('[data-finding-details] > summary').first();await detail.focus();await page.keyboard.press('Enter');
    assert.ok(await page.locator('[data-action-finding] blockquote').first().isVisible());
    await page.getByRole('button',{name:ar?'قارن بالمستند الأصلي':'Compare with original document',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#original-document')?.open);
    assert.equal(await page.locator('#original-document summary').evaluate(n=>n===document.activeElement),true);
    const more=page.locator('[data-more-findings] > summary');await more.focus();await page.keyboard.press('Space');assert.equal(await page.locator('[data-action-finding]:visible').count(),4);await page.keyboard.press('Space');
    const advanced=page.getByText(ar?'التفاصيل المتقدمة وجميع البنود':'Advanced details and all clauses',{exact:true});await advanced.click();
    assert.equal(await page.locator('[role="button"][tabindex="0"]:visible').count(),7,'All clauses retained');
    await page.locator('[role="button"][tabindex="0"]').first().focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
    const action=page.locator('[data-next-actions] button.bg-gold');assert.equal(await action.count(),1);await action.click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
    await page.getByRole('tab',{name:ar?'اسأل حق':citizen.results.tabAsk,exact:true}).click();
    await page.getByRole('tab',{name:ar?'شو بصير لو…؟':citizen.results.tabScenario,exact:true}).click();
    await page.getByRole('button',{name:ar?'عرض المستند الأصلي':'View original document',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#original-document')?.open);
    assert.equal(await page.getByRole('tab').first().getAttribute('aria-selected'),'true');
    const noOverflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
    await noOverflow();
    const styles=await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.href));
    // Adverse states use server-rendered actual components + built app CSS in a
    // separate document. These validate native semantics, not React hydration.
    const fixture=await context.newPage();fixture.on('pageerror',e=>errors.push(e.message));
    for(const kind of findingCases){
      await fixture.setContent(`<html lang="${locale}" dir="${ar?'rtl':'ltr'}"><head><base href="${base.origin}">${styles.map(url=>`<link rel="stylesheet" href="${url}">`).join('')}</head><body>${renderFindingFixture(kind,locale)}</body></html>`);
      await fixture.locator('main').waitFor();
      const counts=await fixture.locator('[data-finding-brief]:visible').evaluateAll(nodes=>nodes.map(n=>n.innerText.trim().split(/\s+/).length));assert.ok(counts.every(n=>n<=90));
      assert.equal(await fixture.locator('[data-finding-details][open]').count(),0);
      if(kind==='empty')assert.equal(await fixture.locator('[data-action-finding]').count(),0);
      if(kind==='repeated')assert.equal(await fixture.locator('[data-action-finding]').count(),1);
      if(kind==='unknown')assert.ok(await fixture.locator('[data-finding-priority="unknown"]').isVisible());
      if(kind==='partial')assert.ok((await fixture.locator('[data-coverage]').innerText()).includes(ar?'جزئي':'partial'));
      if(kind==='no-citation')assert.ok(await fixture.locator('[data-evidence-state="missing"]').isVisible());
      if(kind==='checked-citation'){
        assert.ok(await fixture.locator('[data-evidence-state="source_text_checked"]').isVisible());
        assert.equal(await fixture.getByRole('link').count(),0,'Citation not exposed before details');
      }
      if(kind!=='empty'){
        const summary=fixture.locator('[data-finding-details] > summary').first();await summary.focus();await fixture.keyboard.press('Enter');
        assert.ok(await fixture.locator('[data-action-finding] blockquote').first().isVisible());
        assert.ok((await summary.getAttribute('class')).includes('focus-visible'));
        if(kind==='checked-citation'){const link=fixture.getByRole('link');assert.equal(await link.count(),1);assert.ok((await link.getAttribute('href')).startsWith('https://www.mol.gov.jo/'));}
        if(kind==='long')assert.ok((await fixture.locator('[data-finding-details]').innerText()).includes(ar?'كلمة349':'word349'));
      }
      assert.ok(await fixture.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(['long','checked-citation','partial'].includes(kind))await fixture.screenshot({path:path.join(out,`fixture-${kind}-${locale}-${width}.png`),fullPage:true});
    }
    await fixture.close();assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    results.push({locale,width,motion,wordCounts,fixtureCases:findingCases.length,externalRequests:0,pageErrors:0});
    console.log(`PASS ${locale}/${width}/${motion}: actual rental app, top 3/4 count, keyboard/full details/all 7 clauses/original/consultation/tabs + ${findingCases.length} actual-component SSR states`);
    await context.close();
  }
  fs.writeFileSync(path.join(out,before?'before-browser.json':'findings-browser.json'),JSON.stringify(results,null,2));
}finally{await browser.close();}
