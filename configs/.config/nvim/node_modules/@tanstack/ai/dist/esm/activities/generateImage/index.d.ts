import { DebugOption } from '../../logger/types.js';
import { GenerationMiddleware } from '../middleware/types.js';
import { ImageAdapter } from './adapter.js';
import { ImageGenerationResult, MediaPrompt, MediaPromptFor, StreamChunk } from '../../types.js';
/** The adapter kind this activity handles */
export declare const kind: "image";
/**
 * Extract model-specific provider options from an ImageAdapter via ~types.
 * If the model has specific options defined in ModelProviderOptions (and not just via index signature),
 * use those; otherwise fall back to base provider options.
 */
export type ImageProviderOptionsForModel<TAdapter, TModel extends string> = TAdapter extends ImageAdapter<any, infer BaseOptions, infer ModelOptions, any> ? string extends keyof ModelOptions ? BaseOptions : TModel extends keyof ModelOptions ? ModelOptions[TModel] : BaseOptions : object;
/**
 * Extract model-specific size options from an ImageAdapter via ~types.
 * If the model has specific sizes defined, use those; otherwise fall back to string.
 */
export type ImageSizeForModel<TAdapter, TModel extends string> = TAdapter extends ImageAdapter<any, any, any, infer SizeByName> ? string extends keyof SizeByName ? string : TModel extends keyof SizeByName ? SizeByName[TModel] : string : string;
/**
 * Extract the prompt type a model accepts from an ImageAdapter via ~types.
 * Adapters declare a per-model input-modality map; models in the map get a
 * `prompt` narrowed to text + their supported part types (text-only models
 * accept `string | Array<TextPart>`), so unsupported media parts fail at
 * compile time. Adapters without a map fall back to the full MediaPrompt.
 */
export type ImagePromptForModel<TAdapter, TModel extends string> = TAdapter extends ImageAdapter<any, any, any, any, infer ModsByName> ? string extends keyof ModsByName ? MediaPrompt : TModel extends keyof ModsByName ? MediaPromptFor<ModsByName[TModel][number]> : MediaPrompt : MediaPrompt;
/**
 * Options for the image activity.
 * The model is extracted from the adapter's model property.
 *
 * @template TAdapter - The image adapter type
 * @template TStream - Whether to stream the output
 */
export type ImageActivityOptions<TAdapter extends ImageAdapter<string, any, any, any>, TStream extends boolean = false> = {
    /** The image adapter to use (must be created with a model) */
    adapter: TAdapter & {
        kind: typeof kind;
    };
    /**
     * Description of the desired image(s). Either a plain string, or — for
     * models that support image-conditioned generation — an ordered array of
     * content parts interleaving text with image inputs (image-to-image,
     * reference-guided, edit, multi-reference). Media parts may carry
     * `metadata.role` (`'reference' | 'mask' | 'control' | 'character'`) to
     * disambiguate intent. The accepted part types are narrowed per model via
     * the adapter's input-modality map.
     */
    prompt: ImagePromptForModel<TAdapter, TAdapter['model']>;
    /** Number of images to generate (default: 1) */
    numberOfImages?: number;
    /** Image size in WIDTHxHEIGHT format (e.g., "1024x1024") */
    size?: ImageSizeForModel<TAdapter, TAdapter['model']>;
    /**
     * Whether to stream the image generation result.
     * When true, returns an AsyncIterable<StreamChunk> for streaming transport.
     * When false or not provided, returns a Promise<ImageGenerationResult>.
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
} & ({} extends ImageProviderOptionsForModel<TAdapter, TAdapter['model']> ? {
    /** Provider-specific options for image generation */ modelOptions?: ImageProviderOptionsForModel<TAdapter, TAdapter['model']>;
} : {
    /** Provider-specific options for image generation */ modelOptions: ImageProviderOptionsForModel<TAdapter, TAdapter['model']>;
});
/**
 * Result type for the image activity.
 * - If stream is true: AsyncIterable<StreamChunk>
 * - Otherwise: Promise<ImageGenerationResult>
 */
export type ImageActivityResult<TStream extends boolean = false> = TStream extends true ? AsyncIterable<StreamChunk> : Promise<ImageGenerationResult>;
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
export declare function generateImage<TAdapter extends ImageAdapter<string, any, any, any>, TStream extends boolean = false>(options: ImageActivityOptions<TAdapter, TStream>): ImageActivityResult<TStream>;
/**
 * Create typed options for the generateImage() function without executing.
 */
export declare function createImageOptions<TAdapter extends ImageAdapter<string, any, any, any>, TStream extends boolean = false>(options: ImageActivityOptions<TAdapter, TStream>): ImageActivityOptions<TAdapter, TStream>;
export type { ImageAdapter, ImageAdapterConfig, AnyImageAdapter, } from './adapter.js';
export { BaseImageAdapter } from './adapter.js';
