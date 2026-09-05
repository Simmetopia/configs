import { resolveDebugOption } from "../../logger/resolve.js";
import { streamGenerationResult } from "../stream-generation-result.js";
import { applyGenerationResultTransforms, createGenerationContext, runGenerationAbort, runGenerationError, runGenerationFinish, runGenerationStart, runGenerationUsage } from "../middleware/run.js";
import { abortReasonMessage, createActivityAbortControls, isActivityAbortError, raceWithAbort } from "../../utilities/activity-abort.js";
import "./adapter.js";
import "./chat-stream-summarize.js";
import { aiEventClient } from "@tanstack/ai-event-client";
//#region src/activities/summarize/index.ts
/**
* Summarize Activity
*
* Generates summaries from text input.
* This is a self-contained module with implementation, types, and JSDoc.
*/
/** The adapter kind this activity handles */
var kind = "summarize";
function createId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
/**
* Summarize activity - generates summaries from text.
*
* Supports both streaming and non-streaming modes.
*
* @example Basic summarization
* ```ts
* import { summarize } from '@tanstack/ai'
* import { openaiSummarize } from '@tanstack/ai-openai'
*
* const result = await summarize({
*   adapter: openaiSummarize('gpt-4o-mini'),
*   text: 'Long article text here...'
* })
*
* console.log(result.summary)
* ```
*
* @example Summarization with style
* ```ts
* const result = await summarize({
*   adapter: openaiSummarize('gpt-4o-mini'),
*   text: 'Long article text here...',
*   style: 'bullet-points',
*   maxLength: 100
* })
* ```
*
* @example Focused summarization
* ```ts
* const result = await summarize({
*   adapter: openaiSummarize('gpt-4o-mini'),
*   text: 'Long technical document...',
*   focus: ['key findings', 'methodology']
* })
* ```
*
* @example Streaming summarization
* ```ts
* for await (const chunk of summarize({
*   adapter: openaiSummarize('gpt-4o-mini'),
*   text: 'Long article text here...',
*   stream: true
* })) {
*   if (chunk.type === 'content') {
*     process.stdout.write(chunk.delta)
*   }
* }
* ```
*/
function summarize(options) {
	const { stream } = options;
	if (stream) return runStreamingSummarize(options);
	return runSummarize(options);
}
/**
* Run non-streaming summarization
*/
async function runSummarize(options) {
	const { adapter, text, maxLength, style, focus, modelOptions, middleware, timeout, abortSignal: callerAbortSignal } = options;
	const model = adapter.model;
	const requestId = createId("summarize");
	const inputLength = text.length;
	const startTime = Date.now();
	const logger = resolveDebugOption(options.debug);
	const abortControls = createActivityAbortControls({
		timeout,
		abortSignal: callerAbortSignal
	});
	const mwCtx = createGenerationContext({
		requestId,
		activity: "summarize",
		provider: adapter.name,
		model,
		modelOptions,
		threadId: options.threadId,
		runId: options.runId,
		createId
	});
	await runGenerationStart(middleware, mwCtx);
	aiEventClient.emit("summarize:request:started", {
		requestId,
		provider: adapter.name,
		model,
		inputLength,
		timestamp: startTime
	});
	logger.request(`activity=summarize provider=${adapter.name}`, {
		provider: adapter.name,
		model,
		inputLength
	});
	const summarizeOptions = {
		model,
		text,
		maxLength,
		style,
		focus,
		modelOptions,
		logger,
		...abortControls.signal ? { abortSignal: abortControls.signal } : {}
	};
	try {
		const rawResult = await raceWithAbort(adapter.summarize(summarizeOptions), abortControls.signal);
		abortControls.clear();
		const result = await applyGenerationResultTransforms(mwCtx, rawResult);
		const duration = Date.now() - startTime;
		const outputLength = result.summary.length;
		aiEventClient.emit("summarize:request:completed", {
			requestId,
			provider: adapter.name,
			model,
			inputLength,
			outputLength,
			duration,
			timestamp: Date.now()
		});
		logger.output(`activity=summarize length=${outputLength}`, {
			hasSummary: !!result.summary,
			outputLength
		});
		if (result.usage) await runGenerationUsage(middleware, mwCtx, result.usage);
		await runGenerationFinish(middleware, mwCtx, {
			duration,
			usage: result.usage
		});
		return result;
	} catch (error) {
		abortControls.clear();
		const duration = Date.now() - startTime;
		if (isActivityAbortError(error, abortControls.signal)) await runGenerationAbort(middleware, mwCtx, {
			reason: abortReasonMessage(error, abortControls.signal),
			duration
		});
		else await runGenerationError(middleware, mwCtx, {
			error,
			duration
		});
		logger.errors("summarize activity failed", {
			error,
			source: "summarize"
		});
		throw error;
	}
}
/** Read a `usage` off a transformed result without asserting its shape. */
function usageOf(result) {
	if (typeof result !== "object" || result === null) return void 0;
	const usage = result.usage;
	return typeof usage === "object" && usage !== null ? usage : void 0;
}
/**
* Run streaming summarization
* Uses the adapter's native streaming if available, otherwise falls back
* to non-streaming and yields the result as a single chunk.
*/
async function* runStreamingSummarize(options) {
	const { adapter, text, maxLength, style, focus, modelOptions, runId, threadId } = options;
	const model = adapter.model;
	const logger = resolveDebugOption(options.debug);
	logger.request(`activity=summarize provider=${adapter.name}`, {
		provider: adapter.name,
		model,
		stream: true
	});
	const summarizeOptions = {
		model,
		text,
		maxLength,
		style,
		focus,
		modelOptions,
		logger,
		...runId !== void 0 ? { runId } : {},
		...threadId !== void 0 ? { threadId } : {}
	};
	if (adapter.summarizeStream) {
		yield* runNativeSummarizeStream(options, adapter.summarizeStream(summarizeOptions), logger);
		return;
	}
	try {
		yield* streamGenerationResult((resolved) => runSummarize({
			...options,
			stream: false,
			runId: resolved.runId
		}), {
			...runId !== void 0 ? { runId } : {},
			...threadId !== void 0 ? { threadId } : {}
		});
	} catch (error) {
		logger.errors("summarize activity failed", {
			error,
			source: "summarize"
		});
		throw error;
	}
}
/**
* Drive an adapter's native `summarizeStream`, wiring the generation middleware
* around it.
*
* The adapter emits a terminal `generation:result` CUSTOM chunk carrying the
* assembled {@link SummarizationResult}; that is the one point where a result
* exists, so the transforms run there and the REWRITTEN result is what gets
* yielded — the client and the persisted run record then hold the same object.
* An adapter whose stream never emits one still finishes the run, just with no
* result recorded.
*/
async function* runNativeSummarizeStream(options, stream, logger) {
	const { adapter, middleware, modelOptions } = options;
	const mwCtx = createGenerationContext({
		requestId: createId("summarize"),
		activity: "summarize",
		provider: adapter.name,
		model: adapter.model,
		modelOptions,
		threadId: options.threadId,
		runId: options.runId,
		createId
	});
	await runGenerationStart(middleware, mwCtx);
	const startTime = Date.now();
	let settled = false;
	try {
		for await (const chunk of stream) {
			if (chunk.type === "CUSTOM" && chunk.name === "generation:result") {
				const result = await applyGenerationResultTransforms(mwCtx, chunk.value);
				const usage = usageOf(result);
				if (usage) await runGenerationUsage(middleware, mwCtx, usage);
				await runGenerationFinish(middleware, mwCtx, {
					duration: Date.now() - startTime,
					usage
				});
				settled = true;
				yield {
					...chunk,
					value: result
				};
				continue;
			}
			yield chunk;
		}
		if (!settled) {
			await runGenerationFinish(middleware, mwCtx, { duration: Date.now() - startTime });
			settled = true;
		}
	} catch (error) {
		settled = true;
		await runGenerationError(middleware, mwCtx, {
			error,
			duration: Date.now() - startTime
		});
		logger.errors("summarize activity failed", {
			error,
			source: "summarize"
		});
		throw error;
	} finally {
		if (!settled) await runGenerationAbort(middleware, mwCtx, {
			reason: "Summarize stream abandoned before completion",
			duration: Date.now() - startTime
		});
	}
}
/**
* Create typed options for the summarize() function without executing.
*/
function createSummarizeOptions(options) {
	return options;
}
//#endregion
export { createSummarizeOptions, kind, summarize };

//# sourceMappingURL=index.js.map