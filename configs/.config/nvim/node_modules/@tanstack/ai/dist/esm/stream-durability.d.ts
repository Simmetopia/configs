import { StreamChunk } from './types.js';
/**
 * A pluggable delivery-durability backend.
 *
 * Offsets are owned by the adapter and opaque to the transport. The generic
 * parameter lets an adapter retain a branded string type across append, read,
 * and resume without requiring core to understand its cursor format.
 */
export interface StreamDurability<TOffset extends string = string> {
    /** Return the adapter offset captured from the request, or null for a producer. */
    resumeFrom: () => TOffset | null;
    /**
     * Persist a batch before it is delivered and return exactly one resumable
     * offset for each chunk, in the same order.
     */
    append: (chunks: Array<StreamChunk>) => Promise<Array<TOffset>>;
    /** Replay chunks strictly after the supplied adapter-owned offset. */
    read: (offset: TOffset, signal?: AbortSignal) => AsyncIterable<{
        offset: TOffset;
        chunk: StreamChunk;
    }>;
    /**
     * Terminalize the producer log and unblock live readers. Core awaits this
     * for every producer exit, including completion, cancellation, and failure.
     */
    close: () => Promise<void>;
    /**
     * Everything stored for this run **at the moment of the call**, in append
     * order, then resolve.
     *
     * This is the bounded counterpart to {@link StreamDurability.read}. `read`
     * tails: it parks until the log is terminalized or the caller aborts, so it
     * cannot be used to inspect a log whose producer died without calling
     * `close` — that log stays open forever and a `for await` over it never
     * finishes. `snapshot` exists for exactly that case: a producer resuming a
     * run needs to see the prefix a previous host already stored so it can line
     * its own output up against it, and it needs that read to *return*.
     *
     * Implementations MUST:
     *
     * - never wait for more entries — resolve with what is stored, including
     *   while the log is still open and still being appended to;
     * - resolve to an empty array for a run with nothing stored, rather than
     *   throwing. In particular an implementation must not reuse the
     *   unknown-run failure path a from-start `read` join takes (`read('-1')` on
     *   an empty log is allowed to fail; `snapshot()` is not). A backend over a
     *   network may of course still reject on a transport, protocol, or
     *   authorization failure — that is a failed call, not an empty run;
     * - return a fresh array the caller can keep or mutate without reaching the
     *   stored log through it.
     *
     * The result is a point-in-time view and carries no lock: a concurrent
     * `append` may land immediately after the snapshot is taken, so a caller
     * must not treat the last returned offset as the permanent tail.
     */
    snapshot: () => Promise<Array<{
        offset: TOffset;
        chunk: StreamChunk;
    }>>;
}
/**
 * A {@link StreamDurability} that can re-persist an already-stored range
 * idempotently.
 *
 * A run driver resuming after a crash re-derives the same offsets from its
 * source position, so replaying an overlapping range must be a no-op rather
 * than producing duplicates. That capability is deliberately a **separate,
 * optional method** instead of an optional parameter on `append`:
 *
 * - Only adapters that actually support it return this type, so a consumer
 *   requiring the capability asks for `UpsertableStreamDurability` and a
 *   mismatch is a compile error rather than a runtime failure buried in a
 *   run log.
 * - Pairing each chunk with its offset structurally makes a length mismatch
 *   and an unpaired chunk unrepresentable. A sparse hole is still
 *   representable, so implementations must reject one explicitly.
 *
 * Implementations MUST validate the entire batch before mutating any stored
 * state (so a rejected call never partially applies), MUST reject an offset
 * they did not mint themselves (every accepted offset is resumable by
 * definition), MUST reject an offset repeated within one batch, and MUST
 * reject a hole in the entries array.
 */
export interface UpsertableStreamDurability<TOffset extends string = string> extends StreamDurability<TOffset> {
    /**
     * Persist a batch at caller-supplied offsets, replacing any entry already
     * stored at the same offset. Returns the offsets in the order supplied.
     */
    upsert: (entries: Array<{
        chunk: StreamChunk;
        offset: TOffset;
    }>) => Promise<Array<TOffset>>;
}
/**
 * The run id a request names: `X-Run-Id` header first, then `?runId`.
 *
 * The single implementation of that precedence, shared by the durability
 * adapters below and by the resume response helpers' run driver
 * (`stream-to-response.ts`), so the helper and the adapter can never disagree
 * about which run a request is talking about.
 */
export declare function resolveResumeRunId(request: Request): string | null;
/** Options for the in-process delivery-durability backend. */
export interface MemoryStreamOptions {
    /**
     * Milliseconds a from-start join waits for the run's first chunk before
     * throwing. Defaults to {@link DEFAULT_FIRST_CHUNK_DEADLINE_MS} (100ms) —
     * raise it if a producer can legitimately start long after a joiner attaches.
     */
    firstChunkDeadlineMs?: number;
}
/**
 * Explicit construction for {@link memoryStream}, for callers that don't have
 * the incoming `Request` — e.g. a TanStack Start server function implementing
 * a `joinRun` replay for a run id it received as call data:
 *
 * ```ts
 * const durability = memoryStream({ runId })
 * for await (const chunk of replayRunStream(durability)) yield chunk
 * ```
 */
export interface MemoryStreamInit {
    /** The run this durability adapter attaches to. */
    runId: string;
    /**
     * Resume offset captured by the consumer (`resumeFrom()` returns it).
     * Defaults to `null` (a producer / from-start reader).
     */
    offset?: string | null;
}
/**
 * The zero-infrastructure delivery-durability backend. Its versioned cursor is
 * deliberately private: callers and core only pass the returned string back.
 *
 * Construct from the incoming `Request` (HTTP transports) or from an explicit
 * {@link MemoryStreamInit} (server functions / direct calls that already know
 * the run id).
 *
 * Logs live in a process-global map, so this backend is for development, tests,
 * and single-process deployments only. Completed runs are evicted after a grace
 * window (see {@link COMPLETED_LOG_TTL_MS}); a resume of an evicted or unknown
 * run fails loudly rather than hanging.
 */
export declare function memoryStream(source: Request | MemoryStreamInit, options?: MemoryStreamOptions): UpsertableStreamDurability;
/**
 * Replay a run's delivery-durability log as a bare stream of chunks, for
 * callers that serve a `joinRun` handler without an HTTP `Response` — e.g. a
 * TanStack Start server function returning an async iterable:
 *
 * ```ts
 * async function* joinImageRun({ data: runId }: { data: string }) {
 *   yield* replayRunStream(memoryStream({ runId }))
 * }
 *
 * // Serve it from a server function whose handler is the generator above
 * // (`createServerFn({ method: 'GET' }).inputValidator(...)`).
 * ```
 *
 * NOTE: the example deliberately declares the generator separately instead of
 * inlining it into the server-fn builder chain. TanStack Start's server-fn
 * Vite plugin decides whether a module needs compiling by regex-matching the
 * SOURCE for a dotted `handler(` call, and JSDoc survives into `dist` — an
 * inlined chain here would make every Start app treat this package as a
 * server-fn module and try to resolve its framework's `@tanstack/*-start`
 * package, failing the build wherever that framework is not the one installed.
 *
 * Reads from `offset` (default `'-1'` — from the start) and tails until the
 * producer closes the log or `signal` aborts, exactly like the HTTP
 * `resumeServerSentEventsResponse` path.
 */
export declare function replayRunStream<TOffset extends string>(durability: StreamDurability<TOffset>, offset?: TOffset, signal?: AbortSignal): AsyncGenerator<StreamChunk>;
