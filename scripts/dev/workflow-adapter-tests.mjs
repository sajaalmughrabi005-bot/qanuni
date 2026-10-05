// In-memory demo / missing-client paths only. No real credentials or network.
import assert from 'node:assert/strict';
import {useDemoStore} from '../../src/lib/demo/store.ts';
import {markCaseViewed,setLawyerSaved,markNotificationRead,markAllNotificationsRead,markMessagesRead} from '../../src/lib/data/actions.ts';
const originalDocument=globalThis.document;
const priorUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,priorKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
process.env.NEXT_PUBLIC_SUPABASE_URL='';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='';
try {
 globalThis.document={cookie:''};
 assert.equal((await markCaseViewed('missing-real')).ok,false);
 assert.equal((await setLawyerSaved('missing-real','missing-real',true)).ok,false);
 assert.equal((await markNotificationRead('missing-real')).ok,false);
 assert.equal((await markAllNotificationsRead('missing-real')).ok,false);
 assert.equal((await markMessagesRead('missing-real','client')).ok,false);
 globalThis.document={cookie:'qanuni_demo=lawyer'};const state=()=>useDemoStore.getState();state().reset();
 assert.equal((await markCaseViewed('missing-demo')).ok,false);
 const target=state().cases.find(c=>c.status==='requested');assert.ok(target);
 assert.equal((await markCaseViewed(target.id)).ok,true);const timestamp=state().cases.find(c=>c.id===target.id).viewedByLawyerAt;assert.ok(timestamp);
 assert.equal((await markCaseViewed(target.id)).ok,true);assert.equal(state().cases.find(c=>c.id===target.id).viewedByLawyerAt,timestamp);
 assert.equal((await setLawyerSaved('demo-only','lawyer-demo-1',true)).ok,true);await setLawyerSaved('demo-only','lawyer-demo-1',true);assert.equal(state().savedLawyerIds.filter(id=>id==='lawyer-demo-1').length,1);
 assert.equal((await setLawyerSaved('demo-only','lawyer-demo-1',false)).ok,true);assert.equal(state().savedLawyerIds.includes('lawyer-demo-1'),false);
 const record=state().cases.find(c=>c.lawyerId===target.lawyerId&&c.clientId);assert.ok(record);
 state().patchCase(record.id,{totalFees:900,paymentsReceived:317});const priorNotifications=state().notifications.length;
 assert.equal(state().sendPaymentReminder(record.id),true);assert.equal(state().notifications.length,priorNotifications+1);assert.ok(state().notifications[0].bodyEn.includes('583'));
 state().patchCase(record.id,{status:'closed'});const priorReviews=state().reviews.length;
 assert.equal(state().addReview(record.lawyerId,5,'Manually written synthetic review'),null);assert.equal(state().reviews.length,priorReviews+1);assert.equal(state().addReview(record.lawyerId,5,'Duplicate'),'alreadyReviewed');
 state().toggleSavedLawyer('lawyer-demo-1');state().reset();assert.equal(state().savedLawyerIds.length,0);assert.equal(state().submittedReviewKeys.length,0);
 console.log('workflow-adapter-tests: no-client read-marker failures, viewed timestamp, idempotent bookmarks, actual in-memory reminder/review, duplicate review and reset isolation PASS. No live DB claim.');
}finally{
 useDemoStore.getState().reset();if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
 if(priorUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=priorUrl;
 if(priorKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=priorKey;
}
