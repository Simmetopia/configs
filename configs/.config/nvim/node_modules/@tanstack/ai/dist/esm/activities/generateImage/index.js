import { resolveDebugOption } from "../../logger/resolve.js";
import { streamGenerationResult } from "../stream-generation-result.js";
import { applyGenerationResultTransforms, createGenerationContext, runGenerationAbort, runGenerationError, runGenerationFinish, runGenerationStart, runGenerationUsage } from "../middleware/run.js";
import { abortReasonMessage, createActivityAbortControls, isActivityAbortError, raceWithAbort } from "../../utilities/activity-abort.js";
import { resolveMediaPrompt } from "../../utilities/media-prompt.js";
import "./adapter.js";
import { aiEventClient } from "@tanstack/ai-event-client";
//#region src/activities/generateImage/index.ts
/**
* Image Activity
*
* Generates images from text prompts.
* This is a self-contained module with implementation, types, and JSDoc.
*/
/** The adapter kind this activity handles */
var kind = "image";
function createId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
/**
* Image activity - generates images from text prompts.
*
* Uses AI image generation models to create images based on natural language descriptions.
*
* @example Generate a single image
* ```ts
* import { generateImage } from '@tanstack/ai'
* import { openaiImage } from '@tanstack/ai-openai'
*
* const result = await generateImage({
*   adapter: openaiImage('dall-e-3'),
*   prompt: 'A serene mountain landscape at sunset'
* })
*
* console.log(result.images[0].url)
* ```
*
* @example Generate multiple images
* ```ts
* const result = await generateImage({
*   adapter: openaiImage('dall-e-2'),
*   prompt: 'A cute robot mascot',
*   numberOfImages: 4,
*   size: '512x512'
* })
*
* result.images.forEach((image, i) => {
*   console.log(`Image ${i + 1}: ${image.url}`)
* })
* ```
*
* @example With provider-specific options
* ```ts
* const result = await generateImage({
*   adapter: openaiImage('dall-e-3'),
*   prompt: 'A professional headshot photo',
*   size: '1024x1024',
*   modelOptions: {
*     quality: 'hd',
*     style: 'natural'
*   }
* })
* ```
*/
function generateImage(options) {
	if (options.stream) return streamGenerationResult((resolved) => runGenerateImage({
		...options,
		runId: resolved.runId
	}), options);
	return runGenerateImage(options);
}
/**
* Internal implementation of image generation (always non-streaming).
* Contains all devtools event emission logic.
*/
async function runGenerateImage(options) {
	const { adapter, stream: _stream, debug: _debug, middleware, threadId, runId, timeout, abortSignal: callerAbortSignal, ...rest } = options;
	const model = adapter.model;
	const requestId = createId("image");
	const startTime = Date.now();
	const logger = resolveDebugOption(options.debug);
	const abortControls = createActivityAbortControls({
		timeout,
		abortSignal: callerAbortSignal
	});
	const mwCtx = createGenerationContext({
		requestId,
		activity: "image",
		provider: adapter.name,
		model,
		modelOptions: rest.modelOptions,
		threadId,
		runId,
		artifactInputs: { prompt: rest.prompt },
		createId
	});
	await runGenerationStart(middleware, mwCtx);
	const resolved = resolveMediaPrompt(rest.prompt);
	aiEventClient.emit("image:request:started", {
		requestId,
		provider: adapter.name,
		model,
		prompt: resolved.text,
		numberOfImages: rest.numberOfImages,
		size: rest.size,
		...resolved.images.length > 0 && { imageInputCount: resolved.images.length },
		...resolved.videos.length > 0 && { videoInputCount: resolved.videos.length },
		...resolved.audios.length > 0 && { audioInputCount: resolved.audios.length },
		modelOptions: rest.modelOptions,
		timestamp: startTime
	});
	logger.request(`activity=generateImage provider=${adapter.name}`, {
		provider: adapter.name,
		model
	});
	try {
		const rawResult = await raceWithAbort(adapter.generateImages({
			...rest,
			model,
			logger,
			...abortControls.signal ? { abortSignal: abortControls.signal } : {}
		}), abortControls.signal);
		abortControls.clear();
		const result = await applyGenerationResultTransforms(mwCtx, rawResult);
		const duration = Date.now() - startTime;
		aiEventClient.emit("image:request:completed", {
			requestId,
			provider: adapter.name,
			model,
			images: result.images.map((image) => ({
				url: image.url,
				b64Json: image.b64Json
			})),
			duration,
			modelOptions: rest.modelOptions,
			timestamp: Date.now()
		});
		if (result.usage) aiEventClient.emit("image:usage", {
			requestId,
			model,
			usage: result.usage,
			modelOptions: rest.modelOptions,
			timestamp: Date.now()
		});
		logger.output(`activity=generateImage count=${result.images.length}`, { count: result.images.length });
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
		logger.errors("generateImage activity failed", {
			error,
			source: "generateImage"
		});
		throw error;
	}
}
/**
* Create typed options for the generateImage() function without executing.
*/
function createImageOptions(options) {
	return options;
}
//#endregion
export { createImageOptions, generateImage, kind };

//# sourceMappingURL=index.js.map