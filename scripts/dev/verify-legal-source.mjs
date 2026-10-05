import {createHash} from 'node:crypto';
import {LABOUR_SOURCE_URL,CORPUS_HASH} from '../../src/lib/legal/corpus.ts';
if(!process.argv.includes('--network')) throw new Error('Requires --network; read-only public source download, no publication or database writes.');
const response=await fetch(LABOUR_SOURCE_URL,{signal:AbortSignal.timeout(60000)});
if(!response.ok) throw new Error('Public source unavailable: '+response.status);
let size=0;const pieces=[];for await(const piece of response.body){size+=piece.length;if(size>10*1024*1024)throw new Error('Source exceeds review download bound');pieces.push(piece);}
const digest=createHash('sha256').update(Buffer.concat(pieces)).digest('hex');
if(digest!==CORPUS_HASH)throw new Error('Source changed: re-review required; corpus was not modified.');
console.log('Public source SHA-256 matches reviewed snapshot; '+size+' bytes. This does not verify legal currency/applicability.');
