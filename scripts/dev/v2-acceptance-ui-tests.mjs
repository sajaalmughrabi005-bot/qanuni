// Actual upload/request React components, controlled registered-user dependencies.
// No connected browser/session/provider/database and no real data writes.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadSource,loadExternalRenderer} from './source-test-loader.mjs';
const require=createRequire(import.meta.url),React=require('react');
if(!process.env.HAQ_TEST_RENDERER)throw Error('External React 19.2.8 dev renderer required; see handoff.');
const renderer=loadExternalRenderer(process.env.HAQ_TEST_RENDERER,React),{act}=React;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const tag=name=>function TestElement({children,...props}){return React.createElement(name,props,children);};
const select=Object.fromEntries(['Select','SelectContent','SelectItem','SelectTrigger','SelectValue'].map(n=>[n,tag('div')]));
const common={
 'next-intl':{useLocale:()=> 'en',useTranslations:()=>key=>key},sonner:{toast:{error(){},warning(){},success(){assert.fail('No success toast on failure');}}},
 '@/lib/auth/use-session':{useSession:()=>({session:{userId:'owned-citizen',role:'citizen'},profile:{},isDemo:false})},
 '@/components/ui/button':{Button:tag('button')},'@/components/ui/input':{Input:tag('input')},'@/components/ui/textarea':{Textarea:tag('textarea')},'@/components/ui/label':{Label:tag('label')},'@/components/ui/card':{Card:tag('div'),CardContent:tag('div')},'@/components/ui/select':select,
 '@/components/shared/legal-motion':{LegalMotion:()=>null},'@/components/shared/data-load-error':{DataLoadError:()=>null},
};
let root,stage='source',draftIds=[],sourceCalls=0,analysisCalls=0,finalCalls=0,pushes=[];
const mount=async(Component,props={})=>act(async()=>{root=renderer.create(React.createElement(Component,props));});
const button=name=>root.root.findAllByType('button').find(n=>[n.props.children].flat().includes(name));
const alert=()=>root.root.findAll(n=>n.props.role==='alert').map(n=>n.children.join(' ')).join(' ');
const upload=loadSource('src/app/[locale]/citizen/analyze/new/page.tsx',{
 ...common,'@/i18n/navigation':{useRouter:()=>({push:p=>pushes.push(p)})},'@/lib/mock-data':{DEMO_DOCUMENT_ID:'sample'},'@/lib/demo/store':{},
 '@/lib/data/operation-failure':loadSource('src/lib/data/operation-failure.ts'),
 '@/lib/data/actions':{createDraftDocumentResult:async input=>{draftIds.push(input.id);return stage==='draft'?{ok:false,error:'schema_unavailable'}:{ok:true,data:input.id};},finalizeDocumentAnalysisResult:async()=>{finalCalls++;return {ok:false,error:'schema_unavailable'};}},
 '@/lib/documents/storage-actions':{storeCitizenSourceAction:async()=>{sourceCalls++;return stage==='source'?{ok:false,error:'schema_unavailable'}:{ok:true};}},
 '@/lib/documents/extract-text':{extractTextFromFileAction:async()=>({status:'ok',text:'Fictional contract with a monthly rent of 317 dinars.'})},
 '@/lib/ai/actions':{analyzeDocumentAction:async()=>{analysisCalls++;if(stage==='analysis')throw Error('controlled offline');return {status:'ok',clauses:[],analysis:{},documentType:'rental'};}},
});
let passed=0;const test=async(name,fn)=>{await fn();passed++;console.log('PASS '+name);};
await mount(upload.default);
const file=new File(['Fictional contract with a monthly rent of 317 dinars.'],'fictional.txt',{type:'text/plain'});
await act(async()=>root.root.findAllByType('input').find(n=>n.props.type==='file'&&!n.props.capture).props.onChange({target:{files:[file]}}));
await test('source schema failure stops before AI; input/file and ID retained on retry',async()=>{for(let i=0;i<2;i++)await act(async()=>button('analyzeButton').props.onClick());assert.equal(sourceCalls,2);assert.equal(analysisCalls,0);assert.equal(root.root.findByType('textarea').props.value,'Fictional contract with a monthly rent of 317 dinars.');assert.match(alert(),/storing the original file/);assert.equal(draftIds[0],draftIds[1]);assert.equal(pushes.length,0);});
await test('finalizer schema failure keeps draft/file/text and never navigates',async()=>{stage='save';await act(async()=>button('analyzeButton').props.onClick());assert.equal(analysisCalls,1);assert.equal(finalCalls,1);assert.match(alert(),/saving the analysis result/);assert.equal(pushes.length,0);assert.ok(button('analyzeButton').props.disabled===false);});
await test('thrown analysis transport recovers at actual stage',async()=>{stage='analysis';await act(async()=>button('analyzeButton').props.onClick());assert.match(alert(),/analyzing the document/);assert.equal(pushes.length,0);});
await test('OCR correction remains allowed; edited-text notice and fresh draft identity',async()=>{const before=draftIds.length;await act(async()=>root.root.findByType('textarea').props.onChange({target:{value:'Edited fictional legal contract with other terms.'}}));assert.ok(root.root.findAll(n=>n.props['data-edited-file-text']!==undefined).length);await act(async()=>button('analyzeButton').props.onClick());assert.equal(draftIds.length,before+1);assert.notEqual(draftIds.at(-1),draftIds[0]);assert.match(alert(),/analyzing the document/);});
await test('explicit detach retains edited text; draft failure recovers',async()=>{await act(async()=>button('Detach file and keep text').props.onClick());stage='draft';await act(async()=>button('analyzeButton').props.onClick());assert.match(alert(),/saving the document/);assert.equal(root.root.findByType('textarea').props.value,'Edited fictional legal contract with other terms.');assert.equal(sourceCalls,5);});
await act(async()=>root.unmount());
let requests=[],mode='schema';
const request=loadSource('src/components/cases/case-request-dialog.tsx',{
 ...common,'@/components/ui/dialog':Object.fromEntries(['Dialog','DialogContent','DialogFooter','DialogHeader','DialogTitle'].map(n=>[n,tag('div')])),
 '@/components/ui/avatar':{Avatar:tag('div'),AvatarFallback:tag('span')},'@/components/ui/badge':{Badge:tag('span')},
 '@/i18n/navigation':{Link:tag('a'),useRouter:()=>({push(){assert.fail('Failed request must not navigate');}})},
 '@/lib/data/hooks':{useDocuments:()=>({data:[],loading:false,error:null})},'@/lib/data/error-key':loadSource('src/lib/data/error-key.ts'),
 '@/lib/utils':{initials:()=> 'QA',cn:()=>''},'@/lib/data/actions':{CASE_DOC_TYPES:{},requestCase:async input=>{requests.push(input);if(mode==='throw')throw Error('private failure');return {ok:false,error:'schema_unavailable'};}},
});
await mount(request.CaseRequestDialog,{open:true,lawyer:{id:'approved-target',fullName:'Fictional lawyer',specialties:['civil'],acceptingNewCases:true},onOpenChange(){assert.fail('Failure must retain dialog');}});
await act(async()=>root.root.findByProps({id:'req-title'}).props.onChange({target:{value:'Fictional request'}}));
await act(async()=>root.root.findByProps({id:'req-desc'}).props.onChange({target:{value:'Fictional description without a linked document.'}}));
await test('schema error is inline; unchanged retry reuses key and has no document',async()=>{for(let i=0;i<2;i++)await act(async()=>button('request.submit').props.onClick());assert.equal(requests[0].submissionKey,requests[1].submissionKey);assert.deepEqual(requests[0].documentIds,[]);assert.equal(root.root.findByProps({id:'req-title'}).props.value,'Fictional request');assert.match(alert(),/errors.schema_unavailable/);assert.equal(button('request.submit').props.disabled,false);});
await test('thrown request releases synchronous busy gate and retains input',async()=>{mode='throw';await act(async()=>button('request.submit').props.onClick());assert.match(alert(),/errors.unknown/);assert.equal(button('request.submit').props.disabled,false);});
await test('UUID creation failure releases busy gate before any adapter call',async()=>{const prior=crypto.randomUUID,before=requests.length;try{crypto.randomUUID=()=>{throw Error('controlled unavailable crypto');};await act(async()=>root.root.findByProps({id:'req-title'}).props.onChange({target:{value:'Changed fictional request'}}));await act(async()=>button('request.submit').props.onClick());assert.equal(requests.length,before);assert.match(alert(),/errors.unknown/);assert.equal(button('request.submit').props.disabled,false);}finally{crypto.randomUUID=prior;}});
await act(async()=>root.unmount());
let feeCalls=0,feeFailure=true,feeRefresh=0;
const fee=loadSource('src/components/lawyer/consultation-price-editor.tsx',{
 ...common,'@/lib/auth/use-session':{useSession:()=>({session:{role:'lawyer'},isDemo:false})},
 '@/lib/demo/store':{},'@/lib/demo/lawyers':{},'@/lib/lawyers/consultation-price':loadSource('src/lib/lawyers/consultation-price.ts'),
 '@/lib/lawyers/price-action':{saveConsultationPriceAction:async()=>{feeCalls++;if(feeFailure)return {ok:false,error:'schema_unavailable'};return {ok:true,price:37.5};}},
});
await mount(fee.ConsultationPriceEditor,{lawyerId:'owned-lawyer',price:25,onSavedAction:async()=>{feeRefresh++;}});
await test('empty price is validation error without write, not zero/free',async()=>{await act(async()=>root.root.findByType('input').props.onChange({target:{value:''}}));await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(feeCalls,0);assert.equal(root.root.findByType('input').props.value,'');});
await test('rejected price save preserves amount and busy recovery, no refresh/success',async()=>{await act(async()=>root.root.findByType('input').props.onChange({target:{value:'37.50'}}));await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(feeRefresh,0);assert.equal(root.root.findByType('input').props.value,'37.50');assert.equal(button('Save price').props.disabled,false);assert.match(root.root.findByProps({role:'status'}).children.join(' '),/could not be confirmed/);});
await test('confirmed price triggers refresh, not a failed-write success',async()=>{feeFailure=false;await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(feeRefresh,1);assert.match(root.root.findByProps({role:'status'}).children.join(' '),/Price saved/);});
await act(async()=>root.unmount());
console.log(`v2-acceptance-ui-tests: ${passed} actual React recovery scenarios passed with controlled registered dependencies only.`);
