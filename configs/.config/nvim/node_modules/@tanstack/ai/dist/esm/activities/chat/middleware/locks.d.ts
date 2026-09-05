import { ChatMiddleware } from './types.js';
/**
 * Mutual exclusion around a critical section keyed by `key`. A distributed
 * backend (e.g. a Cloudflare Durable Object) is the only kind safe across
 * instances; the in-memory default is correct within a single process only.
 * Lease-backed implementations abort `signal` as soon as ownership can no longer
 * be guaranteed; the callback must stop externally visible mutations when it
 * aborts. Callbacks that ignore `signal` (e.g. the sandbox `ensure` critical
 * section) remain valid — a `() => Promise<T>` is assignable to the
 * signal-taking parameter.
 */
export interface LockStore {
    withLock: <T>(key: string, fn: (signal: AbortSignal) => Promise<T>) => Promise<T>;
}
/**
 * Type a {@link LockStore} implementation inline: pass the object and get
 * autocomplete + contract checking, with no separate `: LockStore` annotation.
 * Hand the result to {@link withLocks}.
 */
export declare function defineLock(lock: LockStore): LockStore;
/**
 * The lock capability. Provided by {@link withLocks} or any middleware that
 * calls {@link provideLocks}.
 */
export declare const LocksCapability: import('./capabilities.js').Capability<LockStore, "locks">;
/** Destructured accessors: `getLocks(ctx)` / `provideLocks(ctx, store)`. */
export declare const getLocks: import('./capabilities.js').CapabilityGetter<LockStore>, provideLocks: import('./capabilities.js').CapabilityProvider<LockStore>;
/**
 * In-memory {@link LockStore} — a per-key promise chain. Correct within a single
 * process; multi-instance correctness needs a distributed lock backend.
 */
export declare class InMemoryLockStore implements LockStore {
    private readonly chains;
    withLock<T>(key: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T>;
}
/**
 * Provide a {@link LockStore} on the chat middleware capability bus.
 *
 * Coordination only — independent of chat state persistence. A lock provided
 * here reaches any later middleware that reads {@link LocksCapability}
 * (including `withSandbox`).
 *
 * ```ts
 * middleware: [
 *   withLocks(distributedLocks),
 *   withSandbox(sandbox),
 * ]
 * ```
 */
export declare function withLocks(locks: LockStore): ChatMiddleware;
