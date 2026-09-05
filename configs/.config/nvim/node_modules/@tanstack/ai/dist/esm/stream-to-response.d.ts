import { LockStore } from './activities/chat/middleware/locks.js';
import { RunStore } from './activities/chat/middleware/run-store.js';
import { InternalLogger } from './logger/internal-logger.js';
import { DebugOption } from './logger/types.js';
import { StreamDurability } from './stream-durability.js';
import { StreamChunk } from './types.js';
export { resolveResumeRunId } from './stream-durability.js';
/**
 * Collect all text content from a StreamChunk async iterable and return as a string.
 *
 * This function consumes the entire stream, accumulating content from TEXT_MESSAGE_CONTENT events,
 * and returns the final concatenated text.
 *
 * @param stream - AsyncIterable of StreamChunks from chat()
 * @returns Promise<string> - The accumulated text content
 *
 * @example
 * ```typescript
 * const stream = chat({
 *   adapter: openaiText('gpt-5.5'),
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * const text = await streamToText(stream);
 * console.log(text); // "Hello! How can I help you today?"
 * ```
 */
export declare function streamToText(stream: AsyncIterable<StreamChunk>): Promise<string>;
export declare function runErrorChunk(error: unknown): Extract<StreamChunk, {
    type: 'RUN_ERROR';
}>;
/**
 * Convert a StreamChunk async iterable to a ReadableStream in Server-Sent Events format
 *
 * This creates a ReadableStream that emits chunks in SSE format:
 * - Each chunk is prefixed with "data: "
 * - Each chunk is followed by "\n\n"
 * - Stream ends when the underlying iterable is exhausted (RUN_FINISHED is the terminal event)
 *
 * @param stream - AsyncIterable of StreamChunks from chat()
 * @param abortController - Optional AbortController to abort when stream is cancelled
 * @param getId - Optional per-chunk durability offset; when present, each event gets an `id:` line
 * @returns ReadableStream in Server-Sent Events format
 */
export declare function toServerSentEventsStream(stream: AsyncIterable<StreamChunk>, abortController?: AbortController, getId?: (chunk: StreamChunk, index: number) => string | undefined): ReadableStream<Uint8Array>;
/**
 * Name of the synthetic `CUSTOM` chunk a fresh durable producer appends to its
 * log before pulling the first real chunk.
 *
 * Flushing `RUN_STARTED` (above) makes a run joinable from the instant the
 * stream EMITS something — but a `chat()` whose middleware boots a sandbox
 * (create a container, install a CLI) legitimately emits nothing for minutes,
 * and during that window the log is empty. Every joiner's empty-log fail-fast
 * (`memoryStream`'s first-chunk deadline, the client's rejoin connect deadline)
 * then reads the run as gone — and the client clears its resume pointer, so a
 * reload during the boot window permanently orphans a run that is still going.
 *
 * This marker closes the window: it is appended (and flushed) before the
 * producer stream is first pulled, so a join always finds a first chunk within
 * milliseconds of the run being accepted. Takeover alignment is unaffected — a
 * journal replay cannot reproduce the marker, and alignment already skips
 * stored `CUSTOM` chunks as out-of-band for exactly that reason (see
 * `isBridgeCustomChunk` in `@tanstack/ai-sandbox`).
 */
export declare const RUN_ACCEPTED_EVENT = "run.accepted";
/**
 * Build the delivery-durable source iterable for a transport helper.
 *
 * - **Resume** (`resumeFrom()` non-null): replay strictly after the offset,
 *   reading only from the durability log. The input `stream` is NEVER iterated,
 *   so `chat()`'s lazy iterator never fires the provider — the untouched
 *   generator is simply GC'd. This is what makes resume free of re-invocation.
 * - **Fresh** (`resumeFrom()` null): iterate `stream`, buffering up to `batch`
 *   chunks (flushing early at terminal / tool-call boundaries), `append` each
 *   batch to the log, then forward. Appending BEFORE forwarding guarantees a
 *   reconnecting client can always replay exactly what it already saw.
 *
 * The returned `getId` maps each forwarded chunk to the exact opaque offset
 * returned by the durability adapter for the SSE `id:` line.
 */
