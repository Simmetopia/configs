import { StreamDurability } from './stream-durability.js';
import { DebugOption } from './logger/types.js';
import { ModelMessage, StreamChunk, UIMessage } from './types.js';
/**
 * The minimal WHATWG WebSocket surface the core needs. Cloudflare
 * `WebSocketPair` server sockets, Deno's upgraded sockets, and `ws` (Node)
 * sockets already satisfy it; Bun's `ServerWebSocket` (handler-object API)
 * gets a ~10-line adapter at the call site.
 */
export interface WebSocketLike {
    send: (data: string) => void;
    close: (code?: number, reason?: string) => void;
    addEventListener: {
        (type: 'message', handler: (ev: {
            data: unknown;
        }) => void): void;
        (type: 'close' | 'error', handler: () => void): void;
    };
}
/** One inbound WS text frame, after JSON parse + shape discrimination. */
export type InboundFrame = {
    kind: 'run';
    input: unknown;
} | {
    kind: 'abort';
    runId: string;
};
/**
 * Encode one server→client frame. Durable frames carry the opaque offset in an
 * `{ id, chunk }` envelope (identical to the NDJSON wire); non-durable frames
 * are the bare chunk. Unambiguous because a bare chunk always has a top-level
 * `type` and the envelope never does.
 */
export declare function encodeWsFrame(chunk: StreamChunk, id: string | undefined): string;
/**
 * Decode one client→server frame. An `{ type: 'abort', runId }` object is a
 * control frame; anything else is treated as a `RunAgentInput` and validated
 * downstream by `chatParamsFromRequestBody`.
 */
export declare function decodeWsFrame(data: string): InboundFrame;
/** Per-turn context for one inbound `run` frame on a conversation-scoped socket. */
export interface WsRunContext {
    messages: Array<UIMessage | ModelMessage>;
    threadId: string;
    runId: string;
    forwardedProps?: Record<string, unknown>;
    /** Synthetic per-turn request carrying `?runId=` so durability keys correctly. */
    request: Request;
    /** Aborts on socket close or an `abort` control frame for this run. */
    signal: AbortSignal;
}
/**
 * Build the synthetic per-turn request. A conversation-scoped socket multiplexes
 * many runs; each turn's durability adapter must key on the frame's `runId`,
 * which we carry in the URL query (`memoryStream`/`durableStream` already read
 * `?runId` / `?offset` there). Headers are copied from the handshake so
 * auth/cookies survive. A handshake carrying `?offset` is a resume and never
 * reaches a fresh turn (`resumeWebSocketStream` serves it), so the offset is
 * scrubbed here — otherwise a mis-routed resume handshake would make the turn's
 * durability adapter silently take the replay branch instead of running onRun.
 */
export declare function buildTurnRequest(handshake: Request, runId: string): Request;
export interface WebSocketStreamInit<TOffset extends string = string> {
    /** Build a fresh chat() stream for each inbound RunAgentInput frame. */
    onRun: (ctx: WsRunContext) => AsyncIterable<StreamChunk>;
    /** Per-TURN durability factory, keyed by the frame's runId via ctx.request. */
    durability?: (ctx: WsRunContext) => StreamDurability<TOffset>;
    /** Chunks buffered per durability append (default 32). */
    batch?: number;
    /** Heartbeat ping interval in ms (default 30_000). */
    heartbeatMs?: number;
    /**
     * Close after this many ms without any inbound frame (default 300_000).
     * Never fires while a turn is still streaming, so a long single generation
     * (agentic loop, >5-min turn) is safe.
     */
    idleTimeoutMs?: number;
    debug?: DebugOption;
}
/**
 * Run a full-duplex, conversation-scoped chat over an already-accepted server
 * socket. Each inbound RunAgentInput frame starts one chat() turn (via onRun)
 * whose chunks are pumped back as frames; the socket stays open across turns
 * (pending client-tool resubmit, next user message) until the client closes it
 * or the idle timeout fires. An abort control frame aborts only its turn.
 */
export declare function toWebSocketStream<TOffset extends string = string>(socket: WebSocketLike, request: Request, init: WebSocketStreamInit<TOffset>): void;
/**
 * Read-only replay of a run's durability log over a socket (mirrors
 * `resumeServerSentEventsResponse`). The adapter captures the offset from the
 * request (`?offset`/`Last-Event-ID`); no model runs. Closes 1008 when there
 * is nothing to resume.
 */
export declare function resumeWebSocketStream<TOffset extends string = string>(socket: WebSocketLike, options: {
    adapter: StreamDurability<TOffset>;
    batch?: number;
    debug?: DebugOption;
}): void;
/**
 * Cloudflare wrapper (Workers/Durable Objects): creates a `WebSocketPair`,
 * accepts the server socket, delegates to {@link toWebSocketStream}, and
 * returns the 101 upgrade `Response` carrying the client socket. Throws when
 * the runtime has no `WebSocketPair` (Node, Deno, Bun) — upgrade the socket
 * yourself and call {@link toWebSocketStream} directly there.
 */
export declare function toWebSocketResponse<TOffset extends string = string>(request: Request, init: WebSocketStreamInit<TOffset>): Response;
/**
 * Cloudflare wrapper (Workers/Durable Objects): creates a `WebSocketPair`,
 * accepts the server socket, delegates to {@link resumeWebSocketStream}, and
 * returns the 101 upgrade `Response` carrying the client socket. Throws when
 * the runtime has no `WebSocketPair` (Node, Deno, Bun) — upgrade the socket
 * yourself and call {@link resumeWebSocketStream} directly there.
 *
 * @example
 * ```ts
 * resumeWebSocketResponse({ adapter: memoryStream(request) })
 * ```
 */
export declare function resumeWebSocketResponse<TOffset extends string = string>(options: {
    adapter: StreamDurability<TOffset>;
    batch?: number;
    debug?: DebugOption;
}): Response;
