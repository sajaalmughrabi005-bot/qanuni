// Opt-in live verification with synthetic fixtures only. Never run as part of
// offline test suites. node --env-file=.env.local --experimental-loader
// ./scripts/dev/alias-loader.mjs scripts/dev/ocr-live-tests.mjs --live
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ingestFile} from "../../src/lib/documents/ingestion.ts";
if(!process.argv.includes("--live")) throw new Error("Live OCR tests require explicit --live and incur existing provider usage.");
if(!process.env.OPENAI_API_KEY)process.loadEnvFile(".env.local");
const base=new URL("./fixtures/ocr/",import.meta.url);
for(const [name,type]of [["ar.png","image/png"],["en.png","image/png"],["scanned.pdf","application/pdf"],["blank.png","image/png"]]) {
 const result=await ingestFile(new File([readFileSync(new URL(name,base))],name,{type}));
 if(name==="blank.png") assert.notEqual(result.status,"ok");
 else {assert.equal(result.status,"ok");assert.equal(result.method,"ocr");assert.ok(result.text.includes("317")&&result.text.includes("17"));}
 console.log(JSON.stringify({fixture:name,status:result.status,method:result.method,characters:result.text?.length}));
}
console.log("ocr-live-tests: 4/4 fixtures passed (actual OpenAI; synthetic documents)");
