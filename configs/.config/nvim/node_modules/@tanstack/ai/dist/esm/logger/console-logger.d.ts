import { Logger } from './types.js';
/**
 * Default `Logger` implementation that routes each level to the matching
 * `console` method:
 *
 * - `debug` → `console.debug`
 * - `info` → `console.info`
 * - `warn` → `console.warn`
 * - `error` → `console.error`
 *
 * When a `meta` object is supplied it is rendered with the strategy that
 * actually surfaces it on the current runtime (see {@link MetaStrategy}):
 * depth-unlimited `console.dir` on Node, circular-safe JSON on Cloudflare
 * Workers, and an extra console argument everywhere else.
 *
 * This is the logger used when `debug` is enabled on any activity and no
 * custom `logger` is supplied via `debug: { logger }`.
 */
export declare class ConsoleLogger implements Logger {
    /** Log a debug-level message; forwards to `console.debug`. */
    debug(message: string, meta?: Record<string, unknown>): void;
    /** Log an info-level message; forwards to `console.info`. */
    info(message: string, meta?: Record<string, unknown>): void;
    /** Log a warning-level message; forwards to `console.warn`. */
    warn(message: string, meta?: Record<string, unknown>): void;
    /** Log an error-level message; forwards to `console.error`. */
    error(message: string, meta?: Record<string, unknown>): void;
    private emit;
}
