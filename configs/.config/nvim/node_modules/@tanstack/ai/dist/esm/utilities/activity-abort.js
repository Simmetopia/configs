//#region src/utilities/activity-abort.ts
/**
* Shared abort/timeout composition for media (and summarize) activities.
*
* Callers pass optional `timeout` and/or `abortSignal` on activity options.
* Core composes them into one effective signal, races the adapter call so a
* hung provider still rejects, clears timeout resources on settle, and
* classifies aborts so lifecycle middleware gets `onAbort` rather than
* `onError`.
*/
var ABORT_ERROR_NAMES = /* @__PURE__ */ new Set([
	"AbortError",
	"TimeoutError",
	"APIUserAbortError",
	"RequestAbortedError"
]);
/**
* Combine two optional AbortSignals into one that aborts when either does.
* Returns the other signal directly when one is absent or already aborted.
* First abort wins and preserves its reason.
*
* Manual implementation — `AbortSignal.any` requires Node >= 20.3.
*/
function combineAbortSignals(a, b) {
	if (!a) return b;
	if (!b) return a;
	if (a.aborted) return a;
	if (b.aborted) return b;
	const controller = new AbortController();
	const onAbort = (source) => () => {
		controller.abort(source.reason);
	};
	a.addEventListener("abort", onAbort(a), { once: true });
	b.addEventListener("abort", onAbort(b), { once: true });
	return controller.signal;
}
function createTimeoutReason(ms) {
	if (typeof DOMException !== "undefined") return new DOMException(`Activity timed out after ${ms}ms`, "TimeoutError");
	const err = /* @__PURE__ */ new Error(`Activity timed out after ${ms}ms`);
	err.name = "TimeoutError";
	return err;
}
/** Normalize an abort reason into an Error the activity can reject with. */
function toAbortError(reason) {
	if (reason instanceof Error) return reason;
	if (typeof reason === "string" && reason.length > 0) {
		const err = new Error(reason);
		err.name = "AbortError";
		return err;
	}
	const err = /* @__PURE__ */ new Error("The operation was aborted");
	err.name = "AbortError";
	return err;
}
/**
* Compose an activity-level timeout with a caller AbortSignal.
*
* - No SDK-wide default timeout; omit both for unlimited wait.
* - First of caller cancellation or timeout wins and keeps its reason.
* - Call `clear()` when the activity settles (success or failure) so timers
*   do not leak.
*/
function createActivityAbortControls(options) {
	let timeoutId;
	let timeoutSignal;
	if (options.timeout !== void 0) {
		if (!Number.isFinite(options.timeout) || options.timeout < 0) throw new Error(`Invalid activity timeout: expected a non-negative finite number, got ${String(options.timeout)}`);
		const controller = new AbortController();
		timeoutSignal = controller.signal;
		const ms = options.timeout;
		timeoutId = setTimeout(() => {
			controller.abort(createTimeoutReason(ms));
		}, ms);
	}
	return {
		signal: combineAbortSignals(options.abortSignal, timeoutSignal),
		clear: () => {
			if (timeoutId !== void 0) {
				clearTimeout(timeoutId);
				timeoutId = void 0;
			}
		}
	};
}
/**
* Reject when `signal` aborts, even if the underlying promise ignores it.
* Ensures activity-level timeouts work for adapters that do not yet forward
* the signal to the provider SDK.
*
* When the signal wins, the adapter promise is observed with an empty handler
* so a later settle cannot surface as an unhandled rejection.
*/
function raceWithAbort(promise, signal) {
	if (!signal) return promise;
	const swallow = () => {
		promise.then(() => void 0, () => void 0);
	};
	if (signal.aborted) {
		swallow();
		return Promise.reject(toAbortError(signal.reason));
	}
	return new Promise((resolve, reject) => {
		let settled = false;
		const onAbort = () => {
			if (settled) return;
			settled = true;
			cleanup();
			swallow();
			reject(toAbortError(signal.reason));
		};
		const cleanup = () => {
			signal.removeEventListener("abort", onAbort);
		};
		signal.addEventListener("abort", onAbort, { once: true });
		promise.then((value) => {
			if (settled) return;
			settled = true;
			cleanup();
			resolve(value);
		}, (error) => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(error);
		});
	});
}
/**
* Whether a thrown value (and optional effective signal) should route to
* middleware `onAbort` instead of `onError`.
*/
function isActivityAbortError(error, signal) {
	if (signal?.aborted) return true;
	if (!error || typeof error !== "object") return false;
	const name = error.name;
	return typeof name === "string" && ABORT_ERROR_NAMES.has(name);
}
/** Best-effort string reason for {@link GenerationAbortInfo}. */
function abortReasonMessage(error, signal) {
	if (signal?.reason !== void 0) {
		if (typeof signal.reason === "string") return signal.reason;
		if (signal.reason instanceof Error) return signal.reason.message;
	}
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
}
//#endregion
export { abortReasonMessage, combineAbortSignals, createActivityAbortControls, isActivityAbortError, raceWithAbort, toAbortError };

//# sourceMappingURL=activity-abort.js.map