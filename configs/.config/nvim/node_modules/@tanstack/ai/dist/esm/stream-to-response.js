import { toRunErrorPayload } from "./activities/error-payload.js";
import { isCancelRequestedReason } from "./activities/chat/cancel.js";
import { isRunStatus, isTerminalRunStatus } from "./activities/chat/middleware/run-store.js";
import { wasRunDetached } from "./delivery-detach.js";
import { notifyRunDisconnected } from "./delivery-disconnect.js";
import { resolveResumeRunId } from "./stream-durability.js";
import { EventType } from "./types.js";
import { toWireChunk } from "./strip-to-spec-middleware.js";
import { resolveDebugOption } from "./logger/resolve.js";
import { runErrorEventToError } from "./utilities/errors.js";
//#region src/stream-to-response.ts
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
async function streamToText(stream) {
	let accumulatedContent = "";
	for await (const chunk of stream) {
		if (chunk.type === "RUN_ERROR") throw runErrorEventToError(chunk);
		if (chunk.type === "TEXT_MESSAGE_CONTENT" && chunk.delta) accumulatedContent += chunk.delta;
	}
	return accumulatedContent;
}
function errorMessage(error) {
	return toRunErrorPayload(error).message;
}
function combineFailures(primary, secondary, phase) {
	if (primary === secondary) return primary;
	const errors = primary instanceof AggregateError ? [...primary.errors, secondary] : [primary, secondary];
	return new AggregateError(errors, `${errorMessage(primary)}; ${phase}: ${errorMessage(secondary)}`);
}
function runErrorChunk(error) {
	const payload = toRunErrorPayload(error);
	return {
		type: EventType.RUN_ERROR,
		timestamp: Date.now(),
		message: payload.message,
		...payload.code === void 0 ? {} : { code: payload.code },
		error: payload
	};
}
function isAborted(signal) {
	return signal.aborted;
}
/**
* Whether this abort is an EXPLICIT in-process cancel — the caller aborted with
* {@link RUN_CANCEL_REASON} rather than the socket going away.
*
* Core's own guard, independent of any middleware verdict: a user pressing Stop
* must always get a closed, terminal log, so the sink refuses to treat that abort
* as a detach even if the run's middleware published one. A reason-less abort
* carries a `DOMException`, never a string, so a non-string reason is "no
* explicit intent" — exactly how `resolveAbortReason` reads it in `chat()`.
*/
function isExplicitCancel(signal) {
	const reason = signal.reason;
	return typeof reason === "string" && isCancelRequestedReason(reason);
}
function needsTerminalPersistence(terminalPersisted, cancelled, failed) {
	return !terminalPersisted && (cancelled || failed);
}
function toEncodedStream(stream, abortController, encodeChunk, encodeError, detachOnCancel = false, onDetachedCancel) {
	const cancellation = abortController ?? new AbortController();
	let iterator;
	let iteratorCleanup;
	let pumpPromise = Promise.resolve();
	let pumpFailure;
	let cancelled = false;
	const recordPumpFailure = (error, phase) => {
		pumpFailure = { error: pumpFailure === void 0 ? error : combineFailures(pumpFailure.error, error, phase) };
	};
	const closeIterator = () => {
		iteratorCleanup ??= (async () => {
			if (iterator?.return) await iterator.return();
		})();
		return iteratorCleanup;
	};
	return new ReadableStream({
		start(controller) {
			iterator = stream[Symbol.asyncIterator]();
			pumpPromise = (async () => {
				let index = 0;
				let iteratorDone = false;
				try {
					while (!isAborted(cancellation.signal)) {
						const result = await iterator.next();
						if (result.done) {
							iteratorDone = true;
							break;
						}
						if (isAborted(cancellation.signal)) break;
						if (!cancelled) controller.enqueue(encodeChunk(result.value, index));
						index += 1;
					}
				} catch (error) {
					recordPumpFailure(error, "stream iteration failed");
				} finally {
					if (!iteratorDone) try {
						await closeIterator();
					} catch (error) {
						recordPumpFailure(error, "iterator cleanup failed");
					}
					if (!cancelled && !isAborted(cancellation.signal) && pumpFailure !== void 0) controller.enqueue(encodeError(pumpFailure.error));
					if (!cancelled) controller.close();
				}
			})().catch((error) => {
				recordPumpFailure(error, "stream pump failed");
			});
		},
		async cancel(reason) {
			cancelled = true;
			if (detachOnCancel) {
				onDetachedCancel?.();
				return;
			}
			if (!isAborted(cancellation.signal)) cancellation.abort(reason);
			let cancellationFailure;
			try {
				await closeIterator();
			} catch (error) {
				cancellationFailure = { error };
			}
			await pumpPromise;
			if (pumpFailure !== void 0 && cancellationFailure !== void 0) throw combineFailures(pumpFailure.error, cancellationFailure.error, "iterator cancellation failed");
			if (pumpFailure !== void 0) throw pumpFailure.error;
			if (cancellationFailure !== void 0) throw cancellationFailure.error;
		}
	});
}
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
function toServerSentEventsStream(stream, abortController, getId) {
	const { encodeChunk, encodeError } = sseEncoders(getId);
	return toEncodedStream(stream, abortController, encodeChunk, encodeError);
}
/**
* SSE chunk/error encoders. Shared by the public {@link toServerSentEventsStream}
* and the internal durability branch (which additionally needs `toEncodedStream`'s
* private `detachOnCancel`), so the wire format stays identical for both.
*/
function sseEncoders(getId) {
	const encoder = new TextEncoder();
	return {
		encodeChunk: (chunk, index) => {
			const id = getId?.(chunk, index);
			const idLine = id === void 0 ? "" : `id: ${id}\n`;
			const wire = toWireChunk(chunk);
			return encoder.encode(`${idLine}data: ${JSON.stringify(wire)}\n\n`);
		},
		encodeError: (error) => encoder.encode(`data: ${JSON.stringify(toWireChunk(runErrorChunk(error)))}\n\n`)
	};
}
/** Default number of chunks buffered before a durability `append`. */
var DEFAULT_DURABILITY_BATCH = 32;
/**
* Resolve and validate the durability batch size. A non-positive-integer (0,
* negative, fractional, or `NaN`) is rejected rather than clamped: silently
* `Math.max(1, …)`-ing a `NaN` used to disable size-based flushing entirely
* (`length >= NaN` is always false), which is a subtle footgun.
*/
function resolveBatchSize(batch) {
	if (batch === void 0) return DEFAULT_DURABILITY_BATCH;
	if (!Number.isInteger(batch) || batch <= 0) throw new Error(`Invalid durability batch size: ${batch}. Must be a positive integer.`);
	return batch;
}
/**
* Boundaries at which the batching producer flushes early, regardless of the
* batch size — the run-start marker, terminal events, and tool-call ends.
* Flushing here keeps the durability log promptly consistent at semantically
* meaningful points.
*
* `RUN_STARTED` matters especially for one-shot activities (image, speech,
* transcription, summarize): they emit `RUN_STARTED`, then await the provider
* for seconds, then a terminal. Without flushing `RUN_STARTED` the log stays
* empty for the whole run, so a mount-time `joinRun` finds nothing and its
* empty-log deadline fast-fails as "run gone" — even though the run is alive.
* Flushing it immediately makes the run resumable from the instant it starts.
*/
function isDurabilityFlushBoundary(chunk) {
	return chunk.type === "RUN_STARTED" || chunk.type === "RUN_FINISHED" || chunk.type === "RUN_ERROR" || chunk.type === "TOOL_CALL_END";
}
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
var RUN_ACCEPTED_EVENT = "run.accepted";
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
function durableStreamSource(stream, durability, options) {
	const resumeOffset = durability.resumeFrom();
	const batchSize = resolveBatchSize(options.batch);
	const abortController = options.abortController;
	const logger = options.logger;
	const idByChunk = /* @__PURE__ */ new WeakMap();
	const seenOffsets = /* @__PURE__ */ new Set();
	const getId = (chunk) => idByChunk.get(chunk);
	const validateOffset = (offset) => {
		if (offset.length === 0 || offset.includes("\0") || offset.includes("\r") || offset.includes("\n") || offset !== offset.trim()) throw new Error(`Invalid durability offset for SSE id: ${JSON.stringify(offset)}`);
		if (seenOffsets.has(offset)) throw new Error(`Durability adapter must return a unique offset per chunk: ${JSON.stringify(offset)}`);
		seenOffsets.add(offset);
	};
	async function* produce() {
		let batch = [];
		let terminalPersisted = false;
		let terminalForwarded = false;
		let failure;
		let terminalCause;
		let hasTerminalCause = false;
		const recordFailure = (error, phase) => {
			failure = { error: failure === void 0 ? error : combineFailures(failure.error, error, phase) };
		};
		async function* flush() {
			if (batch.length === 0) return;
			const toForward = batch;
			batch = [];
			const offsets = await durability.append(toForward);
			if (offsets.length !== toForward.length) throw new Error(`Durability append returned ${offsets.length} offsets for ${toForward.length} chunks`);
			toForward.forEach((chunk, i) => {
				const offset = offsets[i];
				if (offset === void 0) throw new Error(`Durability append omitted offset at index ${i}`);
				validateOffset(offset);
				idByChunk.set(chunk, offset);
			});
			if (toForward.some((chunk) => chunk.type === "RUN_FINISHED" || chunk.type === "RUN_ERROR")) terminalPersisted = true;
			for (const chunk of toForward) {
				if (chunk.type === "RUN_FINISHED" || chunk.type === "RUN_ERROR") terminalForwarded = true;
				yield chunk;
			}
		}
		try {
			if (isAborted(abortController.signal)) return;
			batch.push({
				type: "CUSTOM",
				name: RUN_ACCEPTED_EVENT,
				value: {},
				timestamp: Date.now()
			});
			yield* flush();
			for await (const chunk of stream) {
				if (isAborted(abortController.signal)) break;
				batch.push(chunk);
				if (batch.length >= batchSize || isDurabilityFlushBoundary(chunk)) yield* flush();
			}
			if (!isAborted(abortController.signal)) yield* flush();
		} catch (error) {
			terminalCause = error;
			hasTerminalCause = true;
			recordFailure(error, "producer failed");
			if (!isAborted(abortController.signal)) try {
				yield* flush();
			} catch (flushError) {
				recordFailure(flushError, "flushing buffered chunks failed");
			}
		} finally {
			const cancelled = isAborted(abortController.signal);
			if (batch.length > 0) try {
				for await (const _chunk of flush());
			} catch (flushError) {
				recordFailure(flushError, "flushing buffered chunks on exit failed");
			}
			const detached = cancelled && !isExplicitCancel(abortController.signal) && !hasTerminalCause && wasRunDetached(stream);
			if (!detached && needsTerminalPersistence(terminalPersisted, cancelled, hasTerminalCause)) {
				const cause = hasTerminalCause ? terminalCause : { name: "AbortError" };
				try {
					await durability.append([runErrorChunk(cause)]);
					terminalPersisted = true;
				} catch (terminalError) {
					logger?.errors("persisting terminal RUN_ERROR failed", { error: terminalError });
					recordFailure(terminalError, "persisting terminal RUN_ERROR failed");
				}
			}
			if (!detached) try {
				await durability.close();
			} catch (closeError) {
				logger?.errors("closing durability stream failed", { error: closeError });
				recordFailure(closeError, "closing durability stream failed");
			}
			if (failure !== void 0) {
				if (!terminalForwarded) throw failure.error;
				logger?.errors("durability failure after a terminal event was forwarded", { error: failure.error });
			}
		}
	}
	async function* replay(offset) {
		for await (const { offset: eventOffset, chunk } of durability.read(offset, abortController.signal)) {
			if (isAborted(abortController.signal)) break;
			validateOffset(eventOffset);
			idByChunk.set(chunk, eventOffset);
			yield chunk;
		}
	}
	return {
		source: resumeOffset !== null ? replay(resumeOffset) : produce(),
		getId
	};
}
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
function toServerSentEventsResponse(stream, init) {
	const { headers, abortController, durability, debug, ...responseInit } = init ?? {};
	const mergedHeaders = new Headers({
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive"
	});
	if (headers) new Headers(headers).forEach((value, key) => {
		mergedHeaders.set(key, value);
	});
	let body;
	if (durability) {
		const isFresh = durability.adapter.resumeFrom() === null;
		const producerAbortController = abortController ?? new AbortController();
		const deliveryAbortController = isFresh ? new AbortController() : producerAbortController;
		const { source, getId } = durableStreamSource(stream, durability.adapter, {
			abortController: producerAbortController,
			batch: durability.batch,
			logger: resolveDebugOption(debug)
		});
		const { encodeChunk, encodeError } = sseEncoders(getId);
		body = toEncodedStream(source, deliveryAbortController, encodeChunk, encodeError, isFresh, isFresh ? () => notifyRunDisconnected(stream) : void 0);
	} else body = toServerSentEventsStream(stream, abortController);
	return new Response(body, {
		...responseInit,
		headers: mergedHeaders
	});
}
/**
* A resume is served entirely from the durability log, so there is no producer
* to iterate. This empty source satisfies the response helpers' signature; on a
* resume `durableStreamSource` replays from the log and never touches it.
*/
function emptyDurableSource() {
	return (async function* () {})();
}
/**
* Take over an in-flight run as a side effect of serving its log.
*
* The response itself is unchanged: it still replays from the durability log via
* `emptyDurableSource()`. The drive runs BESIDE it, appending to the run's own
* producer-side log through the injected `pipe`, and the response tails what
* lands. That separation is what lets a taken-over run keep `chat()`'s normal
* middleware path — `withPersistence.onFinish` is what saves the transcript, so a
* parallel translation path would lose the history of any run that completed
* while detached.
*
* TOTAL BY CONSTRUCTION. Every failure is logged and swallowed:
*
* - No run id, no record, or a terminal record → serve the log, drive nothing.
*   A second tab attaching to a finished run must still see the transcript.
* - The claim is refused (another host is already driving) → serve the log,
*   drive nothing. That is the documented "two hosts attach at once: one wins
*   the lease and drives, the other tails the log" behavior.
* - The drive throws → logged. It cannot be reported to this response, which is
*   already streaming the log; the run's own `RUN_ERROR` event is the channel.
*
* A rejection escaping here would be an unhandled rejection with nobody to
* report it to — process-fatal on modern Node and instance-fatal inside a
* Durable Object.
*/
function startRunDriver(driver) {
	const logger = driver.logger;
	const promise = (async () => {
		const runId = resolveResumeRunId(driver.request);
		if (runId === null) return;
		let record = null;
		try {
			record = await driver.runs.get(runId);
		} catch (error) {
			logger?.errors("resume driver: reading the run record failed", {
				runId,
				error
			});
			return;
		}
		if (record !== null && !isRunStatus(record.status)) {
			logger?.errors("resume driver: the run record has an unrecognized status", {
				runId,
				status: record.status
			});
			return;
		}
		if (record === null || isTerminalRunStatus(record.status)) return;
		if (record.cancelRequested === true) return;
		const active = record;
		try {
			await driver.claim({
				runs: driver.runs,
				locks: driver.locks,
				runId
			}, async (claim) => {
				try {
					await driver.runs.update(runId, { detachedSince: void 0 });
				} catch (error) {
					logger?.errors("resume driver: clearing detachedSince failed", {
						runId,
						error
					});
				}
				await driver.pipe(driver.drive({
					runId,
					threadId: active.threadId,
					signal: claim.signal
				}), {
					runId,
					threadId: active.threadId,
					signal: claim.signal
				});
			});
		} catch (error) {
			logger?.provider("resume driver: not driving this run", {
				runId,
				error
			});
		}
	})();
	if (driver.waitUntil) driver.waitUntil(promise);
	else promise.catch(() => {});
}
/**
* The single wiring point both resume helpers call, so the SSE and NDJSON
* halves cannot drift: a fix here applies to both. Called AFTER each helper's
* `resumeFrom() === null` 400 check — an attach with no offset has nothing to
* replay, and driving a run whose response will 400 would start an agent
* nobody is watching.
*/
function maybeStartRunDriver(driver) {
	if (driver) startRunDriver(driver);
}
var NO_RESUME_OFFSET = "No resume offset provided (expected a Last-Event-ID header or an ?offset query parameter).";
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
function resumeServerSentEventsResponse(options) {
	const { adapter, batch, debug, driver, ...responseInit } = options;
	if (adapter.resumeFrom() === null) return new Response(NO_RESUME_OFFSET, { status: 400 });
	maybeStartRunDriver(driver);
	return toServerSentEventsResponse(emptyDurableSource(), {
		...responseInit,
		durability: {
			adapter,
			batch
		},
		debug
	});
}
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
function toHttpStream(stream, abortController, getId) {
	const { encodeChunk, encodeError } = ndjsonEncoders(getId);
	return toEncodedStream(stream, abortController, encodeChunk, encodeError);
}
/**
* NDJSON chunk/error encoders. Shared by {@link toHttpStream} and the internal
* durability branch (see {@link sseEncoders}).
*/
function ndjsonEncoders(getId) {
	const encoder = new TextEncoder();
	return {
		encodeChunk: (chunk, index) => {
			const id = getId?.(chunk, index);
			const wire = toWireChunk(chunk);
			const line = id === void 0 ? JSON.stringify(wire) : JSON.stringify({
				id,
				chunk: wire
			});
			return encoder.encode(`${line}\n`);
		},
		encodeError: (error) => encoder.encode(`${JSON.stringify(toWireChunk(runErrorChunk(error)))}\n`)
	};
}
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
function toHttpResponse(stream, init) {
	const { abortController, durability, debug, headers, ...responseInit } = init ?? {};
	const mergedHeaders = new Headers({
		"Content-Type": "application/x-ndjson",
		"Cache-Control": "no-cache"
	});
	if (headers) new Headers(headers).forEach((value, key) => {
		mergedHeaders.set(key, value);
	});
	let body;
	if (durability) {
		const isFresh = durability.adapter.resumeFrom() === null;
		const producerAbortController = abortController ?? new AbortController();
		const deliveryAbortController = isFresh ? new AbortController() : producerAbortController;
		const { source, getId } = durableStreamSource(stream, durability.adapter, {
			abortController: producerAbortController,
			batch: durability.batch,
			logger: resolveDebugOption(debug)
		});
		const { encodeChunk, encodeError } = ndjsonEncoders(getId);
		body = toEncodedStream(source, deliveryAbortController, encodeChunk, encodeError, isFresh, isFresh ? () => notifyRunDisconnected(stream) : void 0);
	} else body = toHttpStream(stream, abortController);
	return new Response(body, {
		...responseInit,
		headers: mergedHeaders
	});
}
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
function resumeHttpResponse(options) {
	const { adapter, batch, debug, driver, ...responseInit } = options;
	if (adapter.resumeFrom() === null) return new Response(NO_RESUME_OFFSET, { status: 400 });
	maybeStartRunDriver(driver);
	return toHttpResponse(emptyDurableSource(), {
		...responseInit,
		durability: {
			adapter,
			batch
		},
		debug
	});
}
//#endregion
export { RUN_ACCEPTED_EVENT, durableStreamSource, resolveResumeRunId, resumeHttpResponse, resumeServerSentEventsResponse, runErrorChunk, streamToText, toHttpResponse, toHttpStream, toServerSentEventsResponse, toServerSentEventsStream };

//# sourceMappingURL=stream-to-response.js.map