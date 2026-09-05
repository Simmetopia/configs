import { AudioPart, ImagePart, MediaInputMetadata, MediaPrompt, MediaPromptPart, VideoPart } from '../types.js';
/**
 * A {@link MediaPrompt} decomposed into the views adapters consume.
 *
 * Adapters with native multimodal prompts (Gemini `contents`, OpenRouter
 * chat content parts) consume `parts` to preserve interleaving; named-field
 * providers (fal, OpenAI) consume `text` plus the typed media buckets.
 *
 * Prompt text is **never rewritten**: text parts are concatenated verbatim.
 * Providers that support referencing inputs from the prompt (e.g. fal's
 * `@Image1`, OpenAI's "image 1" prose) expect the user to write that syntax
 * themselves — the SDK does not inject or substitute markers.
 */
export interface ResolvedMediaPrompt {
    /**
     * Text parts concatenated verbatim (paragraph-separated). Empty string
     * for media-only prompts.
     */
    text: string;
    /** The prompt as ordered parts; a string prompt becomes one text part. */
    parts: Array<MediaPromptPart>;
    /** Image parts in prompt order. */
    images: Array<ImagePart<MediaInputMetadata>>;
    /** Video parts in prompt order. */
    videos: Array<VideoPart<MediaInputMetadata>>;
    /** Audio parts in prompt order. */
    audios: Array<AudioPart<MediaInputMetadata>>;
}
/**
 * Decompose a {@link MediaPrompt} into flattened text and per-modality part
 * buckets, preserving prompt order everywhere. This is the single downrev
 * point from the canonical interleaved prompt shape to the named-field
 * request shapes most providers expose.
 */
export declare function resolveMediaPrompt(prompt: MediaPrompt): ResolvedMediaPrompt;
