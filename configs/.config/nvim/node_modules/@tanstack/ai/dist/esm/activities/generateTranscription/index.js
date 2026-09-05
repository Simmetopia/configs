import { resolveDebugOption } from "../../logger/resolve.js";
import { streamGenerationResult } from "../stream-generation-result.js";
import { applyGenerationResultTransforms, createGenerationContext, runGenerationAbort, runGenerationError, runGenerationFinish, runGenerationStart, runGenerationUsage } from "../middleware/run.js";
import { abortReasonMessage, createActivityAbortControls, isActivityAbortError, raceWithAbort } from "../../utilities/activity-abort.js";
import "./adapter.js";
import { aiEventClient } from "@tanstack/ai-event-client";
//#region src/activities/generateTranscription/index.ts
/**
* Transcription Activity
*
* Transcribes audio to text using speech-to-text models.
* This is a self-contained module with implementation, types, and JSDoc.
*/
/** The adapter kind this activity handles */
var kind = "transcription";
function createId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
/**
* Transcription activity - converts audio to text.
*
* Uses AI speech-to-text models to transcribe audio content.
*
* @example Transcribe an audio file
* ```ts
* import { generateTranscription } from '@tanstack/ai'
* import { openaiTranscription } from '@tanstack/ai-openai'
*
* const result = await generateTranscription({
*   adapter: openaiTranscription('whisper-1'),
*   audio: audioFile, // File, Blob, or base64 string
*   language: 'en'
* })
*
* console.log(result.text)
* ```
*
* @example With verbose output for timestamps
* ```ts
* const result = await generateTranscription({
*   adapter: openaiTranscription('whisper-1'),
*   audio: audioFile,
*   responseFormat: 'verbose_json'
* })
*
* result.segments?.forEach(segment => {
*   console.log(`[${segment.start}s - ${segment.end}s]: ${segment.text}`)
* })
* ```
*
* @example Streaming transcription result
* ```ts
* for await (const chunk of generateTranscription({
*   adapter: openaiTranscription('whisper-1'),
*   audio: audioFile,
*   stream: true
* })) {
*   console.log(chunk)
* }
* ```
*/
function generateTranscription(options) {
	if (options.stream) return streamGenerationResult((resolved) => runGenerateTranscription({
		...options,
		runId: resolved.runId
	}), options);
	return runGenerateTranscription(options);
}
/**
* Run non-streaming transcription
*/
async function runGenerateTranscription(options) {
	const { adapter, stream: _stream, debug: _debug, middleware, threadId, runId, timeout, abortSignal: callerAbortSignal, ...rest } = options;
	const model = adapter.model;
	const requestId = createId("transcription");
	const startTime = Date.now();
	const logger = resolveDebugOption(options.debug);
	const abortControls = createActivityAbortControls({
		timeout,
		abortSignal: callerAbortSignal
	});
	const providerName = adapter.provider ?? adapter.name ?? "unknown";
	const mwCtx = createGenerationContext({
		requestId,
		activity: "transcription",
		provider: adapter.name,
		model,
		modelOptions: rest.modelOptions,
		artifactInputs: {
			audio: rest.audio,
			language: rest.language,
			prompt: rest.prompt,
			responseFormat: rest.responseFormat
		},
		threadId,
		runId,
		createId
	});
	await runGenerationStart(middleware, mwCtx);
	aiEventClient.emit("transcription:request:started", {
		requestId,
		provider: adapter.name,
		model,
		language: rest.language,
		prompt: rest.prompt,
		responseFormat: rest.responseFormat,
		modelOptions: rest.modelOptions,
		timestamp: startTime
	});
	logger.request(`activity=generateTranscription provider=${providerName}`, {
		provider: providerName,
		model
	});
	try {
		const rawResult = await raceWithAbort(adapter.transcribe({
			...rest,
			model,
			logger,
			...abortControls.signal ? { abortSignal: abortControls.signal } : {}
		}), abortControls.signal);
		abortControls.clear();
		const result = await applyGenerationResultTransforms(mwCtx, rawResult);
		const duration = Date.now() - startTime;
		aiEventClient.emit("transcription:request:completed", {
			requestId,
			provider: adapter.name,
			model,
			text: result.text,
			language: result.language,
			duration,
			modelOptions: rest.modelOptions,
			timestamp: Date.now()
		});
		logger.output(`activity=generateTranscription length=${result.text.length}`, { hasText: !!result.text });
		if (result.usage) await runGenerationUsage(middleware, mwCtx, result.usage);
		await runGenerationFinish(middleware, mwCtx, {
			duration,
			usage: result.usage
		});
		return result;
	} catch (error) {
		abortControls.clear();
		const duration = Date.now() - startTime;
		const err = error;
		aiEventClient.emit("transcription:request:error", {
			requestId,
			provider: adapter.name,
			model,
			error: {
				message: err.message,
				name: err.name
			},
			duration,
			modelOptions: rest.modelOptions,
			timestamp: Date.now()
		});
		if (isActivityAbortError(error, abortControls.signal)) await runGenerationAbort(middleware, mwCtx, {
			reason: abortReasonMessage(error, abortControls.signal),
			duration
		});
		else await runGenerationError(middleware, mwCtx, {
			error,
			duration
		});
		logger.errors("generateTranscription activity failed", {
			error,
			source: "generateTranscription"
		});
		throw error;
	}
}
/**
* Create typed options for the generateTranscription() function without executing.
*/
function createTranscriptionOptions(options) {
	return options;
}
//#endregion
export { createTranscriptionOptions, generateTranscription, kind };

//# sourceMappingURL=index.js.map