//#region src/activities/error-payload.ts
/**
* Shared error-narrowing helper for activities that convert thrown values
* into structured `RUN_ERROR` events.
*
* Accepts Error instances, objects with string-ish `message`/`code`, or bare
* strings; always returns a shape safe to serialize. Never leaks the full
* error object (which may carry request/response state from an SDK).
*
* Abort-shaped errors (DOM `AbortError`, OpenAI `APIUserAbortError`,
* OpenRouter `RequestAbortedError`) are normalized to a stable
* `{ message: 'Request aborted', code: 'aborted' }` shape so callers can
* discriminate user-initiated cancellation from other failures without
* matching on provider-specific message strings.
*/
var ABORT_ERROR_NAMES = /* @__PURE__ */ new Set([
	"AbortError",
	"APIUserAbortError",
	"RequestAbortedError"
]);
/**
* True when a thrown value is an abort-shaped error (DOM `AbortError`, OpenAI
* `APIUserAbortError`, OpenRouter `RequestAbortedError`) — i.e. user-initiated
* cancellation rather than a genuine failure. Matches on the error `name` so
* callers can discriminate aborts without depending on a signal's state or on
* provider-specific message strings.
*/
function isAbortShapedError(error) {
	if (error && typeof error === "object") {
		const name = error.name;
		return typeof name === "string" && ABORT_ERROR_NAMES.has(name);
	}
	return false;
}
function normalizeCode(codeField) {
	if (typeof codeField === "string") return codeField;
	if (typeof codeField === "number" && Number.isFinite(codeField)) return String(codeField);
}
function extractCode(source) {
	const fromCode = normalizeCode(source.code);
	if (fromCode !== void 0) return fromCode;
	if (typeof source.status === "number" && Number.isFinite(source.status)) return String(source.status);
}
function toRunErrorPayload(error, fallbackMessage = "Unknown error occurred") {
	if (isAbortShapedError(error)) return {
		message: "Request aborted",
		code: "aborted"
	};
	if (error instanceof Error) return {
		message: error.message || fallbackMessage,
		code: extractCode(error)
	};
	if (typeof error === "object" && error !== null) {
		const messageField = error.message;
		return {
			message: typeof messageField === "string" && messageField.length > 0 ? messageField : fallbackMessage,
			code: extractCode(error)
		};
	}
	if (typeof error === "string" && error.length > 0) return {
		message: error,
		code: void 0
	};
	return {
		message: fallbackMessage,
		code: void 0
	};
}
/**
* Extract the provider's *structured error body* from a thrown value, to attach
* as the AG-UI `rawEvent` on a RUN_ERROR event. This is the recoverable upstream
* detail (provider name, the upstream model's error JSON, rate-limit/overload
* codes, etc.) that `toRunErrorPayload`'s `{ message, code }` deliberately drops.
*
* Security boundary: only known provider-response-body fields are forwarded —
* never the raw SDK exception object, which can carry request metadata such as
* auth headers or request ids. The recognized sources, in priority order:
*
*  - `error.rawEvent` — a provider body an adapter attached explicitly (e.g. the
*    OpenRouter mid-stream `chunk.error`).
*  - `error.error` (object) — the parsed provider response body exposed by SDK
*    `APIError` instances (OpenAI/Anthropic `{ type, message, code, param }`,
*    OpenRouter typed errors whose `.error` carries `.metadata`). This is
*    provider-shaped data, distinct from `.headers` / `.request_id`.
*  - `error.metadata` — OpenRouter's `provider_name` + raw upstream body, when
*    surfaced directly on the thrown error.
*
* Returns `undefined` when no structured provider body is present, so callers
* omit the field entirely rather than setting it to `null`:
*
*   const rawEvent = toRunErrorRawEvent(error)
*   yield { type: EventType.RUN_ERROR, ..., ...(rawEvent !== undefined && { rawEvent }) }
*/
function toRunErrorRawEvent(error) {
	if (!error || typeof error !== "object") return void 0;
	const e = error;
	if (e.rawEvent !== void 0 && e.rawEvent !== null) return e.rawEvent;
	if (e.error !== void 0 && e.error !== null && typeof e.error === "object") return e.error;
	if (e.metadata !== void 0 && e.metadata !== null) return e.metadata;
}
//#endregion
export { isAbortShapedError, toRunErrorPayload, toRunErrorRawEvent };

//# sourceMappingURL=error-payload.js.map