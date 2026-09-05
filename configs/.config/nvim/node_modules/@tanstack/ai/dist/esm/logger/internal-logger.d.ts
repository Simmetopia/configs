import { DebugCategories, Logger } from './types.js';
/**
 * Fully-resolved categories map. Every flag is a definite boolean (never
 * undefined), produced by `resolveDebugOption` from a `DebugOption`.
 */
export type ResolvedCategories = Required<DebugCategories>;
export declare class InternalLogger {
    private readonly logger;
    private readonly categories;
    constructor(logger: Logger, categories: ResolvedCategories);
    /** Whether a category is enabled. Cheap, safe to call on hot paths. */
    isEnabled(category: keyof ResolvedCategories): boolean;
    private emit;
    /** Log a raw chunk/frame received from a provider SDK. */
    provider(message: string, meta?: Record<string, unknown>): void;
    /** Log a chunk/result yielded to the consumer after middleware. */
    output(message: string, meta?: Record<string, unknown>): void;
    /** Log inputs/outputs around a middleware hook invocation. Chat-only. */
    middleware(message: string, meta?: Record<string, unknown>): void;
    /** Log before/after a tool-call execution. Chat-only. */
    tools(message: string, meta?: Record<string, unknown>): void;
    /** Log sandbox internals (watcher, file events, hook dispatch). Chat-only. */
    sandbox(message: string, meta?: Record<string, unknown>): void;
    /** Log an agent-loop iteration marker or phase transition. Chat-only. */
    agentLoop(message: string, meta?: Record<string, unknown>): void;
    /** Log a config transform returned by a middleware `onConfig` hook. Chat-only. */
    config(message: string, meta?: Record<string, unknown>): void;
    /**
     * Log a caught error. Defaults to on even when `debug` is unspecified.
     * Uses the underlying logger's `error` level.
     */
    errors(message: string, meta?: Record<string, unknown>): void;
    /** Log outgoing request metadata before an adapter SDK call. */
    request(message: string, meta?: Record<string, unknown>): void;
    /**
     * Log a non-fatal misconfiguration or recoverable anomaly. Gated by the
     * `errors` category — on by default (and when `debug` is unspecified), so
     * silent-drop conditions surface, but still silenced by `debug: false`,
     * which honors the "disable everything including errors" contract. Routes to
     * the underlying logger's `warn` level.
     */
    warn(message: string, meta?: Record<string, unknown>): void;
}