export declare function durableStreamSource<TOffset extends string>(stream: AsyncIterable<StreamChunk>, durability: StreamDurability<TOffset>, options: {
    abortController: AbortController;
    batch?: number;
    logger?: InternalLogger;
}): {
    source: AsyncIterable<StreamChunk>;
    getId: (chunk: StreamChunk) => string | undefined;
};
/**
 * Convert a StreamChunk async iterable to a Response in Server-Sent Events format
 *
 * This creates a Response that emits chunks in SSE format:
 * - Each chunk is prefixed with "data: "
 * - Each chunk is followed by "\n\n"
 * - Stream ends when the underlying iterable is exhausted (RUN_FINISHED is the terminal event)
 *
 * Pass a `durability` sink (`memoryStream(request)` / `durableStream(request)`)
 * to make the stream resumable: fresh runs are appended to the log and each SSE
 * event is tagged with an `id:` offset; a reconnect (native `Last-Event-ID`) or
 * a `?offset` join replays from the log without re-running the producer. `batch`
 * controls how many chunks are buffered per `append` (default 32).
 *
 * @param stream - AsyncIterable of StreamChunks from chat()
 * @param init - Optional Response initialization options (including `abortController`, `durability` with its optional `batch`, and `debug`)
 * @returns Response in Server-Sent Events format
 *
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const stream = chat({ adapter: openaiText('gpt-5.5'), messages: [...] });
 *   return toServerSentEventsResponse(stream, { durability: { adapter: memoryStream(request) } });
 * }
 * ```
 */
export declare function toServerSentEventsResponse<TOffset extends string = string>(stream: AsyncIterable<StreamChunk>, init?: ResponseInit & {
    abortController?: AbortController;
    durability?: {
        adapter: StreamDurability<TOffset>;
        batch?: number;
    };
    /**
     * Customize logging for durability failure paths (terminal-append and
     * close). These failures are always logged server-side by default (the
     * `errors` category is on even without `debug`, via a `ConsoleLogger`);
     * pass `debug` to route them to a custom `Logger` or raise verbosity. A
     * joiner replaying the log only ever sees a generic incomplete error, so
     * server-side logging is where the real cause is recoverable.
     */
    debug?: DebugOption;
}): Response;
/**
 * Everything the resume helpers need to take a run over as a side effect of
 * serving its log.
 *
 * `claim` and `pipe` are **injected**, not imported. The two mechanisms a
 * takeover needs (`withRunClaim` and `pipeToRunLog`) live in
 * `@tanstack/ai-sandbox`, and `@tanstack/ai` must not depend on that package —
 * that layering inversion is exactly what moving `LockStore` into core was meant
 * to prevent, and it would make core depend on the sandbox package to serve a
 * plain chat run. Injecting them keeps only the *shape* of a takeover in core
 * (parse the run id, read the record, skip if terminal, claim, drive) and lets a
 * background-worker-driven run supply its own pair.
 * `@tanstack/ai-sandbox`'s `sandboxRunDriver` fills both in.
 */
export interface RunDriverOptions {
    /** The attach request; its run id is read with {@link resolveResumeRunId}. */
    request: Request;
    runs: RunStore;
    locks: LockStore;
    /** Produce the run's remaining events. Called only once the claim is held. */
    drive: (input: {
        runId: string;
        threadId: string;
        signal: AbortSignal;
    }) => AsyncIterable<StreamChunk>;
    /** Run `fn` under exclusive ownership of the run, or reject if refused. */
    claim: <T>(input: {
        runs: RunStore;
        locks: LockStore;
        runId: string;
    }, fn: (claim: {
        runId: string;
        epoch: number;
        signal: AbortSignal;
    }) => Promise<T>) => Promise<T>;
    /** Persist the driven stream to the run's producer-side durability log. */
    pipe: (stream: AsyncIterable<StreamChunk>, input: {
        runId: string;
        threadId: string;
        signal: AbortSignal;
    }) => Promise<unknown>;
    /** Platform keep-alive (e.g. `ctx.waitUntil`) for the background drive. */
    waitUntil?: (promise: Promise<unknown>) => void;
    logger?: InternalLogger;
}
/** Shared options for the resume-only response helpers. */
type ResumeResponseOptions<TOffset extends string> = ResponseInit & {
    adapter: StreamDurability<TOffset>;
    batch?: number;
    debug?: DebugOption;
    /**
     * Take the run over while serving its log. Omit to serve the log only —
     * the response is byte-identical either way.
     */
    driver?: RunDriverOptions;
};
/**
 * Serve a resumable run from its durability log over Server-Sent Events, without
 * re-running the model. Use this in a `GET` handler so a reload or a second tab
 * can re-attach to an in-flight or finished run.
 *
 * The adapter (`memoryStream(request)` / `durableStream(request)`) captures the
 * resume offset from the request. If there is none (no `Last-Event-ID` header
 * and no `?offset`), there is nothing to replay and this returns a 400.
 *
 * @example
 * ```typescript
 * export async function GET(request: Request) {
 *   return resumeServerSentEventsResponse({ adapter: memoryStream(request) });
 * }
 * ```
 */
