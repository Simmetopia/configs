import { LazyToolsConfig } from '../../../types.js';
/**
 * Extract the first sentence of a description (up to the first ., !, or ?
 * followed by whitespace or end-of-string). Falls back to the whole trimmed
 * string when there is no sentence terminator.
 */
export declare function firstSentence(text: string): string;
/**
 * Render one entry in a lazy-tool catalog according to `includeDescription`.
 * - 'none' (default) → bare name (preserves legacy chat behavior)
 * - 'first-sentence' → `name — <first sentence>`
 * - 'full' → `name — <full description>`
 * Falls back to the bare name when there is no description.
 */
export declare function renderLazyCatalogEntry(name: string, description: string, includeDescription?: LazyToolsConfig['includeDescription']): string;
