import { resolveDebugOption } from "../../logger/resolve.js";
import { streamGenerationResult } from "../stream-generation-result.js";
import { applyGenerationResultTransforms, createGenerationContext, runGenerationAbort, runGenerationError, runGenerationFinish, runGenerationStart, runGenerationUsage } from "../middleware/run.js";
import { abortReasonMessage, createActivityAbortControls, isActivityAbortError, raceWithAbort } from "../../utilities/activity-abort.js";
import "./adapter.js";
import { aiEventClient } from "@tanstack/ai-event-client";
//#region src/activities/generateAudio/index.ts
/**
* Audio Generation Activity
*
* Generates audio (music, sound effects, etc.) from text prompts.
* This is a self-contained module with implementation, types, and JSDoc.
*/
/** The adapter kind this activity handles */
var kind = "audio";
function createId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
/**
* Audio generation activity - generates audio from text prompts.
*
* Uses AI models to create music, sound effects, and other audio content.
*
* @example Generate music from a prompt
* ```ts
* import { generateAudio } from '@tanstack/ai'
* import { falAudio } from '@tanstack/ai-fal'
*
* const result = await generateAudio({
*   adapter: falAudio('fal-ai/diffrhythm'),
*   prompt: 'An upbeat electronic track with synths',
*   duration: 10
* })
*
* console.log(result.audio.url) // URL to generated audio
* ```
*/
function generateAudio(options) {
	if (options.stream) return streamGenerationResult((resolved) => runGenerateAudio({
		...options,
		runId: resolved.runId
	}), options);
	return runGenerateAudio(options);
}
/**
* Run the core audio generation logic (non-streaming).
*/
async function runGenerateAudio(options) {
	const { adapter, stream: _stream, debug: _debug, middleware, threadId, runId, timeout, abortSignal: callerAbortSignal, ...rest } = options;
	const model = adapter.model;
	const requestId = createId("audio");
	const startTime = Date.now();
	const logger = resolveDebugOption(options.debug);
	const abortControls = createActivityAbortControls({
		timeout,
		abortSignal: callerAbortSignal
	});
	const providerName = adapter.provider ?? adapter.name ?? "unknown";
	const mwCtx = createGenerationContext({
		requestId,
		activity: "audio",
		provider: adapter.name,
		model,
		modelOptions: rest.modelOptions,
		threadId,
		runId,
		artifactInputs: {
			prompt: rest.prompt,
			duration: rest.duration
		},
		createId
	});
	await runGenerationStart(middleware, mwCtx);
	aiEventClient.emit("audio:request:started", {
		requestId,
		provider: adapter.name,
		model,
		prompt: rest.prompt,
		duration: rest.duration,
		modelOptions: rest.modelOptions,
		timestamp: startTime
	});
	logger.request(`activity=generateAudio provider=${providerName}`, {
		provider: providerName,
		model
	});
	try {
		const rawResult = await raceWithAbort(adapter.generateAudio({
			...rest,
			model,
			logger,
			...abortControls.signal ? { abortSignal: abortControls.signal } : {}
		}), abortControls.signal);
		abortControls.clear();
		const result = await applyGenerationResultTransforms(mwCtx, rawResult);
		const elapsedMs = Date.now() - startTime;
		aiEventClient.emit("audio:request:completed", {
			requestId,
			provider: adapter.name,
			model,
			audio: result.audio,
			duration: elapsedMs,
			modelOptions: rest.modelOptions,
			timestamp: Date.now()
		});
		if (result.usage) aiEventClient.emit("audio:usage", {
			requestId,
			model,
			usage: result.usage,
			modelOptions: rest.modelOptions,
			timestamp: Date.now()
		});
		logger.output(`activity=generateAudio provider=${providerName}`, {
			contentType: result.audio.contentType,
			audioDuration: result.audio.duration
		});
		if (result.usage) await runGenerationUsage(middleware, mwCtx, result.usage);
		await runGenerationFinish(middleware, mwCtx, {
			duration: elapsedMs,
			usage: result.usage
		});
		return result;
	} catch (error) {
		abortControls.clear();
		const elapsedMs = Date.now() - startTime;
		const err = error;
		aiEventClient.emit("audio:request:error", {
			requestId,
			provider: adapter.name,
			model,
			error: {
				message: err.message,
				name: err.name
			},
			duration: elapsedMs,
			modelOptions: rest.modelOptions,
			timestamp: Date.now()
		});
		if (isActivityAbortError(error, abortControls.signal)) await runGenerationAbort(middleware, mwCtx, {
			reason: abortReasonMessage(error, abortControls.signal),
			duration: elapsedMs
		});
		else await runGenerationError(middleware, mwCtx, {
			error,
			duration: elapsedMs
		});
		logger.errors("generateAudio activity failed", {
			error,
			source: "generateAudio"
		});
		throw error;
	}
}
/**
* Create typed options for the generateAudio() function without executing.
*/
function createAudioOptions(options) {
	return options;
}
//#endregion
export { createAudioOptions, generateAudio, kind };

//# sourceMappingURL=index.js.map