export declare function resumeServerSentEventsResponse<TOffset extends string = string>(options: ResumeResponseOptions<TOffset>): Response;
/**
 * Convert a StreamChunk async iterable to a ReadableStream in HTTP stream format (newline-delimited JSON)
 *
 * This creates a ReadableStream that emits chunks as newline-delimited JSON:
 * - Each chunk is JSON.stringify'd and followed by "\n"
 * - No SSE formatting (no "data: " prefix)
 *
 * This format is compatible with `fetchHttpStream` connection adapter.
 *
 * When `getId` is supplied (delivery durability), each chunk is emitted as an
 * envelope `{"id":"<offset>","chunk":{…}}` instead of a bare chunk. NDJSON has
 * no native event-id field like SSE's `id:` line, so the resumable offset rides
 * inside the payload. Untagged chunks (no id) stay bare, so a non-durable
 * stream is byte-identical to before and the client auto-detects either form.
 *
 * @param stream - AsyncIterable of StreamChunks from chat()
 * @param abortController - Optional AbortController to abort when stream is cancelled
 * @param getId - Optional per-chunk durability offset; when present, chunks are envelope-encoded
 * @returns ReadableStream in HTTP stream format (newline-delimited JSON)
 *
 * @example
 * ```typescript
 * const stream = chat({ adapter: openaiText('gpt-5.5'), messages: [...] });
 * const readableStream = toHttpStream(stream);
 * // Use with Response for HTTP streaming (not SSE)
 * return new Response(readableStream, {
 *   headers: { 'Content-Type': 'application/x-ndjson' }
 * });
 * ```
 */
export declare function toHttpStream(stream: AsyncIterable<StreamChunk>, abortController?: AbortController, getId?: (chunk: StreamChunk, index: number) => string | undefined): ReadableStream<Uint8Array>;
/**
 * Convert a StreamChunk async iterable to a Response in HTTP stream format (newline-delimited JSON)
 *
 * This creates a Response that emits chunks in HTTP stream format:
 * - Each chunk is JSON.stringify'd and followed by "\n"
 * - No SSE formatting (no "data: " prefix)
 *
 * This format is compatible with `fetchHttpStream` connection adapter.
 *
 * Pass a `durability` sink (`memoryStream(request)` / `durableStream(request)`)
 * to make the stream resumable: fresh runs are appended to the log and each
 * NDJSON line is emitted as an `{ id, chunk }` envelope carrying an opaque
 * offset; a reconnect (native `Last-Event-ID` header) or a `?offset` join
 * replays from the log without re-running the producer. `batch` controls how
 * many chunks are buffered per `append` (default 32). This shares the exact
 * `durableStreamSource` used by `toServerSentEventsResponse` — only the wire
 * encoding differs.
 *
 * @param stream - AsyncIterable of StreamChunks from chat()
 * @param init - Optional Response initialization options (including `abortController`, `durability` with its optional `batch`, and `debug`)
 * @returns Response in HTTP stream format (newline-delimited JSON)
 *
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const stream = chat({ adapter: openaiText('gpt-5.5'), messages: [...] });
 *   return toHttpResponse(stream, { durability: { adapter: memoryStream(request) } });
 * }
 * ```
 */
export declare function toHttpResponse<TOffset extends string = string>(stream: AsyncIterable<StreamChunk>, init?: ResponseInit & {
    abortController?: AbortController;
    durability?: {
        adapter: StreamDurability<TOffset>;
        batch?: number;
    };
    /**
     * Customize logging for durability failure paths (terminal-append and
     * close). These failures are always logged server-side by default (the
     * `errors` category is on even without `debug`, via a `ConsoleLogger`);
     * pass `debug` to route them to a custom `Logger` or raise verbosity. A
     * joiner replaying the log only ever sees a generic incomplete error, so
     * server-side logging is where the real cause is recoverable.
     */
    debug?: DebugOption;
}): Response;
/**
 * Serve a resumable run from its durability log over NDJSON, without re-running
 * the model. The NDJSON counterpart of {@link resumeServerSentEventsResponse};
 * pair it with a `toHttpResponse` producer. Returns a 400 when the request
 * carries no resume offset (no `Last-Event-ID` header and no `?offset`).
 *
 * @example
 * ```typescript
 * export async function GET(request: Request) {
 *   return resumeHttpResponse({ adapter: memoryStream(request) });
 * }
 * ```
 */
export declare function resumeHttpResponse<TOffset extends string = string>(options: ResumeResponseOptions<TOffset>): Response;
