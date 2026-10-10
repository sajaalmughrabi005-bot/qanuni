// Dedicated local server with a clearly labelled MOCK QA provider fixture only.
// Never use real provider keys, accounts or the owner's :3000 server.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
if(process.env.HAQ_V2_MOCK_PROVIDER!=='1')throw Error('Requires explicit local MOCK QA provider harness.');
const base='http://127.0.0.1:3015',out=process.env.HAQ_V2_EVIDENCE;
if(!out)throw Error('Private evidence directory required');
const {chromium}=await import(process.env.HAQ_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.HAQ_CHROME_PATH,headless:true});let state;
try{for(const [locale,width]of [['ar',390],['en',1440]]){
 const ar=locale==='ar',context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce',storageState:state}),page=await context.newPage();const external=[],errors=[];let posts=0;
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base||['blob:','data:'].includes(url.protocol))return route.continue();external.push(url.hostname);return route.abort();});page.on('pageerror',e=>errors.push(e.message));
 const landing=JSON.parse(fs.readFileSync(`src/messages/${locale}/landing.json`,'utf8'));await page.goto(`${base}/${locale}`);if(!state){await page.getByText(landing.demoEntry.citizen,{exact:true}).click();await page.waitForURL('**/citizen/dashboard');state=await context.storageState();}
 await page.goto(`${base}/${locale}/citizen/analyze/doc-demo-rental`);await page.getByRole('tab',{name:ar?'شو بصير لو…؟':'Scenario Simulator',exact:true}).click();
 page.on('request',r=>{if(r.method()==='POST')posts++;});
 const question='MOCK QA: what if the fictional stated payment is delayed?';await page.locator('#scenario-question').fill(question);await page.getByRole('button',{name:ar?'شغّل المحاكاة':'Run Simulation',exact:true}).click();
 const answer=page.locator('p').filter({hasText:/^MOCK QA: (تفسير|fictional interpretation)/});await answer.waitFor();
 await page.getByText(ar?'لا يوجد استشهاد متحقق لهذه النتيجة؛ لا تفترض أنها حكم قانوني مدعوم.':'There is no checked citation for this result; do not assume it is a supported legal conclusion.',{exact:true}).waitFor();
 const saved=page.getByRole('button',{name:question,exact:true});await saved.waitFor();assert.equal(posts,1);await saved.click();assert.equal(posts,1,'Reopening saved result must not call provider');await answer.waitFor();
 const lawyerAction=page.getByRole('link',{name:ar?'تحدث مع محامٍ حول هذا':'Talk to a lawyer about this',exact:true});await lawyerAction.scrollIntoViewIfNeeded();
 assert.ok(await lawyerAction.evaluate(node=>{const b=node.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return !!hit&&node.contains(hit);}),'Lawyer action remains uncovered by fixed assistant');
 const contrast=await lawyerAction.evaluate(node=>{const css=getComputedStyle(node),rgb=c=>c.match(/[\d.]+/g).slice(0,3).map(Number),lum=c=>rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);const a=lum(css.color),b=lum(css.backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);});assert.ok(contrast>=4.5,'What-if lawyer action readable contrast');
 assert.equal(await page.locator('#scenario-question').inputValue(),question);assert.ok(await page.locator('#scenario-question').isEnabled());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:path.join(out,`what-if-mock-success-${locale}-${width}.png`),fullPage:true});assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 console.log(`PASS ${locale}/${width}: actual authorized action -> local MOCK QA provider -> result/unchecked-source cue -> memory history -> reopen without another call; zero external requests`);await context.close();
}}finally{await browser.close();}
