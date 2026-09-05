//#region src/utilities/errors.ts
var SkillLimitError = class extends Error {
	provider;
	path;
	limit;
	allowed;
	actual;
	offending;
	constructor(init) {
		super(`${init.provider} ${init.path} skills limit exceeded (${init.limit}): ${init.actual} > ${init.allowed}`);
		this.name = "SkillLimitError";
		this.provider = init.provider;
		this.path = init.path;
		this.limit = init.limit;
		this.allowed = init.allowed;
		this.actual = init.actual;
		this.offending = init.offending;
	}
};
/**
* Best-effort extraction of a human-readable message from an unknown thrown
* value, returning `undefined` when none can be found.
*
* Used by `otelMiddleware` so error reporting stays identical across chat and
* media spans.
*/
function errorMessage(err) {
	if (err instanceof Error) return err.message;
	if (typeof err === "string") return err;
	if (err && typeof err === "object" && "message" in err) {
		const m = err.message;
		if (typeof m === "string") return m;
	}
}
/**
* Best-effort extraction of an error's type name (used for the `error.type`
* metric attribute), falling back to `'Error'` when no name is available.
*/
function errorTypeName(err) {
	if (err instanceof Error) return err.name || "Error";
	if (err && typeof err === "object" && "name" in err) {
		const n = err.name;
		if (typeof n === "string") return n;
	}
	return "Error";
}
/**
* Convert an AG-UI RUN_ERROR event to the Error shape exposed to consumers.
* Preserves the provider code and sanitized raw event when available, while
* accepting the deprecated nested error payload for backward compatibility.
*/
function runErrorEventToError(chunk) {
	const error = new Error(chunk.message || chunk.error?.message || "An error occurred");
	const code = chunk.code ?? chunk.error?.code;
	if (code !== void 0) Object.assign(error, { code });
	if (chunk.rawEvent !== void 0) Object.assign(error, { rawEvent: chunk.rawEvent });
	return error;
}
//#endregion
export { SkillLimitError, errorMessage, errorTypeName, runErrorEventToError };

//# sourceMappingURL=errors.js.map