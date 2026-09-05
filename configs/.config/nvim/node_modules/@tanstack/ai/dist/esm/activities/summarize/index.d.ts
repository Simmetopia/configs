import { DebugOption } from '../../logger/types.js';
import { GenerationMiddleware } from '../middleware/types.js';
import { SummarizeAdapter } from './adapter.js';
import { StreamChunk, SummarizationResult } from '../../types.js';
/** The adapter kind this activity handles */
export declare const kind: "summarize";
/** Extract provider options from a SummarizeAdapter via ~types */
export type SummarizeProviderOptions<TAdapter> = TAdapter extends {
    '~types': {
        providerOptions: infer P extends object;
    };
} ? P : object;
/**
 * Options for the summarize activity.
 * The model is extracted from the adapter's model property.
 *
 * @template TAdapter - The summarize adapter type
 * @template TStream - Whether to stream the output
 */
export interface SummarizeActivityOptions<TAdapter extends SummarizeAdapter<string, object>, TStream extends boolean = false> {
    /** The summarize adapter to use (must be created with a model) */
    adapter: TAdapter & {
        kind: typeof kind;
    };
    /** The text to summarize */
    text: string;
    /** Maximum length of the summary (in words or characters, provider-dependent) */
    maxLength?: number;
    /** Style of summary to generate */
    style?: 'bullet-points' | 'paragraph' | 'concise';
    /** Topics or aspects to focus on in the summary */
    focus?: Array<string>;
    /** Provider-specific options */
    modelOptions?: SummarizeProviderOptions<TAdapter>;
    /**
     * Optional run identity. When set on a streaming summarize, it is stamped
     * onto the emitted `RUN_STARTED` so a delivery-durable route keys the run's
     * log by the same id the client rejoins with — making a mid-run reload
     * resumable. Filed under `threadId` when persistence is wired.
     */
    runId?: string;
    /**
     * Stable conversation/thread id for correlating this run when persisted — the
     * slot a reloading client hydrates the last summary by. Pass it whenever
     * persistence is on; `withGenerationPersistence` refuses a run without one.
     */
    threadId?: string;
    /**
     * Observe-only middleware notified on start, usage, success, and error. Pass
     * `otelMiddleware()` for OpenTelemetry, `withGenerationPersistence()` to
     * record the run (summaries are text, so the run record holds the result and
     * there are no artifacts to store), or implement the `GenerationMiddleware`
     * contract for a custom backend.
     *
     * Streaming and non-streaming behave the same way: one `onStart`, then a
     * terminal `onFinish` / `onError`, with the result transforms applied to the
     * `SummarizationResult` in between. A streaming consumer that disconnects
     * mid-summary fires `onAbort`.
     */
    middleware?: Array<GenerationMiddleware>;
    /**
     * Maximum duration of this activity invocation in milliseconds.
     * No SDK-wide default — choose a value suitable for the provider and job.
     * Composed with {@link abortSignal}; the first abort wins.
     */
    timeout?: number;
    /**
     * Caller cancellation signal (request disconnects, job/runtime cancellation).
     * Composed with {@link timeout} into an effective signal forwarded to the
     * adapter. Request-specific — not stored on global provider client config.
     */
    abortSignal?: AbortSignal;
    /**
     * Whether to stream the summarization result.
     * When true, returns an AsyncIterable<StreamChunk> for streaming output.
     * When false or not provided, returns a Promise<SummarizationResult>.
     *
     * @default false
     */
    stream?: TStream;
    /**
     * Enable debug logging. Pass `true` to enable all categories, `false` to
     * silence everything including errors, or a `DebugConfig` object for granular
     * control and/or a custom `Logger`.
     */
    debug?: DebugOption;
}
/**
 * Result type for the summarize activity.
 * - If stream is true: AsyncIterable<StreamChunk>
 * - Otherwise: Promise<SummarizationResult>
 */
export type SummarizeActivityResult<TStream extends boolean> = TStream extends true ? AsyncIterable<StreamChunk> : Promise<SummarizationResult>;
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
export declare function summarize<TAdapter extends SummarizeAdapter<string, object>, TStream extends boolean = false>(options: SummarizeActivityOptions<TAdapter, TStream>): SummarizeActivityResult<TStream>;
/**
 * Create typed options for the summarize() function without executing.
 */
export declare function createSummarizeOptions<TAdapter extends SummarizeAdapter<string, object>, TStream extends boolean = false>(options: SummarizeActivityOptions<TAdapter, TStream>): SummarizeActivityOptions<TAdapter, TStream>;
export type { SummarizeAdapter, SummarizeAdapterConfig, AnySummarizeAdapter, } from './adapter.js';
export { BaseSummarizeAdapter } from './adapter.js';
export { ChatStreamSummarizeAdapter, type ChatStreamCapable, type InferTextProviderOptions, } from './chat-stream-summarize.js';
