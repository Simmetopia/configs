import { DebugOption } from '../../logger/types.js';
import { GenerationMiddleware } from '../middleware/types.js';
import { TranscriptionAdapter } from './adapter.js';
import { StreamChunk, TranscriptionResponseFormat, TranscriptionResult } from '../../types.js';
/** The adapter kind this activity handles */
export declare const kind: "transcription";
/**
 * Extract provider options from a TranscriptionAdapter via ~types.
 */
export type TranscriptionProviderOptions<TAdapter> = TAdapter extends {
    '~types': {
        providerOptions: infer P extends object;
    };
} ? P : object;
/**
 * Options for the transcription activity.
 * The model is extracted from the adapter's model property.
 *
 * @template TAdapter - The transcription adapter type
 * @template TStream - Whether to stream the output
 */
export interface TranscriptionActivityOptions<TAdapter extends TranscriptionAdapter<string, TranscriptionProviderOptions<TAdapter>>, TStream extends boolean = false> {
    /** The transcription adapter to use (must be created with a model) */
    adapter: TAdapter & {
        kind: typeof kind;
    };
    /** The audio data to transcribe - can be base64 string, File, Blob, or Buffer */
    audio: string | File | Blob | ArrayBuffer;
    /** The language of the audio in ISO-639-1 format (e.g., 'en') */
    language?: string;
    /** An optional prompt to guide the transcription */
    prompt?: string;
    /** The format of the transcription output */
    responseFormat?: TranscriptionResponseFormat;
    /** Provider-specific options for transcription */
    modelOptions?: TranscriptionProviderOptions<TAdapter>;
    /**
     * Whether to stream the transcription result.
     * When true, returns an AsyncIterable<StreamChunk> for streaming transport.
     * When false or not provided, returns a Promise<TranscriptionResult>.
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
    /**
     * Observe-only middleware notified on start, usage, success, and error. Pass
     * `otelMiddleware()` to emit OpenTelemetry spans, or implement the
     * `GenerationMiddleware` contract for a custom backend.
     */
    middleware?: Array<GenerationMiddleware>;
    /** Stable conversation/thread id for correlating this run when persisted. */
    threadId?: string;
    /** Stable run id for correlating this run when persisted. */
    runId?: string;
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
}
/**
 * Result type for the transcription activity.
 * - If stream is true: AsyncIterable<StreamChunk>
 * - Otherwise: Promise<TranscriptionResult>
 */
export type TranscriptionActivityResult<TStream extends boolean = false> = TStream extends true ? AsyncIterable<StreamChunk> : Promise<TranscriptionResult>;
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
export declare function generateTranscription<TAdapter extends TranscriptionAdapter<string, TranscriptionProviderOptions<TAdapter>>, TStream extends boolean = false>(options: TranscriptionActivityOptions<TAdapter, TStream>): TranscriptionActivityResult<TStream>;
/**
 * Create typed options for the generateTranscription() function without executing.
 */
export declare function createTranscriptionOptions<TAdapter extends TranscriptionAdapter<string, TranscriptionProviderOptions<TAdapter>>, TStream extends boolean = false>(options: TranscriptionActivityOptions<TAdapter, TStream>): TranscriptionActivityOptions<TAdapter, TStream>;
export type { TranscriptionAdapter, TranscriptionAdapterConfig, AnyTranscriptionAdapter, } from './adapter.js';
export { BaseTranscriptionAdapter } from './adapter.js';
