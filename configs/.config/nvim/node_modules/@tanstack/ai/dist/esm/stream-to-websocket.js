import { toWireChunk } from "./strip-to-spec-middleware.js";
import { resolveDebugOption } from "./logger/resolve.js";
import { durableStreamSource, runErrorChunk } from "./stream-to-response.js";
import { chatParamsFromRequestBody } from "./utilities/chat-params.js";
//#region src/stream-to-websocket.ts
/**
* Encode one server→client frame. Durable frames carry the opaque offset in an
* `{ id, chunk }` envelope (identical to the NDJSON wire); non-durable frames
* are the bare chunk. Unambiguous because a bare chunk always has a top-level
* `type` and the envelope never does.
*/
function encodeWsFrame(chunk, id) {
	const wire = toWireChunk(chunk);
	return JSON.stringify(id === void 0 ? wire : {
		id,
		chunk: wire
	});
}
/**
* Decode one client→server frame. An `{ type: 'abort', runId }` object is a
* control frame; anything else is treated as a `RunAgentInput` and validated
* downstream by `chatParamsFromRequestBody`.
*/
function decodeWsFrame(data) {
	const parsed = JSON.parse(data);
	if (typeof parsed === "object" && parsed !== null && parsed.type === "abort" && typeof parsed.runId === "string") return {
		kind: "abort",
		runId: parsed.runId
	};
	return {
		kind: "run",
		input: parsed
	};
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
function buildTurnRequest(handshake, runId) {
	const url = new URL(handshake.url);
	url.searchParams.set("runId", runId);
	url.searchParams.delete("offset");
	return new Request(url, { headers: handshake.headers });
}
/**
* Run a full-duplex, conversation-scoped chat over an already-accepted server
* socket. Each inbound RunAgentInput frame starts one chat() turn (via onRun)
* whose chunks are pumped back as frames; the socket stays open across turns
* (pending client-tool resubmit, next user message) until the client closes it
* or the idle timeout fires. An abort control frame aborts only its turn.
*/
function toWebSocketStream(socket, request, init) {
	const logger = resolveDebugOption(init.debug);
	const activeTurns = /* @__PURE__ */ new Map();
	const earlyAborts = /* @__PURE__ */ new Set();
	const heartbeatMs = init.heartbeatMs ?? 3e4;
	const idleTimeoutMs = init.idleTimeoutMs ?? 3e5;
	let lastActivity = Date.now();
	let closed = false;
	const heartbeat = setInterval(() => {
		try {
			socket.send(JSON.stringify({ type: "ping" }));
		} catch {}
	}, heartbeatMs);
	const idle = setInterval(() => {
		if (activeTurns.size === 0 && Date.now() - lastActivity > idleTimeoutMs) socket.close(1e3, "idle");
	}, Math.min(idleTimeoutMs, 3e4));
	function teardown() {
		closed = true;
		for (const controller of activeTurns.values()) controller.abort();
		activeTurns.clear();
		clearInterval(heartbeat);
		clearInterval(idle);
	}
	socket.addEventListener("close", teardown);
	socket.addEventListener("error", () => {
		logger.errors("WebSocket errored; aborting its turns");
		teardown();
		try {
			socket.close(1011, "socket error");
		} catch {}
	});
	socket.addEventListener("message", (event) => {
		if (typeof event.data !== "string") return;
		lastActivity = Date.now();
		let frame;
		try {
			frame = decodeWsFrame(event.data);
		} catch (error) {
			logger.errors("Failed to decode inbound WS frame; dropping it", { error });
			return;
		}
		if (frame.kind === "abort") {
			const turn = activeTurns.get(frame.runId);
			if (turn) turn.abort();
			else earlyAborts.add(frame.runId);
			return;
		}
		handleInbound(frame.input);
	});
	/**
	* Surface a turn failure to the client as a live `RUN_ERROR` frame. The
	* socket is conversation-scoped and stays open, so without this frame the
	* client would see neither a terminal chunk nor a close — a permanent hang.
	* Mirrors the HTTP transports, which synthesize the live `RUN_ERROR` when
	* the producer rethrows (see `durableStreamSource`'s terminal contract).
	*/
	function sendRunError(error) {
		try {
			socket.send(encodeWsFrame(runErrorChunk(error), void 0));
		} catch {}
	}
	async function handleInbound(input) {
		let params;
		try {
			params = await chatParamsFromRequestBody(input);
		} catch (error) {
			logger.errors("Invalid inbound WS run frame; dropping it", { error });
			sendRunError(error);
			return;
		}
		if (closed) return;
		const turnAbort = new AbortController();
		activeTurns.get(params.runId)?.abort();
		activeTurns.set(params.runId, turnAbort);
		if (earlyAborts.delete(params.runId)) turnAbort.abort();
		const ctx = {
			messages: params.messages,
			threadId: params.threadId,
			runId: params.runId,
			forwardedProps: params.forwardedProps,
			request: buildTurnRequest(request, params.runId),
			signal: turnAbort.signal
		};
		try {
			if (init.durability) {
				const adapter = init.durability(ctx);
				const { source, getId } = durableStreamSource(init.onRun(ctx), adapter, {
					abortController: turnAbort,
					...init.batch === void 0 ? {} : { batch: init.batch },
					logger
				});
				for await (const chunk of source) socket.send(encodeWsFrame(chunk, getId(chunk)));
			} else for await (const chunk of init.onRun(ctx)) socket.send(encodeWsFrame(chunk, void 0));
		} catch (error) {
			if (!turnAbort.signal.aborted) {
				logger.errors("WS turn failed", { error });
				sendRunError(error);
			}
		} finally {
			if (activeTurns.get(params.runId) === turnAbort) activeTurns.delete(params.runId);
		}
	}
}
/**
* A resume is served entirely from the durability log, so there is no
* producer to iterate. This empty source satisfies `durableStreamSource`'s
* signature; on a resume it replays from the log and never touches this.
* Mirrors the private helper of the same name in `stream-to-response.ts`.
*/
function emptyDurableSource() {
	return (async function* () {})();
}
/**
* Read-only replay of a run's durability log over a socket (mirrors
* `resumeServerSentEventsResponse`). The adapter captures the offset from the
* request (`?offset`/`Last-Event-ID`); no model runs. Closes 1008 when there
* is nothing to resume.
*/
function resumeWebSocketStream(socket, options) {
	const logger = resolveDebugOption(options.debug);
	if (options.adapter.resumeFrom() === null) {
		socket.close(1008, "no resume offset");
		return;
	}
	const abortController = new AbortController();
	socket.addEventListener("close", () => abortController.abort());
	socket.addEventListener("error", () => abortController.abort());
	const { source, getId } = durableStreamSource(emptyDurableSource(), options.adapter, {
		abortController,
		...options.batch === void 0 ? {} : { batch: options.batch },
		logger
	});
	(async () => {
		for await (const chunk of source) socket.send(encodeWsFrame(chunk, getId(chunk)));
		try {
			socket.close(1e3);
		} catch {}
	})().catch((error) => {
		logger.errors("resume websocket replay failed", { error });
		try {
			socket.close(1011, "resume failed");
		} catch {}
	});
}
function upgradeOrThrow(helper) {
	const Pair = globalThis.WebSocketPair;
	if (!Pair) throw new Error(`${helper} requires a runtime with WebSocketPair (Cloudflare Workers/Durable Objects). On other runtimes upgrade the socket yourself and call ${helper.replace("Response", "Stream")}.`);
	const pair = new Pair();
	const server = pair[1];
	server.accept?.();
	return {
		client: pair[0],
		server
	};
}
function upgradeResponse(client) {
	return new Response(null, {
		status: 101,
		webSocket: client
	});
}
/**
* Cloudflare wrapper (Workers/Durable Objects): creates a `WebSocketPair`,
* accepts the server socket, delegates to {@link toWebSocketStream}, and
* returns the 101 upgrade `Response` carrying the client socket. Throws when
* the runtime has no `WebSocketPair` (Node, Deno, Bun) — upgrade the socket
* yourself and call {@link toWebSocketStream} directly there.
*/
function toWebSocketResponse(request, init) {
	const { client, server } = upgradeOrThrow("toWebSocketResponse");
	toWebSocketStream(server, request, init);
	return upgradeResponse(client);
}
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
function resumeWebSocketResponse(options) {
	const { client, server } = upgradeOrThrow("resumeWebSocketResponse");
	resumeWebSocketStream(server, options);
	return upgradeResponse(client);
}
//#endregion
export { buildTurnRequest, decodeWsFrame, encodeWsFrame, resumeWebSocketResponse, resumeWebSocketStream, toWebSocketResponse, toWebSocketStream };

//# sourceMappingURL=stream-to-websocket.js.map