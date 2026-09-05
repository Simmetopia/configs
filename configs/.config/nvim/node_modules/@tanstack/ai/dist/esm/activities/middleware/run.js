//#region src/activities/middleware/run.ts
/**
* Build the stable context for a single media-activity call.
*
* Media activities are always server-side and carry no user runtime context,
* so `source` is fixed to `'server'` and `context` to `undefined`.
*/
function createGenerationContext(args) {
	return {
		requestId: args.requestId,
		activity: args.activity,
		provider: args.provider,
		model: args.model,
		modelOptions: args.modelOptions,
		threadId: args.threadId,
		runId: args.runId,
		source: "server",
		createId: args.createId,
		context: void 0,
		resultTransforms: [],
		artifactInputs: args.artifactInputs
	};
}
/**
* Run a single lifecycle hook across each middleware in registration order,
* awaiting each. Exceptions PROPAGATE (matching `chat()` middleware) — a
* broken middleware fails the activity rather than being silently swallowed.
*/
async function run(middleware, invoke) {
	if (!middleware || middleware.length === 0) return;
	for (const mw of middleware) await invoke(mw);
}
function runGenerationStart(middleware, ctx) {
	return run(middleware, (mw) => mw.onStart?.(ctx));
}
function runGenerationUsage(middleware, ctx, usage) {
	return run(middleware, (mw) => mw.onUsage?.(ctx, usage));
}
function runGenerationFinish(middleware, ctx, info) {
	return run(middleware, (mw) => mw.onFinish?.(ctx, info));
}
function runGenerationAbort(middleware, ctx, info) {
	return run(middleware, (mw) => mw.onAbort?.(ctx, info));
}
function runGenerationError(middleware, ctx, info) {
	return run(middleware, (mw) => mw.onError?.(ctx, info));
}
/**
* Apply the result transforms middleware registered on the context, in order,
* to the raw adapter result. Each transform may return a replacement result or
* `undefined` to leave it unchanged. Runs after the adapter result exists and
* before the final result is returned or streamed.
*/
async function applyGenerationResultTransforms(ctx, result) {
	let current = result;
	const transformCtx = { middleware: ctx };
	for (const transform of ctx.resultTransforms ?? []) {
		const transformed = await transform(current, transformCtx);
		if (transformed !== void 0) current = transformed;
	}
	return current;
}
//#endregion
export { applyGenerationResultTransforms, createGenerationContext, runGenerationAbort, runGenerationError, runGenerationFinish, runGenerationStart, runGenerationUsage };

//# sourceMappingURL=run.js.map