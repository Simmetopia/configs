import { ConsoleLogger } from "./console-logger.js";
import { InternalLogger } from "./internal-logger.js";
//#region src/logger/resolve.ts
var ALL_OFF = {
	provider: false,
	output: false,
	middleware: false,
	tools: false,
	agentLoop: false,
	config: false,
	errors: false,
	request: false,
	sandbox: false
};
var ALL_ON = {
	provider: true,
	output: true,
	middleware: true,
	tools: true,
	agentLoop: true,
	config: true,
	errors: true,
	request: true,
	sandbox: true
};
var errorsOnlyCategories = () => ({
	...ALL_OFF,
	errors: true
});
var resolveCategoriesFromPartial = (partial) => ({
	provider: partial.provider ?? true,
	output: partial.output ?? true,
	middleware: partial.middleware ?? true,
	tools: partial.tools ?? true,
	agentLoop: partial.agentLoop ?? true,
	config: partial.config ?? true,
	errors: partial.errors ?? true,
	request: partial.request ?? true,
	sandbox: partial.sandbox ?? true
});
/**
* Normalize a `DebugOption` into an `InternalLogger` ready to be threaded
* through the library's activities and adapters. See the `DebugOption`
* resolution table in the spec for the complete rules.
*
* - `undefined`: only the `errors` category is enabled; default `ConsoleLogger`.
* - `true`: all categories enabled; default `ConsoleLogger`.
* - `false`: all categories disabled (including `errors`); default `ConsoleLogger`.
* - `DebugConfig`: each unspecified category defaults to `true`; an optional
*   `logger` replaces the default `ConsoleLogger`.
*/
function resolveDebugOption(debug) {
	if (debug === void 0) return new InternalLogger(new ConsoleLogger(), errorsOnlyCategories());
	if (debug === true) return new InternalLogger(new ConsoleLogger(), ALL_ON);
	if (debug === false) return new InternalLogger(new ConsoleLogger(), ALL_OFF);
	const { logger, ...cats } = debug;
	const userLogger = logger ?? new ConsoleLogger();
	return new InternalLogger(userLogger, resolveCategoriesFromPartial(cats));
}
//#endregion
export { resolveDebugOption };

//# sourceMappingURL=resolve.js.map