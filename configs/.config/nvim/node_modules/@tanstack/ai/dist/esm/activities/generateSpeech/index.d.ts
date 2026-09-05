import { DebugOption } from '../../logger/types.js';
import { GenerationMiddleware } from '../middleware/types.js';
import { TTSAdapter } from './adapter.js';
import { StreamChunk, TTSResult } from '../../types.js';
/** The adapter kind this activity handles */
export declare const kind: "tts";
/**
 * Extract provider options from a TTSAdapter via ~types.
 */
export type TTSProviderOptions<TAdapter> = TAdapter extends {
    '~types': {
        providerOptions: infer P extends object;
    };
} ? P : object;
/**
 * Options for the TTS activity.
 * The model is extracted from the adapter's model property.
 *
 * @template TAdapter - The TTS adapter type
 * @template TStream - Whether to stream the output
 */
export interface TTSActivityOptions<TAdapter extends TTSAdapter<string, TTSProviderOptions<TAdapter>>, TStream extends boolean = false> {
    /** The TTS adapter to use (must be created with a model) */
    adapter: TAdapter & {
        kind: typeof kind;
    };
    /** The text to convert to speech */
    text: string;
    /** The voice to use for generation */
    voice?: string;
    /** The output audio format */
    format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
    /** The speed of the generated audio (0.25 to 4.0) */
    speed?: number;
    /** Provider-specific options for TTS generation */
    modelOptions?: TTSProviderOptions<TAdapter>;
    /**
     * Whether to stream the generation result.
     * When true, returns an AsyncIterable<StreamChunk> for streaming transport.
     * When false or not provided, returns a Promise<TTSResult>.
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
 * Result type for the TTS activity.
 * - If stream is true: AsyncIterable<StreamChunk>
 * - Otherwise: Promise<TTSResult>
 */
export type TTSActivityResult<TStream extends boolean = false> = TStream extends true ? AsyncIterable<StreamChunk> : Promise<TTSResult>;
/**
 * TTS activity - generates speech from text.
 *
 * Uses AI text-to-speech models to create audio from natural language text.
 *
 * @example Generate speech from text
 * ```ts
 * import { generateSpeech } from '@tanstack/ai'
 * import { openaiSpeech } from '@tanstack/ai-openai'
 *
 * const result = await generateSpeech({
 *   adapter: openaiSpeech('tts-1-hd'),
 *   text: 'Hello, welcome to TanStack AI!',
 *   voice: 'nova'
 * })
 *
 * console.log(result.audio) // base64-encoded audio
 * ```
 *
 * @example With format and speed options
 * ```ts
 * const result = await generateSpeech({
 *   adapter: openaiSpeech('tts-1'),
 *   text: 'This is slower speech.',
 *   voice: 'alloy',
 *   format: 'wav',
 *   speed: 0.8
 * })
 * ```
 */
export declare function generateSpeech<TAdapter extends TTSAdapter<string, TTSProviderOptions<TAdapter>>, TStream extends boolean = false>(options: TTSActivityOptions<TAdapter, TStream>): TTSActivityResult<TStream>;
/**
 * Create typed options for the generateSpeech() function without executing.
 */
export declare function createSpeechOptions<TAdapter extends TTSAdapter<string, TTSProviderOptions<TAdapter>>, TStream extends boolean = false>(options: TTSActivityOptions<TAdapter, TStream>): TTSActivityOptions<TAdapter, TStream>;
export type { TTSAdapter, TTSAdapterConfig, AnyTTSAdapter } from './adapter.js';
export { BaseTTSAdapter } from './adapter.js';
