import { DebugOption } from '../../logger/types.js';
import { GenerationMiddleware } from '../middleware/types.js';
import { RerankAdapter } from './adapter.js';
import { RerankResult } from '../../types.js';
/** The adapter kind this activity handles */
export declare const kind: "rerank";
/** Extract provider options from a RerankAdapter via ~types */
export type RerankProviderOptions<TAdapter> = TAdapter extends {
    '~types': {
        providerOptions: infer P extends object;
    };
} ? P : object;
/**
 * Options for the rerank activity. The model is extracted from the adapter's
 * model property.
 *
 * @template TAdapter - The rerank adapter type
 * @template TDocument - The document element type (string or object)
 */
export interface RerankActivityOptions<TAdapter extends RerankAdapter<string, RerankProviderOptions<TAdapter>>, TDocument extends string | object = string> {
    /** The rerank adapter to use (must be created with a model) */
    adapter: TAdapter & {
        kind: typeof kind;
    };
    /** The query documents are scored against. */
    query: string;
    /**
     * Documents to rerank. Either strings or JSON-serializable objects — object
     * documents are serialized with `JSON.stringify` before being sent to the
     * provider, and the original element (string or object) is returned in the
     * result, preserving its type.
     */
    documents: Array<TDocument>;
    /** Return only the top N results. */
    topN?: number;
    /** Provider-specific options */
    modelOptions?: RerankProviderOptions<TAdapter>;
    /** Forwarded to the provider request for cancellation. */
    abortSignal?: AbortSignal;
    /**
     * Observe-only middleware notified on start, usage, success, abort, and
     * error. Pass `otelMiddleware()` to emit OpenTelemetry spans, or implement
     * the `GenerationMiddleware` contract for a custom backend.
     */
    middleware?: Array<GenerationMiddleware>;
    /**
     * Enable debug logging. Pass `true` to enable all categories, `false` to
     * silence everything including errors, or a `DebugConfig` object for granular
     * control and/or a custom `Logger`.
     */
    debug?: DebugOption;
}
/**
 * Rerank activity - reorders documents by relevance to a query.
 *
 * @example Basic reranking
 * ```ts
 * import { rerank } from '@tanstack/ai'
 * import { cohereRerank } from '@tanstack/ai-cohere'
 *
 * const { ranking, rerankedDocuments } = await rerank({
 *   adapter: cohereRerank('rerank-v3.5'),
 *   query: 'talk about rain',
 *   documents: ['sunny day at the beach', 'rainy afternoon in the city'],
 *   topN: 2,
 * })
 *
 * console.log(rerankedDocuments[0]) // 'rainy afternoon in the city'
 * ```
 *
 * @example Reranking object documents
 * ```ts
 * const { ranking } = await rerank({
 *   adapter: cohereRerank('rerank-v3.5'),
 *   query: 'best laptop for travel',
 *   documents: [
 *     { id: 1, text: 'A heavy gaming desktop' },
 *     { id: 2, text: 'A lightweight ultrabook with all-day battery' },
 *   ],
 * })
 *
 * // ranking[0].document is the original object, fully typed.
 * console.log(ranking[0].document.id)
 * ```
 */
export declare function rerank<TAdapter extends RerankAdapter<string, RerankProviderOptions<TAdapter>>, TDocument extends string | object = string>(options: RerankActivityOptions<TAdapter, TDocument>): Promise<RerankResult<TDocument>>;
/**
 * Create typed options for the rerank() function without executing.
 */
export declare function createRerankOptions<TAdapter extends RerankAdapter<string, RerankProviderOptions<TAdapter>>, TDocument extends string | object = string>(options: RerankActivityOptions<TAdapter, TDocument>): RerankActivityOptions<TAdapter, TDocument>;
export type { RerankAdapter, RerankAdapterConfig, AnyRerankAdapter, } from './adapter.js';
export { BaseRerankAdapter } from './adapter.js';
