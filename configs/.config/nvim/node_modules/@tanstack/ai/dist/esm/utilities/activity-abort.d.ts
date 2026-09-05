/**
 * Shared abort/timeout composition for media (and summarize) activities.
 *
 * Callers pass optional `timeout` and/or `abortSignal` on activity options.
 * Core composes them into one effective signal, races the adapter call so a
 * hung provider still rejects, clears timeout resources on settle, and
 * classifies aborts so lifecycle middleware gets `onAbort` rather than
 * `onError`.
 */
/**
 * Combine two optional AbortSignals into one that aborts when either does.
 * Returns the other signal directly when one is absent or already aborted.
 * First abort wins and preserves its reason.
 *
 * Manual implementation — `AbortSignal.any` requires Node >= 20.3.
 */
export declare function combineAbortSignals(a: AbortSignal | undefined, b: AbortSignal | undefined): AbortSignal | undefined;
/** Normalize an abort reason into an Error the activity can reject with. */
export declare function toAbortError(reason: unknown): Error;
export interface ActivityAbortControls {
    /** Effective signal, or `undefined` when neither timeout nor caller signal. */
    signal: AbortSignal | undefined;
    /** Clear the timeout timer if one was set. Idempotent. */
    clear: () => void;
}
/**
 * Compose an activity-level timeout with a caller AbortSignal.
 *
 * - No SDK-wide default timeout; omit both for unlimited wait.
 * - First of caller cancellation or timeout wins and keeps its reason.
 * - Call `clear()` when the activity settles (success or failure) so timers
 *   do not leak.
 */
export declare function createActivityAbortControls(options: {
    abortSignal?: AbortSignal;
    timeout?: number;
}): ActivityAbortControls;
/**
 * Reject when `signal` aborts, even if the underlying promise ignores it.
 * Ensures activity-level timeouts work for adapters that do not yet forward
 * the signal to the provider SDK.
 *
 * When the signal wins, the adapter promise is observed with an empty handler
 * so a later settle cannot surface as an unhandled rejection.
 */
export declare function raceWithAbort<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T>;
/**
 * Whether a thrown value (and optional effective signal) should route to
 * middleware `onAbort` instead of `onError`.
 */
export declare function isActivityAbortError(error: unknown, signal?: AbortSignal): boolean;
/** Best-effort string reason for {@link GenerationAbortInfo}. */
export declare function abortReasonMessage(error: unknown, signal?: AbortSignal): string | undefined;
