import { DebugOption } from '../../logger/types.js';
import { GenerationMiddleware } from '../middleware/types.js';
import { VideoAdapter } from './adapter.js';
import { MediaPrompt, MediaPromptFor, PersistedArtifactRef, StreamChunk, TokenUsage, VideoJobResult, VideoStatusResult, VideoUrlResult } from '../../types.js';
/** The adapter kind this activity handles */
export declare const kind: "video";
/**
 * Extract provider options from a VideoAdapter via ~types.
 */
export type VideoProviderOptions<TAdapter> = TAdapter extends VideoAdapter<any, any, any, any, any, any> ? TAdapter['~types']['providerOptions'] : object;
/**
 * Extract the size type for a VideoAdapter's model via ~types.
 */
export type VideoSizeForAdapter<TAdapter> = TAdapter extends VideoAdapter<infer TModel, any, any, infer TSizeMap, any, any> ? TModel extends keyof TSizeMap ? TSizeMap[TModel] : string : string;
/**
 * Extract the prompt type a model accepts from a VideoAdapter via ~types.
 * Mirrors `ImagePromptForModel`: models in the adapter's input-modality map
 * get a `prompt` narrowed to text + their supported part types; adapters
 * without a map fall back to the full MediaPrompt.
 */
export type VideoPromptForAdapter<TAdapter> = TAdapter extends VideoAdapter<infer TModel, any, any, any, infer ModsByName, any> ? string extends keyof ModsByName ? MediaPrompt : TModel extends keyof ModsByName ? MediaPromptFor<ModsByName[TModel][number]> : MediaPrompt : MediaPrompt;
/**
 * Extract the duration type for a VideoAdapter's model via ~types.
 * Mirrors `VideoSizeForAdapter`. Falls back to `number` for adapters that
 * haven't declared per-model duration constraints.
 */
export type VideoDurationForAdapter<TAdapter> = TAdapter extends VideoAdapter<infer TModel, any, any, any, any, infer TDurationMap> ? TModel extends keyof TDurationMap ? TDurationMap[TModel] : number : number;
/**
 * Base options shared by all video activity operations.
 * The model is extracted from the adapter's model property.
 */
