import assert from 'node:assert/strict';
import {loadSource} from './source-test-loader.mjs';
const {validateDemoInquiry}=loadSource('src/lib/enterprise/inquiry.ts');
const good={company:'Fictional QA Company',industry:'Synthetic services',volume:'11-50',categories:['employment'],concern:'Fictional portfolio review for a demonstration.',service:'assessment',contact:'Fictional QA Person',email:'demo@example.test',phone:'',preferredContact:'email',demoConsent:true};
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('valid fictional draft only locally validated, no submission success',()=>assert.deepEqual(validateDemoInquiry(good),{status:'validated_locally'}));
test('empty form invalid, safe field names only',()=>{const r=validateDemoInquiry({});assert.equal(r.status,'invalid');assert.ok(r.fields.includes('company'));assert.doesNotMatch(JSON.stringify(r),/secret/);});
test('invalid email category and volume rejected',()=>{const r=validateDemoInquiry({...good,email:'not-email',categories:['invented'],volume:'all'});assert.deepEqual(new Set(r.fields),new Set(['email','categories','volume']));});
test('phone preference requires phone',()=>assert.ok(validateDemoInquiry({...good,preferredContact:'phone'}).fields.includes('phone')));
test('optional blank phone accepted',()=>assert.equal(validateDemoInquiry({...good,phone:' '}).status,'validated_locally'));
test('phone and excess text rejected',()=>{const r=validateDemoInquiry({...good,phone:'<script>attack</script>',concern:'a'.repeat(1001)});assert.ok(r.fields.includes('phone'));assert.ok(r.fields.includes('concern'));});
test('punctuation alone is not a phone',()=>assert.ok(validateDemoInquiry({...good,phone:'------'}).fields.includes('phone')));
test('explicit fictional-data acknowledgement required',()=>assert.ok(validateDemoInquiry({...good,demoConsent:false}).fields.includes('demoConsent')));
test('unknown service rejected',()=>assert.ok(validateDemoInquiry({...good,service:'pay-now'}).fields.includes('service')));
test('whitespace-only names rejected',()=>assert.ok(validateDemoInquiry({...good,company:'    '}).fields.includes('company')));
test('private input never returned in success or failure result',()=>{const r=validateDemoInquiry({...good,concern:'private-marker',email:'private-marker'});assert.doesNotMatch(JSON.stringify(r),/private-marker/);});
console.log(`v2-inquiry-tests: ${passed} cases passed (validation only; no persistence/send).`);
