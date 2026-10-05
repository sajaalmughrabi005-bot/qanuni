// Actual server reminder action with controlled role/data/notification adapters.
import assert from 'node:assert/strict';
import {loadSource} from './source-test-loader.mjs';
let access={level:'real',id:'lawyer-profile',role:'lawyer'},record={client_id:'synthetic-client',lawyer_id:'synthetic-lawyer',title:'Persisted synthetic case',total_fees:900,payments_received:317},mine={id:'synthetic-lawyer'},writes=[];
const action=loadSource('src/lib/data/server-actions.ts',{
 '@/lib/auth/access':{getProfessionalAccessContext:async()=>access},
 '@/lib/supabase/server':{createSupabaseServerClient:async()=>({from:table=>({select(){return this;},eq(){return this;},single:async()=>({data:table==='cases'?record:null}),maybeSingle:async()=>({data:mine})})})},
 '@/lib/supabase/admin':{createSupabaseAdminClient:()=>({from:()=>({insert:async value=>{writes.push(value);return {error:null};}})})}
});
assert.equal((await action.sendPaymentReminderAction('case',999,'Browser supplied title')).ok,true);assert.equal(writes.length,1);assert.match(writes[0].body_en,/583/);assert.match(writes[0].body_en,/Persisted synthetic case/);assert.doesNotMatch(writes[0].body_en,/999|Browser supplied/);
for(const role of [{level:'none'},{level:'demo',role:'lawyer',id:'demo'},{level:'real',role:'citizen',id:'citizen'}]){access=role;assert.equal((await action.sendPaymentReminderAction('case',999,'fake')).ok,false);}
access={level:'real',id:'lawyer-profile',role:'lawyer'};mine={id:'other-lawyer'};assert.equal((await action.sendPaymentReminderAction('case',999,'fake')).ok,false);mine={id:'synthetic-lawyer'};record={...record,payments_received:900};assert.equal((await action.sendPaymentReminderAction('case',999,'fake')).ok,false);assert.equal(writes.length,1);
console.log('reminder-tests: persisted amount/title, denied anonymous/demo/citizen/foreign lawyer and zero-balance checks PASS. No actual notification sent.');
