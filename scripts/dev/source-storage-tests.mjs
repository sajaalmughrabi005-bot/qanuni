import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDb,signUp,asUser} from './pg-harness.mjs';
const db=await createDb(),q=(s,p)=>db.query(s,p);let passed=0;
const test=async(name,fn)=>{await fn();passed++;console.log('ok',name);};
try {
 const a=await signUp(db,'source-owner@test',{role:'citizen'}),b=await signUp(db,'source-other@test',{role:'citizen'}),l=await signUp(db,'source-lawyer@test',{role:'lawyer'}),admin=await signUp(db,'source-admin@test',{role:'citizen'});
 await q("update lawyers set verification_status='approved' where profile_id=$1",[l]);await q("update profiles set role='admin' where id=$1",[admin]);
 const lawyer=(await q('select id from lawyers where profile_id=$1',[l])).rows[0].id;
 const doc=(await asUser(db,a,()=>q("insert into documents(user_id,file_name,citizen_description,status) values($1,'synthetic.txt','Employment annual leave is waived.','processing') returning id",[a]))).rows[0].id;
 const path=`${a}/${doc}/test.txt`;
 await test('private bucket has 10MB bound and WEBP support',async()=>{const bucket=(await q("select * from storage.buckets where id='citizen-documents'")).rows[0];assert.equal(bucket.public,false);assert.equal(bucket.file_size_limit,10485760);assert.ok(bucket.allowed_mime_types.includes('image/webp'));});
 await test('owner can upload valid owned path',()=>asUser(db,a,()=>q("insert into storage.objects(bucket_id,name,owner) values('citizen-documents',$1,$2)",[path,a])));
 await test('other citizen cannot upload to owner path',()=>asUser(db,b,()=>assert.rejects(q("insert into storage.objects(bucket_id,name,owner) values('citizen-documents',$1,$2)",[`${a}/${doc}/other.txt`,b]),/row-level/)));
 await test('malformed path safely rejected',()=>asUser(db,a,()=>assert.rejects(q("insert into storage.objects(bucket_id,name,owner) values('citizen-documents','bad/path/file',$1)",[a]),/row-level/)));
 const count=who=>asUser(db,who,async()=>(await q("select * from storage.objects where bucket_id='citizen-documents'")).rows.length);
 await test('owner reads source, unrelated citizen/admin/lawyer cannot',async()=>{assert.equal(await count(a),1);for(const who of [b,l,admin])assert.equal(await count(who),0);});
 const request={lawyerId:lawyer,title:'Synthetic leave dispute',category:'employment',description:'Fictional annual leave waiver dispute.',urgency:'medium',documentIds:[doc]};
 const caseId=(await asUser(db,a,()=>q('select request_case_once($1,$2) as id',[crypto.randomUUID(),JSON.stringify(request)]))).rows[0].id;
 await test('only explicitly assigned lawyer reads shared source',async()=>{assert.equal(await count(l),1);assert.equal(await count(b),0);assert.equal(await count(admin),0);});
 await test('disabled lawyer loses source access immediately',async()=>{await q("update profiles set account_status='disabled' where id=$1",[l]);assert.equal(await count(l),0);await q("update profiles set account_status='active' where id=$1",[l]);});
 await test('assigned lawyer cannot delete citizen original',()=>asUser(db,l,async()=>assert.equal((await q('delete from storage.objects where name=$1 returning id',[path])).rows.length,0)));
 await test('rejected lawyer loses source access',async()=>{await asUser(db,l,()=>q("select respond_case($1,false,'other',null)",[caseId]));assert.equal(await count(l),0);});
 await test('disabled owner loses reads/uploads/deletes',async()=>{await q("update profiles set account_status='disabled' where id=$1",[a]);assert.equal(await count(a),0);await asUser(db,a,()=>assert.rejects(q("insert into storage.objects(bucket_id,name,owner) values('citizen-documents',$1,$2)",[`${a}/${doc}/disabled.txt`,a]),/row-level/));await asUser(db,a,async()=>assert.equal((await q('delete from storage.objects where name=$1 returning id',[path])).rows.length,0));await q("update profiles set account_status='active' where id=$1",[a]);});
 await test('008 reruns without changing existing sources',async()=>{await db.exec(readFileSync(new URL('../../supabase/migrations/008_private_source_documents.sql',import.meta.url),'utf8'));assert.equal(await count(a),1);});
 await test('owner can delete original',()=>asUser(db,a,async()=>assert.equal((await q('delete from storage.objects where name=$1 returning id',[path])).rows.length,1)));
 console.log(`source-storage-tests: ${passed}/12 passed (disposable local Postgres only)`);
} finally {await db.close();}
