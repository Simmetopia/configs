import { DebugOption } from '../../logger/types.js';
import { GenerationMiddleware } from '../middleware/types.js';
import { EmbeddingAdapter } from './adapter.js';
import { EmbeddingInputItem, EmbeddingInputItemFor, EmbeddingResult } from '../../types.js';
/** The adapter kind this activity handles */
export declare const kind: "embedding";
/**
 * Extract model-specific provider options from an EmbeddingAdapter via ~types.
 * If the model has specific options defined in ModelProviderOptions (and not just via index signature),
 * use those; otherwise fall back to base provider options.
 */
export type EmbedProviderOptionsForModel<TAdapter, TModel extends string> = TAdapter extends EmbeddingAdapter<any, infer BaseOptions, infer ModelOptions, any> ? string extends keyof ModelOptions ? BaseOptions : TModel extends keyof ModelOptions ? ModelOptions[TModel] : BaseOptions : object;
/**
 * Extract the input type a model accepts from an EmbeddingAdapter via ~types.
 * Adapters declare a per-model input-modality map; models in the map get an
 * `input` narrowed to their supported item types (text-only models accept
 * `string | TextPart`), so unsupported items fail at compile time. Adapters
 * without a map fall back to the full EmbeddingInputItem union.
 */
export type EmbeddingInputForModel<TAdapter, TModel extends string> = TAdapter extends EmbeddingAdapter<any, any, any, infer ModsByName> ? string extends keyof ModsByName ? // No explicit map - accept the full union
EmbeddingInputItem | Array<EmbeddingInputItem> : TModel extends keyof ModsByName ? EmbeddingInputItemFor<ModsByName[TModel][number]> | Array<EmbeddingInputItemFor<ModsByName[TModel][number]>> : EmbeddingInputItem | Array<EmbeddingInputItem> : EmbeddingInputItem | Array<EmbeddingInputItem>;
/**
 * Options for the embed activity.
 * The model is extracted from the adapter's model property.
 *
 * @template TAdapter - The embedding adapter type
 */
export type EmbedOptions<TAdapter extends EmbeddingAdapter<string, any, any, any>> = {
    /** The embedding adapter to use (must be created with a model) */
    adapter: TAdapter & {
        kind: typeof kind;
    };
    /**
     * What to embed: a single item or an array of items. Each item in the array
     * produces exactly one vector. An item is a plain string, a text part, an
     * image part, or — for models that embed text and image together — a fused
     * item written as a nested array of parts (`[textPart, imagePart]`), the
     * same `Array<ContentPart>` shape chat messages use. The accepted item types
     * are narrowed per model via the adapter's input-modality map.
     */
    input: EmbeddingInputForModel<TAdapter, TAdapter['model']>;
    /**
     * Requested output dimensionality. Supported by models with Matryoshka /
     * configurable dimensions; adapters for fixed-dimension models throw a
     * clear runtime error when this is set.
     */
    dimensions?: number;
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
} & ({} extends EmbedProviderOptionsForModel<TAdapter, TAdapter['model']> ? {
    /** Provider-specific options for embedding generation */ modelOptions?: EmbedProviderOptionsForModel<TAdapter, TAdapter['model']>;
} : {
    /** Provider-specific options for embedding generation */ modelOptions: EmbedProviderOptionsForModel<TAdapter, TAdapter['model']>;
});
/**
 * Embed activity - generates embedding vectors from text and image inputs.
 *
 * Accepts a single item or an array of items; the result always carries an
 * `embeddings` array with one vector per input item, in input order.
 *
 * @example Embed a single text
 * ```ts
 * import { embed } from '@tanstack/ai'
 * import { openaiEmbedding } from '@tanstack/ai-openai'
 *
 * const result = await embed({
 *   adapter: openaiEmbedding('text-embedding-3-small'),
 *   input: 'a red guitar',
 * })
 *
 * console.log(result.embeddings[0].vector)
 * ```
 *
 * @example Batch with requested dimensions
 * ```ts
 * const result = await embed({
 *   adapter: openaiEmbedding('text-embedding-3-large'),
 *   input: ['a red guitar', 'a blue drum kit'],
 *   dimensions: 1024,
 * })
 * ```
 *
 * @example Multimodal embedding (text + image fused into one vector)
 * ```ts
 * import { cohereEmbedding } from '@tanstack/ai-cohere'
 *
 * // A nested array of parts fuses them into a single vector. The outer array
 * // is the item list, so this embeds one fused item into one vector.
 * const result = await embed({
 *   adapter: cohereEmbedding('embed-v4.0'),
 *   input: [
 *     [
 *       { type: 'text', content: 'product photo' },
 *       { type: 'image', source: { type: 'data', value: base64, mimeType: 'image/png' } },
 *     ],
 *   ],
 *   modelOptions: { inputType: 'search_document' },
 * })
 * ```
 */
export declare function embed<TAdapter extends EmbeddingAdapter<string, any, any, any>>(options: EmbedOptions<TAdapter>): Promise<EmbeddingResult>;
/**
 * Create typed options for the embed() function without executing.
 */
export declare function createEmbedOptions<TAdapter extends EmbeddingAdapter<string, any, any, any>>(options: EmbedOptions<TAdapter>): EmbedOptions<TAdapter>;
export type { EmbeddingAdapter, EmbeddingAdapterConfig, AnyEmbeddingAdapter, } from './adapter.js';
export { BaseEmbeddingAdapter } from './adapter.js';
