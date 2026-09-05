import { StreamChunk } from '../types.js';
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
export declare function streamGenerationResult<TResult>(generator: (resolved: {
    runId: string;
    threadId: string;
}) => Promise<TResult>, options?: {
    runId?: string;
    threadId?: string;
}): AsyncIterable<StreamChunk>;
