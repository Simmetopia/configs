// Pure companion tests: no Pi runtime, network or provider credentials.
import assert from 'node:assert/strict';
import { checkedUrl, fetchPage, htmlText, MAX_BYTES, MAX_TEXT, FETCH_TIMEOUT_MS } from '../lua/ai/pi-extension/web.ts';

for (const url of ['file:///tmp/a', 'http://localhost', 'http://127.0.0.1', 'http://[::1]',
  'https://user:pass@example.com', 'http://2130706433', 'http://host.local', 'http://host.internal']) {
  assert.throws(() => checkedUrl(url));
}
assert.equal(checkedUrl('https://example.com/page').href, 'https://example.com/page');
assert.equal(htmlText('<nav>menu</nav><p>Hello &amp; goodbye</p><script>bad()</script>'), 'Hello & goodbye');

const originalFetch = globalThis.fetch;
const originalTimeout = AbortSignal.timeout;
let deadline;
AbortSignal.timeout = (ms) => {
  assert.equal(ms, FETCH_TIMEOUT_MS);
  deadline = new AbortController();
  return deadline.signal;
};
function mock(body, headers = {}, status = 200) {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode(body)); },
    cancel() { cancelled = true; },
  });
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.redirect, 'manual');
    assert(options.signal instanceof AbortSignal);
    return new Response(stream, { status, headers });
  };
  return () => cancelled;
}
try {
  // Normal responses close themselves; rejected responses must be cancelled too.
  globalThis.fetch = async () => new Response('<p>Hello</p>', { headers: { 'content-type': 'text/html' } });
  assert.deepEqual(await fetchPage('https://example.com'), { url: 'https://example.com/', text: 'Hello', truncated: false });
  const bytes = new TextEncoder().encode('snowman ☃');
  globalThis.fetch = async () => new Response(new ReadableStream({ start(c) {
    c.enqueue(bytes.slice(0, bytes.length - 1)); c.enqueue(bytes.slice(bytes.length - 1)); c.close();
  } }), { headers: { 'content-type': 'text/plain' } });
  assert.equal((await fetchPage('https://example.com')).text, 'snowman ☃');
  for (const [body, headers, status, error] of [
    ['', { 'content-type': 'text/html' }, 302, /redirects/],
    ['', {}, 500, /HTTP 500/],
    ['', { 'content-type': 'application/pdf' }, 200, /Unsupported content/],
    ['', { 'content-type': 'text/plain', 'content-length': String(MAX_BYTES + 1) }, 200, /too large/],
    ['x'.repeat(MAX_BYTES + 1), { 'content-type': 'text/plain' }, 200, /too large/],
  ]) {
    const cancelled = mock(body, headers, status);
    await assert.rejects(fetchPage('https://example.com'), error);
    assert(cancelled(), 'error path leaked the response body');
  }
  globalThis.fetch = async () => new Response('x'.repeat(MAX_TEXT - 1) + '😀tail', { headers: { 'content-type': 'text/plain' } });
  const page = await fetchPage('https://example.com');
  assert(page.truncated);
  assert.equal(page.text, 'x'.repeat(MAX_TEXT - 1));
  globalThis.fetch = async () => new Response('  ', { headers: { 'content-type': 'text/plain' } });
  await assert.rejects(fetchPage('https://example.com'), /no readable text/);

  // Simulate fetch's body cancellation on abort, without waiting 20 seconds.
  globalThis.fetch = async (_url, { signal }) => new Response(new ReadableStream({ start(c) {
    signal.addEventListener('abort', () => c.error(signal.reason), { once: true });
  } }), { headers: { 'content-type': 'text/plain' } });
  const timed = fetchPage('https://example.com');
  deadline.abort(new DOMException('Fetch deadline', 'TimeoutError'));
  await assert.rejects(timed, { name: 'TimeoutError' });
  const caller = new AbortController();
  const cancelled = fetchPage('https://example.com', caller.signal);
  caller.abort();
  await assert.rejects(cancelled, { name: 'AbortError' });
} finally {
  globalThis.fetch = originalFetch;
  AbortSignal.timeout = originalTimeout;
}
console.log('AI web tests passed');
