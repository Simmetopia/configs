import { ByokProvider } from './define-provider.js';
import { ProviderId } from './providers.js';
/**
 * Read a key on the relay. Import from `@tanstack/ai/byok/server` so this
 * `process.env` access is not in the client graph.
 *
 * The header wins. A {@link ByokProvider} then tries `provider.env` in order.
 * A slug is header-only.
 */
export declare function getByokKey(request: Request, provider: ProviderId | ByokProvider): string | null;
