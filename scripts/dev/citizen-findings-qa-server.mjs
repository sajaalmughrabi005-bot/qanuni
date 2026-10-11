// Reproducible, credential-isolated browser QA. Dedicated loopback :3015/:3016
// only; no owner :3000, SQL, provider egress, persisted session or env-file edits.
// Run --build first; --mock enables visibly labelled synthetic provider responses.
import {spawn} from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {localProviderResponse} from './citizen-findings-provider-fixture.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const mock=process.argv.includes('--mock');
const env={...process.env,OPENAI_API_KEY:'',SUPABASE_SERVICE_ROLE_KEY:'',NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_ANON_KEY:'',DEMO_SESSION_SECRET:'findings-qa-fictional-local-signing-key-only',NEXT_TELEMETRY_DISABLED:'1',HAQ_FINDINGS_MOCK_TRANSPORT:'0',NODE_OPTIONS:`--require "${path.join(root,'scripts/dev/citizen-findings-qa-egress.cjs').split(path.sep).join('/')}"`};
async function run(args){
  return await new Promise(resolve=>{
    const child=spawn(process.execPath,['node_modules/next/dist/bin/next',...args],{cwd:root,env,stdio:'inherit'});
    const stop=()=>child.kill('SIGINT');process.on('SIGINT',stop);process.on('SIGTERM',stop);
    child.on('error',()=>resolve(1));child.on('exit',code=>{process.off('SIGINT',stop);process.off('SIGTERM',stop);resolve(code??1);});
  });
}
if(process.argv.includes('--build')){const status=await run(['build']);if(status){process.exitCode=status;process.exit(status);}}
let transport;
const counts={};
if(mock){
  transport=http.createServer((req,res)=>{
    if(req.method!=='POST'||!['/v1/chat/completions','/v1/embeddings'].includes(req.url)){res.writeHead(404).end();return;}
    const chunks=[];let size=0;
    req.on('data',bytes=>{size+=bytes.length;if(size>200_000)req.destroy();else chunks.push(bytes);});
    req.on('end',()=>{
      try{const body=JSON.parse(Buffer.concat(chunks)),name=body.response_format?.json_schema?.name||req.url;counts[name]=(counts[name]||0)+1;res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(localProviderResponse(req.url,body)));}
      catch{res.writeHead(400,{'content-type':'application/json'}).end(JSON.stringify({error:{code:'mock_fixture_error'}}));}
    });
  });
  await new Promise((resolve,reject)=>{transport.once('error',reject);transport.listen(3016,'127.0.0.1',resolve);});
  env.OPENAI_API_KEY='fictional-local-provider-key';env.HAQ_FINDINGS_MOCK_TRANSPORT='1';
}
console.log(mock?'QA :3015 with labelled loopback MOCK transport only':'QA :3015 with empty provider/Supabase credentials');
try{process.exitCode=await run(['start','--hostname','127.0.0.1','--port','3015']);}
finally{if(transport){transport.closeAllConnections();await new Promise(resolve=>transport.close(resolve));console.log('MOCK QA operation counts (no input/identity): '+JSON.stringify(counts));}}
