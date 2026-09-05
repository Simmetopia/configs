import { ChatMiddleware } from './types.js';
/**
 * A cache entry stored by the tool cache middleware.
 */
export interface ToolCacheEntry {
    result: unknown;
    timestamp: number;
}
/**
 * Custom storage backend for the tool cache middleware.
 *
 * When provided, the middleware delegates all cache operations to this storage
 * instead of using the built-in in-memory Map. This enables external storage
 * backends like Redis, localStorage, databases, etc.
 *
 * All methods may return a Promise for async storage backends.
 */
export interface ToolCacheStorage {
    getItem: (key: string) => ToolCacheEntry | undefined | Promise<ToolCacheEntry | undefined>;
    setItem: (key: string, value: ToolCacheEntry) => void | Promise<void>;
    deleteItem: (key: string) => void | Promise<void>;
}
/**
 * Options for the tool cache middleware.
 */
export interface ToolCacheMiddlewareOptions {
    /**
     * Maximum number of entries in the cache.
     * When exceeded, the oldest entry is evicted (LRU).
     *
     * Only applies to the default in-memory storage.
     * When a custom `storage` is provided, capacity management is the storage's responsibility.
     *
     * @default 100
     */
    maxSize?: number;
    /**
     * Time-to-live in milliseconds. Entries older than this are not served from cache.
     * @default Infinity (no expiry)
     */
    ttl?: number;
    /**
     * Tool names to cache. If not provided, all tools are cached.
     */
    toolNames?: Array<string>;
    /**
     * Custom function to generate a cache key from tool name and args.
     * Defaults to `JSON.stringify([toolName, args])`.
     */
    keyFn?: (toolName: string, args: unknown) => string;
    /**
     * Custom storage backend. When provided, the middleware uses this instead of
     * the built-in in-memory Map. The storage is responsible for its own capacity
     * management — the `maxSize` option is ignored.
     *
     * @example
     * ```ts
     * toolCacheMiddleware({
     *   storage: {
     *     getItem: (key) => redisClient.get(key).then(v => v ? JSON.parse(v) : undefined),
     *     setItem: (key, value) => redisClient.set(key, JSON.stringify(value)),
     *     deleteItem: (key) => redisClient.del(key),
     *   },
     * })
     * ```
     */
    storage?: ToolCacheStorage;
}
/**
 * Creates a middleware that caches tool call results based on tool name + arguments.
 *
 * When a tool is called with the same name and arguments as a previous call,
 * the cached result is returned immediately without executing the tool.
 *
 * @example
 * ```ts
 * import { chat, toolCacheMiddleware } from '@tanstack/ai'
 *
 * const stream = chat({
 *   adapter,
 *   messages,
 *   tools: [weatherTool, stockTool],
 *   middleware: [
 *     toolCacheMiddleware({ ttl: 60_000, toolNames: ['getWeather'] }),
 *   ],
 * })
 * ```
 */
export declare function toolCacheMiddleware(options?: ToolCacheMiddlewareOptions): ChatMiddleware;
