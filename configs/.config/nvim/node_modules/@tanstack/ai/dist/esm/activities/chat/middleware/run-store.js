import { createCapability } from "./capabilities.js";
//#region src/activities/chat/middleware/run-store.ts
/**
* Run lifecycle types — the neutral home for what a "run" is.
*
* Shared by `@tanstack/ai-persistence` (which exposes a `runs` store through
* `withPersistence`) and `@tanstack/ai-sandbox` (whose run driver records run
* status). Living in core is what lets one `RunRecord` per run be shared by
* both, instead of each package keeping its own and disagreeing. Same rationale
* as `LockStore` (`packages/ai/src/locks.ts`), which is likewise a
* coordination primitive that core owns so that no consumer package has to.
*/
var TERMINAL = {
	completed: true,
	failed: true,
	aborted: true
};
var ALL_STATUSES = {
	running: true,
	interrupted: true,
	completed: true,
	failed: true,
	aborted: true
};
/**
* Whether `value` is a {@link RunStatus} — the guard a backend validates a row
* with at DESERIALIZATION.
*
* `RunStatus` is a compile-time claim about a storage column. A row arrives as
* JSON out of D1, a Durable Object, or Postgres, and nothing in the type system
* checked what that column actually held, so a `RunStore` implementation should
* run its row's `status` through this before handing the record on. The readers
* downstream act DESTRUCTIVELY on the answer — `@tanstack/ai-sandbox`'s journal
* sweep DELETES the journal of a run it believes terminal — so a row that lies
* about its status is not a display bug.
*/
function isRunStatus(value) {
	return typeof value === "string" && Object.hasOwn(ALL_STATUSES, value);
}
/**
* Whether `status` means no further events will be appended. Narrows, so a
* caller inside the guard can pass `status` where a {@link TerminalRunStatus}
* is required without a cast.
*
* `Object.hasOwn`, never `in`: `in` walks the prototype chain, so a row whose
* `status` column held `'toString'` or `'constructor'` would be reported
* terminal. `status` is TYPED `RunStatus`, but every value reaching here comes
* off a user-implemented {@link RunStore} and the type is only a claim (see
* {@link isRunStatus}). A false `true` deletes a live run's journal
* (`@tanstack/ai-sandbox`'s journal sweep), fails its attach as `'terminal-run'`
* (`attach-preflight`), and refuses to drive it (`stream-to-response.ts`).
*/
function isTerminalRunStatus(status) {
	return Object.hasOwn(TERMINAL, status);
}
/**
* Type a {@link RunStore} implementation inline: pass the object and get
* autocomplete plus contract checking with no separate annotation. Mirrors
* `defineLock` / `defineSandboxInstanceStore`.
*
* The generic return preserves the argument's own type, so an optional method
* the implementation actually provides stays known-present on the result
* instead of collapsing back to `| undefined` on the interface.
*/
function defineRunStore(store) {
	return store;
}
/**
* Whether the current run can be DETACHED rather than destroyed when its client
* disconnects — `true` only when some middleware has both a {@link RunStore} and
* a durable event log wired (`withSandbox`'s `runs` + `durability.adapter`).
*
* Lives in core for the same reason `LockStore` does: it is a coordination fact
* that two consumer packages must agree on, and neither may depend on the other.
* `@tanstack/ai-sandbox` provides it; `@tanstack/ai-persistence` reads it to
* decide whether an abort is terminal (`'aborted'`) or a detach (write nothing).
* A persistence → sandbox import would be a layering inversion.
*
* Consumers read it with `{ optional: true }`: absent means "not detachable",
* which is every app that has not wired durability.
*
* Typed `true`, not `boolean`: ABSENCE is the negative, so a published `false`
* has no meaning — and a consumer that tests PRESENCE rather than the value
* would read one as "detachable". Narrowing the payload makes that
* unrepresentable instead of merely undocumented.
*/
var DetachableRunCapability = createCapability()("detachable-run");
/**
* Destructured accessors: `getDetachableRun(ctx, { optional: true })` /
* `provideDetachableRun(ctx, true)`.
*/
var [getDetachableRun, provideDetachableRun] = DetachableRunCapability;
/**
* Whether this run's teardown DID detach — the disconnect was survived, the
* agent is still working, and a later attach can take the run over.
*
* The past-tense counterpart of {@link DetachableRunCapability}, and the two must
* not be confused:
*
* - **detachABLE** is published at `setup`, and only says a disconnect *may* be
*   survived (a `RunStore` and a durable log are wired).
* - **detachED** is published on the ABORT path, by the middleware that actually
*   makes the call — `withSandbox`'s `onAbort`, which is the only actor that has
*   resolved BOTH out-of-band cancel bands (`AbortInfo.cancelRequested` and
*   `wasCancelRequested` on the record) and `detachOnDisconnect`. An explicit
*   cancel, a non-detachable disconnect, an error, and a normal finish all leave
*   it unpublished.
*
* Its consumer is the durable DELIVERY sink in `stream-to-response.ts`: a
* detached run's log must stay OPEN and un-terminalized so the takeover can
* continue it (see `wasRunDetached` in `../../../delivery-detach`). Reading it
* is safe and race-free only because a `for await` over the chat stream awaits
* the generator's `return()` — and therefore the whole `onAbort` chain — before
* the sink's own `finally` runs.
*
* Read with `{ optional: true }`: absent means "not detached", which is every
* other exit path and every app that has not wired durability.
*
* Typed `true`, not `boolean`, for the same reason as
* {@link DetachableRunCapability}: absence is the only negative, so publishing
* `false` must not be representable.
*/
var RunDetachedCapability = createCapability()("run-detached");
/**
* Destructured accessors: `getRunDetached(ctx, { optional: true })` /
* `provideRunDetached(ctx, true)`.
*/
var [getRunDetached, provideRunDetached] = RunDetachedCapability;
/** In-memory {@link RunStore}. Single process only. */
var InMemoryRunStore = class {
	runs = /* @__PURE__ */ new Map();
	createOrResume(input) {
		const existing = this.runs.get(input.runId);
		if (existing) return Promise.resolve(existing);
		const record = {
			runId: input.runId,
			threadId: input.threadId,
			status: input.status ?? "running",
			startedAt: input.startedAt
		};
		this.runs.set(record.runId, record);
		return Promise.resolve(record);
	}
	update(runId, patch) {
		const existing = this.runs.get(runId);
		if (existing) this.runs.set(runId, {
			...existing,
			...patch
		});
		return Promise.resolve();
	}
	get(runId) {
		return Promise.resolve(this.runs.get(runId) ?? null);
	}
	listByThread(threadId) {
		const matching = [...this.runs.values()].filter((run) => run.threadId === threadId).sort((a, b) => a.startedAt - b.startedAt);
		return Promise.resolve(matching);
	}
	listReclaimable(opts) {
		const cutoff = opts.now - opts.ttlMs;
		const matching = [...this.runs.values()].filter((run) => run.status === "running" && run.detachedSince !== void 0 && run.detachedSince <= cutoff);
		return Promise.resolve(matching);
	}
	findActiveRun(threadId) {
		let active = null;
		for (const run of this.runs.values()) {
			if (run.threadId !== threadId || run.status !== "running") continue;
			if (active === null || run.startedAt > active.startedAt) active = run;
		}
		return Promise.resolve(active);
	}
};
//#endregion
export { DetachableRunCapability, InMemoryRunStore, RunDetachedCapability, defineRunStore, getDetachableRun, getRunDetached, isRunStatus, isTerminalRunStatus, provideDetachableRun, provideRunDetached };

//# sourceMappingURL=run-store.js.map