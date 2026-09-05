//#region src/logger/console-logger.ts
/**
* `util.inspect` options used with `console.dir` on Node so deeply nested
* structures (e.g. provider chunk payloads with `usage`, `output`,
* `reasoning`, `tools`) render in full instead of truncating to
* `[Object]` / `[Array]`.
*/
var DIR_OPTIONS = {
	depth: null,
	colors: true
};
function resolveMetaStrategy() {
	try {
		if (globalThis.navigator?.userAgent === "Cloudflare-Workers") return "json";
	} catch {}
	if (typeof process !== "undefined" && typeof process.versions?.node === "string") return "dir";
	return "arg";
}
/**
* `JSON.stringify` hardened for debug payloads: circular references collapse
* to `"[Circular]"`, `Error` instances expand to `name`/`message`/`stack`
* (they would otherwise stringify to `{}`), and `bigint` values become
* strings (they would otherwise throw). Never throws — falls back to
* `String(value)` and, if even that coercion throws, a placeholder.
*/
function stringifyMetaSafely(value) {
	const seen = /* @__PURE__ */ new WeakSet();
	try {
		return JSON.stringify(value, (_key, entry) => {
			if (typeof entry === "bigint") return entry.toString();
			if (entry instanceof Error) return {
				name: entry.name,
				message: entry.message,
				stack: entry.stack
			};
			if (typeof entry === "object" && entry !== null) {
				if (seen.has(entry)) return "[Circular]";
				seen.add(entry);
			}
			return entry;
		}, 2);
	} catch {
		try {
			return String(value);
		} catch {
			return "[Unserializable meta]";
		}
	}
}
/**
* Default `Logger` implementation that routes each level to the matching
* `console` method:
*
* - `debug` → `console.debug`
* - `info` → `console.info`
* - `warn` → `console.warn`
* - `error` → `console.error`
*
* When a `meta` object is supplied it is rendered with the strategy that
* actually surfaces it on the current runtime (see {@link MetaStrategy}):
* depth-unlimited `console.dir` on Node, circular-safe JSON on Cloudflare
* Workers, and an extra console argument everywhere else.
*
* This is the logger used when `debug` is enabled on any activity and no
* custom `logger` is supplied via `debug: { logger }`.
*/
var ConsoleLogger = class {
	/** Log a debug-level message; forwards to `console.debug`. */
	debug(message, meta) {
		this.emit("debug", message, meta);
	}
	/** Log an info-level message; forwards to `console.info`. */
	info(message, meta) {
		this.emit("info", message, meta);
	}
	/** Log a warning-level message; forwards to `console.warn`. */
	warn(message, meta) {
		this.emit("warn", message, meta);
	}
	/** Log an error-level message; forwards to `console.error`. */
	error(message, meta) {
		this.emit("error", message, meta);
	}
	emit(level, message, meta) {
		if (meta === void 0) {
			console[level](message);
			return;
		}
		switch (resolveMetaStrategy()) {
			case "dir":
				console[level](message);
				console.dir(meta, DIR_OPTIONS);
				break;
			case "json":
				console[level](`${message}\n${stringifyMetaSafely(meta)}`);
				break;
			case "arg": console[level](message, meta);
		}
	}
};
//#endregion
export { ConsoleLogger };

//# sourceMappingURL=console-logger.js.map