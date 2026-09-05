import { ChatMiddleware } from '../activities/chat/middleware/types.js';
/**
 * A content guard rule — either a regex pattern with replacement, or a transform function.
 */
export type ContentGuardRule = {
    pattern: RegExp;
    replacement: string;
} | {
    fn: (text: string) => string;
};
/**
 * Information passed to the onFiltered callback.
 */
export interface ContentFilteredInfo {
    /** The message ID being filtered */
    messageId: string;
    /** The original text before filtering */
    original: string;
    /** The filtered text after rules applied */
    filtered: string;
    /** Which strategy was used */
    strategy: 'delta' | 'buffered';
}
/**
 * Options for the content guard middleware.
 */
export interface ContentGuardMiddlewareOptions {
    /**
     * Rules to apply to text content. Each rule is either a regex pattern
     * with a replacement string, or a custom transform function.
     * Rules are applied in order. Each rule receives the output of the previous.
     */
    rules: Array<ContentGuardRule>;
    /**
     * Matching strategy:
     * - 'delta': Apply rules to each delta as it arrives. Fast, real-time,
     *   but patterns spanning chunk boundaries may be missed.
     * - 'buffered': Accumulate content and apply rules to settled portions,
     *   holding back a look-behind buffer to catch cross-boundary patterns.
     *
     * @default 'buffered'
     */
    strategy?: 'delta' | 'buffered';
    /**
     * Number of characters to hold back before emitting (buffered strategy only).
     * Should be at least as long as the longest pattern you expect to match.
     * Buffer is flushed when the stream ends.
     *
     * @default 50
     */
    bufferSize?: number;
    /**
     * If true, drop the entire chunk when any rule changes the content.
     * @default false
     */
    blockOnMatch?: boolean;
    /**
     * Callback when content is filtered by any rule.
     */
    onFiltered?: (info: ContentFilteredInfo) => void;
}
/**
 * Creates a middleware that filters or transforms streamed text content.
 *
 * @example
 * ```ts
 * import { contentGuardMiddleware } from '@tanstack/ai/middlewares'
 *
 * const guard = contentGuardMiddleware({
 *   rules: [
 *     { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN REDACTED]' },
 *   ],
 *   strategy: 'buffered',
 * })
 * ```
 */
export declare function contentGuardMiddleware(options: ContentGuardMiddlewareOptions): ChatMiddleware;
