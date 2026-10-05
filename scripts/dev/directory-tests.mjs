import assert from 'node:assert/strict';
import {loadSource} from './source-test-loader.mjs';
const {readPublicDirectory}=loadSource('src/lib/data/public-directory.ts',{'@/lib/supabase/mappers':loadSource('src/lib/supabase/mappers.ts')});
let response,table,filter;
const client={from:name=>{table=name;return {select(){return this;},eq(key,value){filter={key,value};return this;},order:async()=>response};}};
await assert.rejects(readPublicDirectory(null),error=>error.code==='not_configured');
for(const [code,expected]of [['PGRST205','directory_schema'],['42501','directory_permission'],['other','directory_unavailable']]){response={data:null,error:{code,message:'private SQL'}};await assert.rejects(readPublicDirectory(client),error=>error.code===expected);}
response={data:null,error:{message:'Failed to fetch'}};await assert.rejects(readPublicDirectory(client),error=>error.code==='network_error');
for(const data of [null,[{id:'x'}],[{id:'x',profile_id:'p',full_name:'Test',verification_status:'pending'}],[{id:'x',profile_id:'p',full_name:'Test',verification_status:'approved',specialties:'rental'}]]){
 response={data,error:null};await assert.rejects(readPublicDirectory(client),error=>error.code==='directory_invalid_data');
}
response={data:[],error:null};assert.deepEqual(await readPublicDirectory(client),[]);
response={data:[{id:'lawyer',profile_id:'profile',full_name:'Synthetic Lawyer',verification_status:'approved',specialties:['rental'],languages:['ar'],rating:4}],error:null};
const result=await readPublicDirectory(client,'lawyer');assert.equal(result[0].id,'lawyer');assert.equal(result[0].fullName,'Synthetic Lawyer');assert.equal(table,'lawyers_public');assert.deepEqual(filter,{key:'id',value:'lawyer'});
console.log('directory-tests: public-only read, missing configuration, schema/permission/network failures, invalid data, real empty and valid mapped rows PASS');
