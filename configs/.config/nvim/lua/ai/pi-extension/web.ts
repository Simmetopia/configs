// Pure URL validation and HTML-to-text helpers. This is not an SSRF sandbox.
export const MAX_BYTES = 2_000_000;
export const MAX_TEXT = 20_000;
export const FETCH_TIMEOUT_MS = 20_000;

export function checkedUrl(input: string): URL {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Provide an HTTP(S) URL without embedded credentials');
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') ||
      !host.includes('.') || host.startsWith('[') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    throw new Error('Local hosts and IP addresses are not supported');
  }
  return url;
}

// Keep networking separate from tool registration so it can be tested without Pi.
export async function fetchPage(input: string, signal?: AbortSignal) {
  const target = checkedUrl(input);
  const deadline = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
  const response = await fetch(target, {
    headers: { Accept: 'text/html, text/plain;q=0.9', 'User-Agent': 'Mozilla/5.0 (compatible; PiWebFetch/1.0)' },
    redirect: 'manual', signal: combined,
  });
  try {
    if (response.status >= 300 && response.status < 400) {
      throw new Error('The page redirects; use its destination URL instead');
    }
    if (!response.ok) throw new Error(`Fetch returned HTTP ${response.status}`);
    const type = response.headers.get('content-type') ?? '';
    if (!/^text\/(html|plain)\b/i.test(type)) throw new Error('Unsupported content type (expected HTML or plain text)');
    if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Page is too large');
    if (!response.body) throw new Error('Empty response body');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let raw = '', size = 0;
    try {
      while (true) {
        combined.throwIfAborted();
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) throw new Error('Page is too large');
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const text = /^text\/html\b/i.test(type) ? htmlText(raw) : raw.trim();
    if (!text) throw new Error('Page contains no readable text');
    const truncated = text.length > MAX_TEXT;
    // Avoid cutting between the two UTF-16 code units of an emoji.
    let end = Math.min(text.length, MAX_TEXT);
    if (truncated && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    return { url: target.href, text: text.slice(0, end), truncated };
  } finally {
    // Includes redirects, invalid MIME types and oversized Content-Length errors.
    if (response.body && !response.body.locked) await response.body.cancel().catch(() => {});
  }
}

export function htmlText(html: string): string {
  return html.replace(/<(script|style|nav|footer|header|svg|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<\/?(?:p|div|article|section|h[1-6]|li|br|tr)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39|#x27);/gi, (entity) =>
      ({ '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'" })[entity.toLowerCase()] ?? entity)
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
}

