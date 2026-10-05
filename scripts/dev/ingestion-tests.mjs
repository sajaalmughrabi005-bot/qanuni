import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ingestFile} from '../../src/lib/documents/ingestion.ts';
const fixtures=new URL('./fixtures/extract-text/',import.meta.url);
const file=(name,type)=>new File([readFileSync(new URL(name,fixtures))],name,{type});
let checks=0;
for(const [name,type]of [['arabic-contract.pdf','application/pdf'],['arabic-contract.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document']]) {
 const result=await ingestFile(file(name,type));assert.equal(result.status,'ok');assert.equal(result.method,'embedded');assert.ok(result.text.length>50);checks++;
 if(name.endsWith('.pdf'))assert.match(result.warningEn,/Arabic letters/);
}
const txt=await ingestFile(new File(['عقد إيجار سكني\nRent 317 dinars.'],'contract.txt',{type:'text/plain'}));assert.equal(txt.status,'ok');assert.ok(txt.text.includes('عقد'));checks++;
for(const [input,status]of [[new File(['%PDF- fake'],'fake.pdf',{type:'application/pdf'}),'extraction_failed'],[new File(['text'],'fake.pdf',{type:'image/png'}),'unsupported_type'],[new File([new Uint8Array([0,0,0])],'binary.txt',{type:'text/plain'}),'extraction_failed'],[new File(['x'],'fake.png',{type:'image/png'}),'extraction_failed'],[new File(['x'],'fake.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),'extraction_failed'],[new File([new Uint8Array(10*1024*1024+1)],'large.txt',{type:'text/plain'}),'too_large']]) {assert.equal((await ingestFile(input)).status,status);checks++;}
const forged=Buffer.from(readFileSync(new URL('arabic-contract.docx',fixtures)));let central=-1;for(let i=0;i<forged.length-46;i++)if(forged.readUInt32LE(i)===0x02014b50&&forged.subarray(i+46,i+46+forged.readUInt16LE(i+28)).toString()==='word/document.xml'){central=i;break;}assert.ok(central>=0);forged.writeUInt32LE(1,central+24);assert.equal((await ingestFile(new File([forged],'forged.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}))).status,'extraction_failed');checks++;
console.log(`ingestion-tests: ${checks}/10 passed; no live OCR calls`);
