import { AdapterYieldChunk } from '../../utilities/adapter-yield-chunk.js';
import { BaseSummarizeAdapter } from './adapter.js';
import { StreamChunk, SummarizationOptions, SummarizationResult, TextOptions } from '../../types.js';
/**
 * Minimal contract for a text adapter that supports `chatStream`. Lets
 * `ChatStreamSummarizeAdapter` work with any text adapter without coupling
 * to a specific implementation.
 *
 * The provider-options shape is intentionally `any` here — the wrapper only
 * forwards `modelOptions` straight through, so a text adapter with a richer
 * per-model options type (e.g. `ResolveProviderOptions<TModel>`) is still
 * acceptable. Summarize-level type safety is enforced via
 * `SummarizationOptions<TProviderOptions>` on the wrapper itself.
 */
export interface ChatStreamCapable {
    chatStream: (options: TextOptions<any>) => AsyncIterable<AdapterYieldChunk>;
}
/**
 * Extract the per-model `modelOptions` type a text adapter accepts. Used by
 * provider summarize factories so their `modelOptions` IntelliSense matches
 * what the underlying text adapter actually understands.
 */
export type InferTextProviderOptions<TAdapter> = TAdapter extends {
    '~types': {
        providerOptions: infer P;
    };
} ? P extends object ? P : object : object;
/**
 * Summarize adapter that wraps any `ChatStreamCapable` text adapter and
 * prompts it for summarization. Not tied to any wire format.
 */
export declare class ChatStreamSummarizeAdapter<TModel extends string, TProviderOptions extends object = Record<string, unknown>> extends BaseSummarizeAdapter<TModel, TProviderOptions> {
    readonly name: string;
    private readonly textAdapter;
    constructor(textAdapter: ChatStreamCapable, model: TModel, name?: string);
    summarize(options: SummarizationOptions<TProviderOptions>): Promise<SummarizationResult>;
    summarizeStream(options: SummarizationOptions<TProviderOptions>): AsyncIterable<StreamChunk>;
    /**
     * Build the TextOptions passed to the underlying chatStream. Provider
     * `modelOptions` from the summarize call are forwarded as-is so knobs like
     * Anthropic cache headers, Gemini safety settings, or Ollama tuning params
     * still reach the wire layer.
     */
    protected buildTextOptions(options: SummarizationOptions<TProviderOptions>, systemPrompt: string): TextOptions<TProviderOptions>;
    protected buildSummarizationPrompt(options: SummarizationOptions<TProviderOptions>): string;
}
