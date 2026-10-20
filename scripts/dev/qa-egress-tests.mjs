// Exercise the actual QA boundary: no credentials, SQL or external requests.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import http from 'node:http';
createRequire(import.meta.url)('./citizen-findings-qa-egress.cjs');

const blobUrl = URL.createObjectURL(new Blob(['fictional document bytes']));
try {
  assert.equal(await (await fetch(blobUrl)).text(), 'fictional document bytes');
} finally {
  URL.revokeObjectURL(blobUrl);
}
assert.equal(await (await fetch('data:text/plain,fictional%20text')).text(), 'fictional text');
assert.throws(() => fetch('https://example.com/denied'), /QA external network disabled/);
assert.throws(() => http.get('http://example.com/denied'), /QA external network disabled/);
const server = http.createServer((_req, res) => res.end('loopback only'));
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const {port} = server.address();
  assert.equal(await (await fetch(`http://127.0.0.1:${port}/`)).text(), 'loopback only');
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
console.log('qa-egress-tests: blob/data/loopback allowed; external fetch/http denied before network.');
