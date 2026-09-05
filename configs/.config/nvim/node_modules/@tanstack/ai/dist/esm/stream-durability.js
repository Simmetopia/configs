//#region src/stream-durability.ts
var MEMORY_OFFSET_PREFIX = "memory:v1:";
function encodeMemoryOffset(runId, seq) {
	return `${MEMORY_OFFSET_PREFIX}${encodeURIComponent(runId)}:${seq}`;
}
function decodeMemoryOffset(offset) {
	if (!offset.startsWith(MEMORY_OFFSET_PREFIX)) throw new Error(`Invalid memory stream offset: ${offset}`);
	const encoded = offset.slice(10);
	const separator = encoded.lastIndexOf(":");
	if (separator === -1) throw new Error(`Invalid memory stream offset: ${offset}`);
	const runId = decodeURIComponent(encoded.slice(0, separator));
	const seq = Number(encoded.slice(separator + 1));
	if (!Number.isSafeInteger(seq) || seq < 1) throw new Error(`Invalid memory stream offset: ${offset}`);
	return {
		runId,
		seq
	};
}
function readResumeOffset(request) {
	const header = request.headers.get("Last-Event-ID");
	if (header) return header;
	try {
		return new URL(request.url).searchParams.get("offset");
	} catch {
		return null;
	}
}
/**
* The run id a request names: `X-Run-Id` header first, then `?runId`.
*
* The single implementation of that precedence, shared by the durability
* adapters below and by the resume response helpers' run driver
* (`stream-to-response.ts`), so the helper and the adapter can never disagree
* about which run a request is talking about.
*/
function resolveResumeRunId(request) {
	const header = request.headers.get("X-Run-Id");
	if (header) return header;
	try {
		return new URL(request.url).searchParams.get("runId");
	} catch {
		return null;
	}
}
function assertValidRunId(runId) {
	if (runId.length === 0 || /[\r\n]/.test(runId)) throw new Error(`Invalid runId (must be non-empty and contain no CR/LF): ${JSON.stringify(runId)}`);
	return runId;
}
function resolveMemoryRunId(request, resumeOffset) {
	if (resumeOffset !== null && resumeOffset !== "-1" && resumeOffset !== "now") return assertValidRunId(decodeMemoryOffset(resumeOffset).runId);
	const requestedRunId = resolveResumeRunId(request);
	return requestedRunId === null ? crypto.randomUUID() : assertValidRunId(requestedRunId);
}
function memoryThreshold(offset, runId, tail) {
	if (offset === "-1") return -1;
	if (offset === "now") return tail;
	const decoded = decodeMemoryOffset(offset);
	if (decoded.runId !== runId) throw new Error(`Memory stream offset belongs to run ${JSON.stringify(decoded.runId)}, not ${JSON.stringify(runId)}`);
	return decoded.seq;
}
/**
* Bounds for the in-process log store. `memoryStream` is the dev/single-process
* backend; without eviction its module-global Map would grow without bound on a
* long-lived server (one retained chunk buffer per run, forever). Completed logs
* are swept after a grace window — late resumers/joiners still work briefly —
* and a hard cap drops the oldest completed logs under pressure. Active
* (incomplete) logs are never evicted, so an in-flight run is never dropped.
*/
var MAX_MEMORY_RUNS = 1024;
var COMPLETED_LOG_TTL_MS = 3e5;
/**
* How long a from-start join (`-1` / `now`) waits for a run's first chunk before
* failing. Bounds the "joined a run that never produces" case so a consumer
* gets a surfaced error instead of an indefinitely-open, event-less connection.
*
* Defaults short: the common from-start join is a reload rejoining a run whose
* producer ran in a PRIOR request, so an in-flight run's log already holds
* chunks (it streams immediately, deadline never applies) and an empty log means
* the run is gone — failing fast lets the client re-enable input near-instantly
* instead of hanging. Raise `firstChunkDeadlineMs` for backends where a producer
* legitimately starts well after a joiner attaches (a queued/deferred job).
*/
var DEFAULT_FIRST_CHUNK_DEADLINE_MS = 100;
var memoryLogs = /* @__PURE__ */ new Map();
/**
* Evict completed logs past their grace window, then, if still over the cap,
* drop the oldest completed logs (the Map preserves insertion order) until back
* under the cap. Never touches an incomplete (in-flight) log.
*/
function sweepMemoryLogs(now) {
	for (const [id, log] of memoryLogs) if (log.complete && log.completedAt !== void 0 && now - log.completedAt > COMPLETED_LOG_TTL_MS) memoryLogs.delete(id);
	if (memoryLogs.size <= MAX_MEMORY_RUNS) return;
	for (const [id, log] of memoryLogs) {
		if (memoryLogs.size <= MAX_MEMORY_RUNS) break;
		if (log.complete) memoryLogs.delete(id);
	}
}
function getOrCreateLog(id) {
	let log = memoryLogs.get(id);
	if (!log) {
		sweepMemoryLogs(Date.now());
		log = {
			entries: [],
			complete: false,
			completedAt: void 0,
			waiters: []
		};
		memoryLogs.set(id, log);
	}
	return log;
}
function markComplete(log) {
	if (!log.complete) {
		log.complete = true;
		log.completedAt = Date.now();
	}
}
function wakeWaiters(log) {
	const waiters = log.waiters;
	log.waiters = [];
	for (const wake of waiters) wake();
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
function memoryStream(source, options = {}) {
	const resumeOffset = source instanceof Request ? readResumeOffset(source) : source.offset ?? null;
	const runId = source instanceof Request ? resolveMemoryRunId(source, resumeOffset) : assertValidRunId(source.runId);
	const firstChunkDeadlineMs = options.firstChunkDeadlineMs ?? DEFAULT_FIRST_CHUNK_DEADLINE_MS;
	return {
		resumeFrom: () => resumeOffset,
		append: async (chunks) => {
			const log = getOrCreateLog(runId);
			const firstSeq = (log.entries.at(-1)?.seq ?? 0) + 1;
			const offsets = chunks.map((chunk, index) => {
				const seq = firstSeq + index;
				const offset = encodeMemoryOffset(runId, seq);
				log.entries.push({
					seq,
					offset,
					chunk
				});
				return offset;
			});
			wakeWaiters(log);
			return offsets;
		},
		upsert: async (entries) => {
			const log = getOrCreateLog(runId);
			const tailSeq = log.entries.at(-1)?.seq ?? 0;
			const seen = /* @__PURE__ */ new Set();
			let plannedTailSeq = tailSeq;
			const plan = Array.from(entries, (entry, index) => {
				if (entry === void 0) throw new Error(`memoryStream: entries[${index}] is missing; entries must be dense`);
				const { chunk, offset } = entry;
				let decoded;
				try {
					decoded = decodeMemoryOffset(offset);
				} catch (cause) {
					throw new Error(`memoryStream: entries[${index}].offset ${JSON.stringify(offset)} is not a resumable memory stream offset: ${cause instanceof Error ? cause.message : String(cause)}`);
				}
				if (decoded.runId !== runId) throw new Error(`memoryStream: entries[${index}].offset ${JSON.stringify(offset)} belongs to run ${JSON.stringify(decoded.runId)}, not ${JSON.stringify(runId)}`);
				const seq = decoded.seq;
				if (seen.has(offset)) throw new Error(`memoryStream: entries[${index}].offset ${JSON.stringify(offset)} is repeated within the batch; each offset may appear at most once`);
				seen.add(offset);
				const existing = log.entries.find((stored) => stored.offset === offset);
				if (existing) return {
					kind: "replace",
					existing,
					chunk
				};
				if (seq <= plannedTailSeq) throw new Error(`memoryStream: entries[${index}].offset ${JSON.stringify(offset)} is not stored yet but claims position ${seq}, at or before the tail ${plannedTailSeq}; a new offset must come after every stored and preceding entry`);
				plannedTailSeq = seq;
				return {
					kind: "push",
					seq,
					offset,
					chunk
				};
			});
			for (const step of plan) if (step.kind === "replace") step.existing.chunk = step.chunk;
			else log.entries.push({
				seq: step.seq,
				offset: step.offset,
				chunk: step.chunk
			});
			wakeWaiters(log);
			return plan.map((step) => step.kind === "replace" ? step.existing.offset : step.offset);
		},
		snapshot: () => {
			const log = memoryLogs.get(runId);
			if (log === void 0) return Promise.resolve([]);
			return Promise.resolve(log.entries.map((entry) => ({
				offset: entry.offset,
				chunk: entry.chunk
			})));
		},
		close: () => {
			const log = getOrCreateLog(runId);
			markComplete(log);
			wakeWaiters(log);
			return Promise.resolve();
		},
		read: async function* (offset, signal) {
			const isFromStartJoin = offset === "-1" || offset === "now";
			let log = memoryLogs.get(runId);
			if (log === void 0 || log.entries.length === 0 && !log.complete) {
				if (!isFromStartJoin) throw new Error(`Unknown or expired memory stream run: ${JSON.stringify(runId)}`);
				log = getOrCreateLog(runId);
			}
			const threshold = memoryThreshold(offset, runId, log.entries.at(-1)?.seq ?? 0);
			let index = 0;
			for (;;) {
				while (index < log.entries.length) {
					const entry = log.entries[index];
					index += 1;
					if (entry && entry.seq > threshold) yield {
						offset: entry.offset,
						chunk: entry.chunk
					};
				}
				if (log.complete || signal?.aborted) return;
				const deadlineForFirstChunk = log.entries.length === 0 ? firstChunkDeadlineMs : void 0;
				await new Promise((resolve, reject) => {
					let timer;
					const cleanup = () => {
						if (timer !== void 0) clearTimeout(timer);
						signal?.removeEventListener("abort", onAbort);
						const waiterIndex = log.waiters.indexOf(wake);
						if (waiterIndex !== -1) log.waiters.splice(waiterIndex, 1);
					};
					const onAbort = () => {
						cleanup();
						resolve();
					};
					const wake = () => {
						cleanup();
						resolve();
					};
					log.waiters.push(wake);
					signal?.addEventListener("abort", onAbort, { once: true });
					if (deadlineForFirstChunk !== void 0) timer = setTimeout(() => {
						cleanup();
						if (log.entries.length === 0 && !log.complete && memoryLogs.get(runId) === log) memoryLogs.delete(runId);
						reject(/* @__PURE__ */ new Error(`Memory stream run produced no data within ${deadlineForFirstChunk}ms: ${JSON.stringify(runId)}`));
					}, deadlineForFirstChunk);
				});
			}
		}
	};
}
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
async function* replayRunStream(durability, offset, signal) {
	const from = offset ?? "-1";
	for await (const { chunk } of durability.read(from, signal)) yield chunk;
}
//#endregion
export { memoryStream, replayRunStream, resolveResumeRunId };

//# sourceMappingURL=stream-durability.js.map