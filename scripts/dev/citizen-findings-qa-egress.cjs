// Child-process QA guard, never imported into application/runtime deployments.
// Only --mock routes the existing provider fetch to a labelled loopback fixture.
const originalFetch = global.fetch;
const local = hostname => ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
global.fetch = (value, options) => {
  const url = new URL(typeof value === 'string' || value instanceof URL ? String(value) : value.url);
  // Native in-memory document downloads do not perform external network I/O.
  if (['blob:', 'data:'].includes(url.protocol)) return originalFetch(value, options);
  if (process.env.HAQ_FINDINGS_MOCK_TRANSPORT === '1' && url.hostname === 'api.openai.com' && ['/v1/chat/completions', '/v1/embeddings'].includes(url.pathname)) {
    return originalFetch(`http://127.0.0.1:3016${url.pathname}`, options);
  }
  if (!local(url.hostname)) throw Error('QA external network disabled');
  return originalFetch(value, options);
};
for (const protocol of ['http', 'https']) {
  const networkModule = require(protocol);
  for (const method of ['request', 'get']) {
    const previous = networkModule[method];
    networkModule[method] = function (value, ...args) {
      const hostname = typeof value === 'string' || value instanceof URL ? new URL(value).hostname : value?.hostname || value?.host || 'localhost';
      if (!local(hostname)) throw Error('QA external network disabled');
      return previous.call(this, value, ...args);
    };
  }
}
