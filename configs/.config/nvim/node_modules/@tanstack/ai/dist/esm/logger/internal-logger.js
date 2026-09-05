//#region src/logger/internal-logger.ts
/**
* Package-internal logger wrapper used by every activity and adapter in
* `@tanstack/ai`. Wraps a user-supplied (or default `ConsoleLogger`) `Logger`
* plus a fully-resolved per-category map. Each category has a dedicated
* method that no-ops when its flag is `false`, or prepends a
* `[tanstack-ai:<category>] ` prefix and calls the underlying logger's
* `error` (for the `errors` category) or `debug` (for everything else).
*
* Not exported from the package root. Adapter packages consume it via the
* `@tanstack/ai/adapter-internals` subpath export.
*/
/**
* Emoji marker per category — bracketing the `[tanstack-ai:<cat>]` tag on
* both sides makes it trivial to visually pick out a category when scanning
* dense streaming logs.
*/
var CATEGORY_EMOJI = {
	request: "📤",
	provider: "📥",
	output: "📨",
	middleware: "🧩",
	tools: "🔧",
	agentLoop: "🔁",
	config: "⚙️",
	errors: "❌",
	sandbox: "📦"
};
var InternalLogger = class {
	logger;
	categories;
	constructor(logger, categories) {
		this.logger = logger;
		this.categories = categories;
	}
	/** Whether a category is enabled. Cheap, safe to call on hot paths. */
	isEnabled(category) {
		return this.categories[category];
	}
	emit(level, category, message, meta) {
		if (!this.categories[category]) return;
		const emoji = CATEGORY_EMOJI[category];
		const prefixed = `${emoji} [tanstack-ai:${category}] ${emoji} ${message}`;
		try {
			if (level === "error") this.logger.error(prefixed, meta);
			else this.logger.debug(prefixed, meta);
		} catch {}
	}
	/** Log a raw chunk/frame received from a provider SDK. */
	provider(message, meta) {
		this.emit("debug", "provider", message, meta);
	}
	/** Log a chunk/result yielded to the consumer after middleware. */
	output(message, meta) {
		this.emit("debug", "output", message, meta);
	}
	/** Log inputs/outputs around a middleware hook invocation. Chat-only. */
	middleware(message, meta) {
		this.emit("debug", "middleware", message, meta);
	}
	/** Log before/after a tool-call execution. Chat-only. */
	tools(message, meta) {
		this.emit("debug", "tools", message, meta);
	}
	/** Log sandbox internals (watcher, file events, hook dispatch). Chat-only. */
	sandbox(message, meta) {
		this.emit("debug", "sandbox", message, meta);
	}
	/** Log an agent-loop iteration marker or phase transition. Chat-only. */
	agentLoop(message, meta) {
		this.emit("debug", "agentLoop", message, meta);
	}
	/** Log a config transform returned by a middleware `onConfig` hook. Chat-only. */
	config(message, meta) {
		this.emit("debug", "config", message, meta);
	}
	/**
	* Log a caught error. Defaults to on even when `debug` is unspecified.
	* Uses the underlying logger's `error` level.
	*/
	errors(message, meta) {
		this.emit("error", "errors", message, meta);
	}
	/** Log outgoing request metadata before an adapter SDK call. */
	request(message, meta) {
		this.emit("debug", "request", message, meta);
	}
	/**
	* Log a non-fatal misconfiguration or recoverable anomaly. Gated by the
	* `errors` category — on by default (and when `debug` is unspecified), so
	* silent-drop conditions surface, but still silenced by `debug: false`,
	* which honors the "disable everything including errors" contract. Routes to
	* the underlying logger's `warn` level.
	*/
	warn(message, meta) {
		if (!this.categories.errors) return;
		const prefixed = `⚠️ [tanstack-ai:warn] ⚠️ ${message}`;
		try {
			this.logger.warn(prefixed, meta);
		} catch {}
	}
};
//#endregion
export { InternalLogger };

//# sourceMappingURL=internal-logger.js.map