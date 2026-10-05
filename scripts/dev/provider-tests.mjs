import assert from "node:assert/strict";
import { z } from "zod";
import { requestText, requestJSON } from "../../src/lib/ai/provider.ts";
process.env.OPENAI_API_KEY = "test-not-real";
const originalFetch = globalThis.fetch;
let calls = 0;
function respond(status, body) { calls++; return Promise.resolve(new Response(JSON.stringify(body), { status })); }
const completion = content => ({ choices: [{ finish_reason: "stop", message: { content } }] });
try {
  for (const [status, code, expected] of [[401,"invalid_api_key","authentication"],[429,"insufficient_quota","quota"],[404,"model_not_found","model_unavailable"],[400,"invalid_request","invalid_request"]]) {
    calls = 0; globalThis.fetch = () => respond(status, { error: { code } });
    await assert.rejects(requestText({system:"s",user:"u"}), e => e.code === expected);
    assert.equal(calls,1);
  }
  calls = 0; globalThis.fetch = () => calls === 0 ? respond(503,{}) : respond(200,completion("recovered"));
  assert.equal(await requestText({system:"s",user:"u"}),"recovered"); assert.equal(calls,2);
  globalThis.fetch = () => respond(200,completion("{}"));
  await assert.rejects(requestJSON({system:"s",user:"u",name:"test",schema:z.object({answer:z.string()})}), e => e.code === "malformed_output");
  globalThis.fetch = () => respond(200,{choices:[{finish_reason:"length",message:{content:"partial"}}]});
  await assert.rejects(requestText({system:"s",user:"u"}), e => e.code === "malformed_output");
  globalThis.fetch = () => respond(200,{choices:[{message:{refusal:"declined",content:null}}]});
  await assert.rejects(requestText({system:"s",user:"u"}), e => e.code === "refusal");
  globalThis.fetch = (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.store,false); assert.equal(body.response_format.json_schema.strict,true);
    return respond(200,completion('{"answer":"specific input"}'));
  };
  assert.deepEqual(await requestJSON({system:"s",user:"u",name:"test",schema:z.object({answer:z.string()})}),{answer:"specific input"});
  delete process.env.OPENAI_API_KEY;
  await assert.rejects(requestText({system:"s",user:"u"}), e => e.code === "not_configured");
  console.log("provider-tests: 10 scenarios passed (mocked transport; not live verification)");
} finally { globalThis.fetch = originalFetch; }
