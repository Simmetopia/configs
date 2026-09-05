import { EmbeddingInputItem, ImagePart } from '../types.js';
/**
 * One embedding input item resolved into its text and image constituents.
 * Produced by {@link resolveEmbeddingInput}; adapters map each entry onto
 * one provider-native input (one vector per entry).
 */
export interface ResolvedEmbeddingItem {
    /** Text contents of the item, in order (empty for image-only items) */
    texts: Array<string>;
    /** Image parts of the item, in order (empty for text-only items) */
    images: Array<ImagePart>;
}
/**
 * Resolve each embedding input item into its text and image constituents,
 * preserving input order (result[i] corresponds to input[i] and to the
 * vector at index i).
 */
export declare function resolveEmbeddingInput(input: Array<EmbeddingInputItem>): Array<ResolvedEmbeddingItem>;
/**
 * Extract plain text inputs for a text-only embedding model, throwing a
 * uniform error if any item carries an image. The per-model modality typing
 * rejects these at compile time; this guard covers untyped/dynamic callers.
 */
export declare function requireTextOnlyEmbeddingInput(input: Array<EmbeddingInputItem>, provider: string, model: string): Array<string>;
/**
 * Count text-only and image-carrying items for observability events. Never
 * exposes input content.
 */
export declare function countEmbeddingInputModalities(input: Array<EmbeddingInputItem>): {
    textInputCount: number;
    imageInputCount: number;
};
