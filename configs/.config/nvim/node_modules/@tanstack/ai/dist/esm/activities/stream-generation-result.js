import { toRunErrorPayload } from "./error-payload.js";
import { normalizeStreamChunk } from "../utilities/normalize-stream-chunk.js";
import { EventType } from "@ag-ui/core";
//#region src/activities/stream-generation-result.ts
/**
* Internal helper for wrapping one-shot generation results as StreamChunk
* async iterables. NOT exported from the package — used only by activity
* implementations to support `stream: true`.
*/
function createId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
/**
* Persisted artifact refs a middleware may have attached to the result. Read
* defensively: the result shape is activity-specific and `artifacts` is only
* present when generation persistence is wired with an artifact + blob store.
*/
function artifactsFromResult(result) {
	if (typeof result !== "object" || result === null) return void 0;
	const artifacts = result.artifacts;
	return Array.isArray(artifacts) && artifacts.length > 0 ? artifacts : void 0;
}
/**
* Wrap a one-shot generation result as a StreamChunk async iterable.
*
* This allows non-streaming activities (image, speech, transcription, summarize)
* to be sent over the same streaming transport as chat.
*
* @param generator - An async function that performs the generation and returns the result
* @param options - Optional configuration (runId, threadId)
* @returns An AsyncIterable of StreamChunks with RUN_STARTED, CUSTOM(generation:result), and RUN_FINISHED events on success, or RUN_STARTED and RUN_ERROR on failure
*/
async function* streamGenerationResult(generator, options) {
	const runId = options?.runId ?? createId("run");
	const threadId = options?.threadId ?? createId("thread");
	yield {
		type: EventType.RUN_STARTED,
		runId,
		threadId,
		timestamp: Date.now()
	};
	try {
		const result = await generator({
			runId,
			threadId
		});
		const artifacts = artifactsFromResult(result);
		if (artifacts) yield {
			type: EventType.CUSTOM,
			name: "generation:artifacts",
			value: artifacts,
			timestamp: Date.now()
		};
		yield {
			type: EventType.CUSTOM,
			name: "generation:result",
			value: result,
			timestamp: Date.now()
		};
		yield* normalizeStreamChunk({
			type: EventType.RUN_FINISHED,
			runId,
			threadId,
			finishReason: "stop",
			timestamp: Date.now()
		});
	} catch (error) {
		const payload = toRunErrorPayload(error, "Generation failed");
		const codeFields = payload.code !== void 0 ? { code: payload.code } : void 0;
		yield* normalizeStreamChunk({
			type: EventType.RUN_ERROR,
			runId,
			threadId,
			message: payload.message,
			...codeFields,
			timestamp: Date.now()
		});
	}
}
//#endregion
export { streamGenerationResult };

//# sourceMappingURL=stream-generation-result.js.map