interface VideoActivityBaseOptions<TAdapter extends VideoAdapter<string, any, any, any, any, any>> {
    /** The video adapter to use (must be created with a model) */
    adapter: TAdapter & {
        kind: typeof kind;
    };
}
/**
 * Options for creating a new video generation job.
 * The model is extracted from the adapter's model property.
 *
 * @template TAdapter - The video adapter type
 * @template TStream - Whether to stream the output
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export type VideoCreateOptions<TAdapter extends VideoAdapter<string, any, any, any, any, any>, TStream extends boolean = false> = VideoActivityBaseOptions<TAdapter> & {
    /** Request type - create a new job (default if not specified) */
    request?: 'create';
    /**
     * Description of the desired video. Either a plain string, or — for models
     * that support image-conditioned generation — an ordered array of content
     * parts interleaving text with image inputs. Image parts may carry
     * `metadata.role` (`'start_frame' | 'end_frame' | 'reference' |
     * 'character'`) to disambiguate intent; positional fallback otherwise. The
     * accepted part types are narrowed per model via the adapter's
     * input-modality map.
     */
    prompt: VideoPromptForAdapter<TAdapter>;
    /** Video size — format depends on the provider (e.g., "16:9", "1280x720") */
    size?: VideoSizeForAdapter<TAdapter>;
    /**
     * Video duration in seconds. Adapters that declare a per-model duration
     * map narrow this to the model's valid union (e.g. `4 | 6 | 8` for Veo 3).
     * Pass `adapter.snapDuration(seconds)` to coerce raw seconds to a valid
     * value.
     */
    duration?: VideoDurationForAdapter<TAdapter>;
    /**
     * Whether to stream the video generation lifecycle.
     * When true, returns an AsyncIterable<StreamChunk> that handles the full
     * job lifecycle: create job, poll for status, yield updates, and yield final result.
     * When false or not provided, returns a Promise<VideoJobResult>.
     *
     * @default false
     */
    stream?: TStream;
    /** Polling interval in milliseconds (stream mode only). @default 2000 */
    pollingInterval?: number;
    /** Maximum time to wait before timing out in milliseconds (stream mode only). @default 600000 */
    maxDuration?: number;
    /**
     * Custom run id (stream mode only) — the id stamped on the emitted
     * `RUN_STARTED` / `RUN_FINISHED` chunks.
     *
     * IGNORED by a non-streaming submit. That run spans two calls, and its id is
     * derived from the provider's job instead, so {@link getVideoJobStatus} can
     * recompute it from the `jobId` you already have to poll with. Honoring a
     * custom id here would reintroduce the failure this avoids: a caller who set
     * it on the submit and forgot it on the poll would silently open a second
     * record while the first sat unfinished forever.
     */
    runId?: string;
    /**
     * Stable conversation/thread id for correlating this run when persisted.
     *
     * Also the `threadId` stamped on the emitted `RUN_STARTED` / `RUN_FINISHED`
     * chunks; when omitted a throwaway id is minted for those chunks only, and
     * the persisted run record carries NO thread link rather than a fabricated
     * one. Pass it whenever persistence is on — it is the slot a reloading client
     * hydrates by, so a run stored without it can only be fetched by run id.
     */
    threadId?: string;
    /**
     * Enable debug logging. Pass `true` to enable all categories, `false` to
     * silence everything including errors, or a `DebugConfig` object for granular
     * control and/or a custom `Logger`.
     */
    debug?: DebugOption;
    /**
     * Observe-only middleware notified on start, usage, success, and error. Pass
     * `otelMiddleware()` to emit OpenTelemetry spans, `withGenerationPersistence()`
     * to persist the run, or implement the `GenerationMiddleware` contract for a
     * custom backend.
     *
     * In streaming mode one run covers the full create→poll→complete lifecycle:
     * `onStart` at submission, a terminal `onFinish`/`onError` when the job
     * settles, and `onAbort` if the consumer abandons the stream.
     *
     * In NON-streaming mode the call only SUBMITS the job, so it only opens the
     * run: no terminal hook fires here, because the video does not exist yet.
     * Pass the same `middleware` and `threadId` to {@link getVideoJobStatus}; the
     * poll that observes a terminal job state finishes the run and is where the
     * result and its artifacts are recorded. Nothing else has to be threaded
     * through — both calls derive the run id from the provider's `jobId`, the one
     * id a poller cannot be missing.
     *
     * Because the job id only exists once the provider accepts the job, `onStart`
     * fires AFTER the submit request rather than before it — an observer's span
     * therefore covers the run from acceptance onward, not the submit round-trip.
     * A submission that FAILS has no job to key on, so it opens and immediately
     * fails a run under this call's `requestId`: the thread's latest run reports
     * the failure (a client hydrating the slot sees it) even though there is no
     * job to resume.
     */
    middleware?: Array<GenerationMiddleware>;
    /**
     * Maximum duration of this activity invocation in milliseconds.
     * No SDK-wide default — choose a value suitable for the provider and job.
     * Composed with {@link abortSignal}; the first abort wins.
     *
     * In stream mode this bounds the full create→poll→complete lifecycle and
     * complements {@link maxDuration} (which defaults to 10 minutes). When both
     * are set, the shorter limit wins via signal composition against the
     * polling deadline.
     */
    timeout?: number;
    /**
     * Caller cancellation signal (request disconnects, job/runtime cancellation).
     * Composed with {@link timeout} into an effective signal forwarded to the
     * adapter on job submission. Request-specific — not stored on global
     * provider client config.
     */
    abortSignal?: AbortSignal;
} & ({} extends VideoProviderOptions<TAdapter> ? {
    /** Provider-specific options for video generation */ modelOptions?: VideoProviderOptions<TAdapter>;
} : {
    /** Provider-specific options for video generation */ modelOptions: VideoProviderOptions<TAdapter>;
});
/**
 * Options for polling the status of a video generation job.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export interface VideoStatusOptions<TAdapter extends VideoAdapter<string, any, any, any, any, any>> extends VideoActivityBaseOptions<TAdapter> {
    /** Request type - get job status */
    request: 'status';
    /** The job ID to check status for */
    jobId: string;
}
/**
 * Options for getting the URL of a completed video.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export interface VideoUrlOptions<TAdapter extends VideoAdapter<string, any, any, any, any, any>> extends VideoActivityBaseOptions<TAdapter> {
    /** Request type - get video URL */
    request: 'url';
    /** The job ID to get URL for */
    jobId: string;
}
/**
 * Union type for all video activity options.
 * Discriminated by the `request` field.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export type VideoActivityOptions<TAdapter extends VideoAdapter<string, any, any, any, any, any>, TRequest extends 'create' | 'status' | 'url' = 'create', TStream extends boolean = false> = TRequest extends 'status' ? VideoStatusOptions<TAdapter> : TRequest extends 'url' ? VideoUrlOptions<TAdapter> : VideoCreateOptions<TAdapter, TStream>;
/**
 * Result type for the video activity, based on request type and streaming.
 * - If stream is true (create request): AsyncIterable<StreamChunk>
 * - Otherwise: Promise<VideoJobResult | VideoStatusResult | VideoUrlResult>
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export type VideoActivityResult<TRequest extends 'create' | 'status' | 'url' = 'create', TStream extends boolean = false> = TRequest extends 'status' ? Promise<VideoStatusResult> : TRequest extends 'url' ? Promise<VideoUrlResult> : TStream extends true ? AsyncIterable<StreamChunk> : Promise<VideoJobResult>;
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
export declare function generateVideo<TAdapter extends VideoAdapter<string, any, any, any, any, any>, TStream extends boolean = false>(options: VideoCreateOptions<TAdapter, TStream>): VideoActivityResult<'create', TStream>;
/**
 * Options for {@link getVideoJobStatus}.
 *
 * The run this poll finishes is identified by `adapter` + `jobId` alone — the
 * same pair the submitting `generateVideo()` call derived it from — so there is
 * no run id to thread through. Pass the submission's `threadId` and the same
 * `middleware`.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export interface VideoJobStatusOptions<TAdapter extends VideoAdapter<string, any, any, any, any, any>> {
    /** The video adapter to use (must be created with a model) */
    adapter: TAdapter & {
        kind: typeof kind;
    };
    /** The job ID to check status for */
    jobId: string;
    /**
     * The scope the run is filed under. Must match the submission's `threadId` —
     * generation persistence REFUSES a run without a scope (a run filed under
     * none can never be hydrated by one), so omitting it throws rather than
     * quietly filing the finished video somewhere unreachable.
     */
    threadId?: string;
    /**
     * Observe-only middleware. Hooks fire ONLY on the poll that observes a
     * terminal job state: `onStart` (resuming the submission's run), then the
     * result transforms — which is where persistence copies the video into a blob
     * store and rewrites `url` to a durable one, so the returned result carries
     * the same urls as the stored record — then `onFinish`, or `onError` when the
     * job failed. Intermediate polls invoke nothing, so a middleware is not
     * charged for the wait.
     */
    middleware?: Array<GenerationMiddleware>;
}
/**
 * The status of a video job, plus the video itself once the job completed.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export interface VideoJobStatusResult {
    /** Job identifier */
    jobId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    url?: string;
    /** When the provider url expires, if it reported one. */
    expiresAt?: Date;
    error?: string;
    usage?: TokenUsage;
    /** Durable artifact references, when generation persistence is wired. */
    artifacts?: Array<PersistedArtifactRef>;
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
export declare function getVideoJobStatus<TAdapter extends VideoAdapter<string, any, any, any, any, any>>(options: VideoJobStatusOptions<TAdapter>): Promise<VideoJobStatusResult>;
/**
 * Create typed options for the generateVideo() function without executing.
 */
export declare function createVideoOptions<TAdapter extends VideoAdapter<string, any, any, any, any, any>, TStream extends boolean = false>(options: VideoCreateOptions<TAdapter, TStream>): VideoCreateOptions<TAdapter, TStream>;
export type { VideoAdapter, VideoAdapterConfig, AnyVideoAdapter, } from './adapter.js';
export { BaseVideoAdapter } from './adapter.js';
