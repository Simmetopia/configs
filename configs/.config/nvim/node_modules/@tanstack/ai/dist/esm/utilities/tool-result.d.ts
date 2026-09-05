import { ContentPart } from '../types.js';
/**
 * Structural check for a single `ContentPart`. A text part must carry a string
 * `content`; every other modality must carry a `source` with `type` of
 * `'url' | 'data'` and a string `value`.
 */
export declare function isContentPart(value: unknown): value is ContentPart;
/**
 * True iff `value` is a NON-EMPTY array whose every element is a valid
 * `ContentPart`. Empty arrays and mixed arrays return false so they continue
 * to be treated as ordinary (stringified) data — this keeps the auto-detection
 * footgun narrow.
 */
export declare function isContentPartArray(value: unknown): value is Array<ContentPart>;
/**
 * Normalize a tool's return value for transport:
 * - string            → unchanged
 * - ContentPart array → unchanged (multimodal, passed through to the adapter)
 * - anything else     → `JSON.stringify`
 */
export declare function normalizeToolResult(result: unknown): string | Array<ContentPart>;
