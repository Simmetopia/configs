import { toRunErrorPayload } from "../error-payload.js";
import { normalizeStreamChunk } from "../../utilities/normalize-stream-chunk.js";
import { resolveDebugOption } from "../../logger/resolve.js";
import { applyGenerationResultTransforms, createGenerationContext, runGenerationAbort, runGenerationError, runGenerationFinish, runGenerationStart, runGenerationUsage } from "../middleware/run.js";
import { abortReasonMessage, createActivityAbortControls, isActivityAbortError, raceWithAbort, toAbortError } from "../../utilities/activity-abort.js";
import "./adapter.js";
import { aiEventClient } from "@tanstack/ai-event-client";
//#region src/activities/generateVideo/index.ts
/**
* Video Activity (Experimental)
*
* Generates videos from text prompts using a jobs/polling architecture.
* This is a self-contained module with implementation, types, and JSDoc.
*
* @experimental Video generation is an experimental feature and may change.
*/
/** The adapter kind this activity handles */
var kind = "video";
function createId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
/**
* Generate video - creates a video generation job from a text prompt.
*
* Uses AI video generation models to create videos based on natural language descriptions.
* Unlike image generation, video generation is asynchronous and requires polling for completion.
*
* When `stream: true` is passed, handles the full job lifecycle automatically:
* create job → poll for status → stream updates → yield final result.
*
* @experimental Video generation is an experimental feature and may change.
*
* @example Create a video generation job
* ```ts
* import { generateVideo, getVideoJobStatus } from '@tanstack/ai'
* import { openaiVideo } from '@tanstack/ai-openai'
*
* // Start a video generation job
* const { jobId } = await generateVideo({
*   adapter: openaiVideo('sora-2'),
*   prompt: 'A cat chasing a dog in a sunny park'
* })
*
* console.log('Job started:', jobId)
*
* // The submission only OPENS the run; the poll that sees a terminal state is
* // what completes it. The `jobId` is the whole correlation — pass the same
* // `middleware` and `threadId` when you use them.
* const status = await getVideoJobStatus({
*   adapter: openaiVideo('sora-2'),
*   jobId,
* })
* ```
*
* @example Stream the full video generation lifecycle
* ```ts
* import { generateVideo, toServerSentEventsResponse } from '@tanstack/ai'
* import { openaiVideo } from '@tanstack/ai-openai'
*
* const stream = generateVideo({
*   adapter: openaiVideo('sora-2'),
*   prompt: 'A cat chasing a dog in a sunny park',
*   stream: true,
*   pollingInterval: 3000,
* })
*
* return toServerSentEventsResponse(stream)
* ```
*/
function generateVideo(options) {
	if (options.stream) return runStreamingVideoGeneration(options);
	return runCreateVideoJob(options);
}
/**
* The run id a non-streaming video job is filed under, derived from the
* provider job itself.
*
* A submit-and-poll run spans two calls in two different requests, so the two
* halves need to agree on an id. Deriving it from the `jobId` — the one id a
* poller structurally cannot be missing, because it cannot poll without it —
* means no correlation state has to survive the boundary and there is no
* "forgot to pass the run id" failure to document. The provider is part of the
* key so two providers' job-id spaces cannot collide, and both halves are
* percent-encoded so the joined string stays unambiguous (and url-safe, since
* run ids end up in storage keys and query strings).
*/
function videoRunIdForJob(provider, jobId) {
	return `video:${encodeURIComponent(provider)}:${encodeURIComponent(jobId)}`;
}
/**
* Internal implementation of non-streaming video job creation.
*
* Submitting a job OPENS a run, it does not complete one: the video does not
* exist yet, and the bytes only appear on a later poll. So this fires `onStart`
* and runs the result transforms over the submission result — the jobId lands
* on the run record, which is what lets a later request resume polling — but
* fires NO terminal hook. {@link getVideoJobStatus} finishes the run when the
* job settles, keyed on the same derived id.
*
* `onStart` therefore runs AFTER the submit request: the run's id comes from
* the job, which does not exist until the provider accepts it. A submission
* that fails has no job, so it opens and immediately fails a run under this
* call's `requestId` — terminal and unresumable by construction, but it puts
* the failure where a client hydrating the thread will see it instead of
* showing nothing.
*/
async function runCreateVideoJob(options) {
	const { adapter, prompt, size, duration, modelOptions, middleware, timeout, abortSignal: callerAbortSignal } = options;
	const model = adapter.model;
	const requestId = createId("video");
	const startTime = Date.now();
	const logger = resolveDebugOption(options.debug);
	const abortControls = createActivityAbortControls({
		timeout,
		abortSignal: callerAbortSignal
	});
	const providerName = adapter.provider ?? adapter.name ?? "unknown";
	const contextFor = (runId) => createGenerationContext({
		requestId,
		activity: "video",
		provider: adapter.name,
		model,
		modelOptions,
		threadId: options.threadId,
		runId,
		artifactInputs: { prompt },
		createId
	});
	logger.request(`activity=generateVideo provider=${providerName}`, {
		provider: providerName,
		model
	});
	let jobResult;
	try {
		jobResult = await raceWithAbort(adapter.createVideoJob({
			model,
			prompt,
			size,
			duration,
			modelOptions,
			logger,
			...abortControls.signal ? { abortSignal: abortControls.signal } : {}
		}), abortControls.signal);
		abortControls.clear();
	} catch (error) {
		abortControls.clear();
		const failedCtx = contextFor();
		await runGenerationStart(middleware, failedCtx);
		const elapsed = Date.now() - startTime;
		if (isActivityAbortError(error, abortControls.signal)) await runGenerationAbort(middleware, failedCtx, {
			reason: abortReasonMessage(error, abortControls.signal),
			duration: elapsed
		});
		else await runGenerationError(middleware, failedCtx, {
			error,
			duration: elapsed
		});
		logger.errors("generateVideo activity failed", {
			error,
			source: "generateVideo"
		});
		throw error;
	}
	logger.output(`activity=generateVideo jobId=${jobResult.jobId}`, {
		jobId: jobResult.jobId,
		model: jobResult.model
	});
	const mwCtx = contextFor(videoRunIdForJob(adapter.name, jobResult.jobId));
	await runGenerationStart(middleware, mwCtx);
	return await applyGenerationResultTransforms(mwCtx, jobResult);
}
function sleep(ms, signal) {
	if (!signal) return new Promise((resolve) => setTimeout(resolve, ms));
	if (signal.aborted) return Promise.reject(toAbortError(signal.reason));
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			signal.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			signal.removeEventListener("abort", onAbort);
			reject(toAbortError(signal.reason));
		};
		signal.addEventListener("abort", onAbort, { once: true });
	});
}
/**
* Internal streaming implementation for video generation.
* Handles the full job lifecycle: create job → poll for status → stream updates → yield final result.
*/
async function* runStreamingVideoGeneration(options) {
	const { adapter, prompt, size, duration, modelOptions, middleware, timeout, abortSignal: callerAbortSignal } = options;
	const model = adapter.model;
	const runId = options.runId ?? createId("run");
	const requestId = createId("video");
	const obsStartTime = Date.now();
	const pollingInterval = options.pollingInterval ?? 2e3;
	const maxDuration = options.maxDuration ?? 6e5;
	const logger = resolveDebugOption(options.debug);
	const abortControls = createActivityAbortControls({
		timeout,
		abortSignal: callerAbortSignal
	});
	const providerName = adapter.provider ?? adapter.name ?? "unknown";
	const wireThreadId = options.threadId ?? createId("thread");
	yield {
		type: "RUN_STARTED",
		runId,
		threadId: wireThreadId,
		timestamp: Date.now()
	};
	const mwCtx = createGenerationContext({
		requestId,
		activity: "video",
		provider: adapter.name,
		model,
		modelOptions,
		threadId: options.threadId,
		runId,
		artifactInputs: { prompt },
		createId
	});
	await runGenerationStart(middleware, mwCtx);
	logger.request(`activity=generateVideo provider=${providerName} stream=true`, {
		provider: providerName,
		model
	});
	let settled = false;
	try {
		const jobResult = await raceWithAbort(adapter.createVideoJob({
			model,
			prompt,
			size,
			duration,
			modelOptions,
			logger,
			...abortControls.signal ? { abortSignal: abortControls.signal } : {}
		}), abortControls.signal);
		yield {
			type: "CUSTOM",
			name: "video:job:created",
			value: { jobId: jobResult.jobId },
			timestamp: Date.now()
		};
		const startTime = Date.now();
		while (Date.now() - startTime < maxDuration) {
			await sleep(pollingInterval, abortControls.signal);
			const statusResult = await adapter.getVideoStatus(jobResult.jobId);
			yield {
				type: "CUSTOM",
				name: "video:status",
				value: {
					jobId: jobResult.jobId,
					status: statusResult.status,
					progress: statusResult.progress,
					error: statusResult.error
				},
				timestamp: Date.now()
			};
			if (statusResult.status === "completed") {
				const urlResult = await adapter.getVideoUrl(jobResult.jobId);
				logger.output(`activity=generateVideo jobId=${jobResult.jobId} status=completed`, {
					jobId: jobResult.jobId,
					url: urlResult.url
				});
				const rawResult = {
					jobId: jobResult.jobId,
					status: "completed",
					url: urlResult.url,
					expiresAt: urlResult.expiresAt,
					...urlResult.usage ? { usage: urlResult.usage } : {}
				};
				const result = await applyGenerationResultTransforms(mwCtx, rawResult);
				if (urlResult.usage) await runGenerationUsage(middleware, mwCtx, urlResult.usage);
				await runGenerationFinish(middleware, mwCtx, {
					duration: Date.now() - obsStartTime,
					usage: urlResult.usage
				});
				settled = true;
				abortControls.clear();
				yield {
					type: "CUSTOM",
					name: "generation:result",
					value: result,
					timestamp: Date.now()
				};
				yield* normalizeStreamChunk({
					type: "RUN_FINISHED",
					runId,
					threadId: wireThreadId,
					finishReason: "stop",
					timestamp: Date.now()
				});
				return;
			}
			if (statusResult.status === "failed") throw new Error(statusResult.error || "Video generation failed");
		}
		throw new Error("Video generation timed out");
	} catch (error) {
		abortControls.clear();
		const payload = toRunErrorPayload(error, "Video generation failed");
		settled = true;
		const elapsed = Date.now() - obsStartTime;
		if (isActivityAbortError(error, abortControls.signal)) await runGenerationAbort(middleware, mwCtx, {
			reason: abortReasonMessage(error, abortControls.signal),
			duration: elapsed
		});
		else await runGenerationError(middleware, mwCtx, {
			error,
			duration: elapsed
		});
		logger.errors("generateVideo activity failed", {
			message: payload.message,
			code: payload.code,
			source: "generateVideo"
		});
		yield* normalizeStreamChunk({
			type: "RUN_ERROR",
			runId,
			threadId: wireThreadId,
			message: payload.message,
			...payload.code !== void 0 ? { code: payload.code } : {},
			timestamp: Date.now()
		});
	} finally {
		abortControls.clear();
		if (!settled) await runGenerationAbort(middleware, mwCtx, {
			reason: "Video generation stream abandoned before completion",
			duration: Date.now() - obsStartTime
		});
	}
}
/**
* Get video job status - returns the current status, progress, and URL if available.
*
* This function combines status checking and URL retrieval. If the job is completed,
* it will automatically fetch and include the video URL.
*
* It is also where a non-streaming `generateVideo()` run ENDS: pass the same
* `middleware` and `threadId`, and the poll that first sees a terminal job state
* finishes the run (recording the result and its artifacts) or fails it. The run
* is identified by `adapter` + `jobId`, exactly what the submission derived it
* from, so there is nothing else to carry between the two calls.
*
* @experimental Video generation is an experimental feature and may change.
*
* @example Check job status
* ```ts
* import { getVideoJobStatus } from '@tanstack/ai'
* import { openaiVideo } from '@tanstack/ai-openai'
*
* const result = await getVideoJobStatus({
*   adapter: openaiVideo('sora-2'),
*   jobId: 'job-123'
* })
*
* console.log('Status:', result.status)
* console.log('Progress:', result.progress)
* if (result.url) {
*   console.log('Video URL:', result.url)
* }
* ```
*
* @example Submit and poll one persisted run
* ```ts
* import { generateVideo, getVideoJobStatus } from '@tanstack/ai'
* import { withGenerationPersistence } from '@tanstack/ai-persistence'
* import { openaiVideo } from '@tanstack/ai-openai'
*
* const adapter = openaiVideo('sora-2')
* const middleware = [withGenerationPersistence(persistence)]
*
* // Opens the run (status `running`, jobId recorded). Its run id is derived
* // from the provider job, so nothing has to be stored to resume it.
* const { jobId } = await generateVideo({
*   adapter,
*   prompt: 'A cat chasing a dog in a sunny park',
*   threadId,
*   middleware,
* })
*
* // Completes the SAME run once the job settles — this is what writes the
* // video, its artifacts, and the terminal status. Works from a different
* // request or process: the jobId is the only correlation.
* const status = await getVideoJobStatus({
*   adapter,
*   jobId,
*   threadId,
*   middleware,
* })
* ```
*/
async function getVideoJobStatus(options) {
	const { adapter, jobId, middleware } = options;
	const requestId = createId("video-status");
	const startTime = Date.now();
	const terminalContext = () => createGenerationContext({
		requestId,
		activity: "video",
		provider: adapter.name,
		model: adapter.model,
		threadId: options.threadId,
		runId: videoRunIdForJob(adapter.name, jobId),
		createId
	});
	aiEventClient.emit("video:request:started", {
		requestId,
		provider: adapter.name,
		model: adapter.model,
		requestType: "status",
		jobId,
		timestamp: startTime
	});
	const statusResult = await adapter.getVideoStatus(jobId);
	if (statusResult.status === "completed") {
		let urlResult;
		try {
			urlResult = await adapter.getVideoUrl(jobId);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Failed to get video URL";
			aiEventClient.emit("video:request:completed", {
				requestId,
				provider: adapter.name,
				model: adapter.model,
				requestType: "status",
				jobId,
				status: "failed",
				progress: statusResult.progress,
				error: errorMessage,
				duration: Date.now() - startTime,
				timestamp: Date.now()
			});
			await runGenerationError(middleware, terminalContext(), {
				error,
				duration: Date.now() - startTime
			});
			return {
				jobId,
				status: "failed",
				progress: statusResult.progress,
				error: errorMessage
			};
		}
		aiEventClient.emit("video:request:completed", {
			requestId,
			provider: adapter.name,
			model: adapter.model,
			requestType: "status",
			jobId,
			status: statusResult.status,
			progress: statusResult.progress,
			url: urlResult.url,
			duration: Date.now() - startTime,
			timestamp: Date.now()
		});
		if (urlResult.usage) aiEventClient.emit("video:usage", {
			requestId,
			model: adapter.model,
			usage: urlResult.usage,
			timestamp: Date.now()
		});
		const mwCtx = terminalContext();
		await runGenerationStart(middleware, mwCtx);
		const result = await applyGenerationResultTransforms(mwCtx, {
			jobId,
			status: "completed",
			...statusResult.progress !== void 0 ? { progress: statusResult.progress } : {},
			url: urlResult.url,
			...urlResult.expiresAt ? { expiresAt: urlResult.expiresAt } : {},
			...urlResult.usage ? { usage: urlResult.usage } : {}
		});
		if (urlResult.usage) await runGenerationUsage(middleware, mwCtx, urlResult.usage);
		await runGenerationFinish(middleware, mwCtx, {
			duration: Date.now() - startTime,
			usage: urlResult.usage
		});
		return result;
	}
	aiEventClient.emit("video:request:completed", {
		requestId,
		provider: adapter.name,
		model: adapter.model,
		requestType: "status",
		jobId,
		status: statusResult.status,
		progress: statusResult.progress,
		error: statusResult.error,
		duration: Date.now() - startTime,
		timestamp: Date.now()
	});
	if (statusResult.status === "failed") await runGenerationError(middleware, terminalContext(), {
		error: new Error(statusResult.error || "Video generation failed"),
		duration: Date.now() - startTime
	});
	return {
		jobId,
		status: statusResult.status,
		progress: statusResult.progress,
		error: statusResult.error
	};
}
/**
* Create typed options for the generateVideo() function without executing.
*/
function createVideoOptions(options) {
	return options;
}
//#endregion
export { createVideoOptions, generateVideo, getVideoJobStatus, kind };

//# sourceMappingURL=index.js.map