import { DebugOption } from '../../logger/types.js';
import { GenerationMiddleware } from '../middleware/types.js';
import { AudioAdapter } from './adapter.js';
import { AudioGenerationResult, StreamChunk } from '../../types.js';
/** The adapter kind this activity handles */
export declare const kind: "audio";
/**
 * Extract provider options from an AudioAdapter via ~types.
 */
export type AudioProviderOptions<TAdapter> = TAdapter extends {
    '~types': {
        providerOptions: infer P extends object;
    };
} ? P : object;
/**
 * Options for the audio generation activity.
 * The model is extracted from the adapter's model property.
 *
 * @template TAdapter - The audio adapter type
 * @template TStream - Whether to stream the output
 */
export interface AudioActivityOptions<TAdapter extends AudioAdapter<string, AudioProviderOptions<TAdapter>>, TStream extends boolean = false> {
    /** The audio adapter to use (must be created with a model) */
    adapter: TAdapter & {
        kind: typeof kind;
    };
    /** Text description of the desired audio */
    prompt: string;
    /** Desired duration in seconds */
    duration?: number;
    /** Provider-specific options for audio generation */
    modelOptions?: AudioProviderOptions<TAdapter>;
    /**
     * Whether to stream the generation result.
     * When true, returns an AsyncIterable<StreamChunk> for streaming transport.
     * When false or not provided, returns a Promise<AudioGenerationResult>.
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
 * Result type for the audio generation activity.
 * - If stream is true: AsyncIterable<StreamChunk>
 * - Otherwise: Promise<AudioGenerationResult>
 */
export type AudioActivityResult<TStream extends boolean = false> = TStream extends true ? AsyncIterable<StreamChunk> : Promise<AudioGenerationResult>;
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
export declare function generateAudio<TAdapter extends AudioAdapter<string, AudioProviderOptions<TAdapter>>, TStream extends boolean = false>(options: AudioActivityOptions<TAdapter, TStream>): AudioActivityResult<TStream>;
/**
 * Create typed options for the generateAudio() function without executing.
 */
export declare function createAudioOptions<TAdapter extends AudioAdapter<string, AudioProviderOptions<TAdapter>>, TStream extends boolean = false>(options: AudioActivityOptions<TAdapter, TStream>): AudioActivityOptions<TAdapter, TStream>;
export type { AudioAdapter, AudioAdapterConfig, AnyAudioAdapter, } from './adapter.js';
export { BaseAudioAdapter } from './adapter.js';
