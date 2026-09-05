import { StreamChunk } from '../types.js';
/**
 * Thrown when a skills request exceeds a provider limit. Lives in core (rather
 * than `@tanstack/ai-skills`) so the native tool factories in `ai-anthropic`
 * and `openai-base` can throw it without depending on the skills package;
 * `@tanstack/ai-skills` re-exports it for the portable path.
 *
 * `path` distinguishes the native provider cap (e.g. Anthropic's 8-skill
 * limit) from a portable-path limit, so a portable user isn't sent chasing a
 * cap that only applies to hosted skills.
 */
export interface SkillLimitErrorInit {
    provider: 'anthropic' | 'openai' | 'gemini' | 'other';
    path: 'native' | 'portable';
    limit: string;
    allowed: number;
    actual: number;
    offending: Array<string>;
}
export declare class SkillLimitError extends Error {
    readonly provider: 'anthropic' | 'openai' | 'gemini' | 'other';
    readonly path: 'native' | 'portable';
    readonly limit: string;
    readonly allowed: number;
    readonly actual: number;
    readonly offending: Array<string>;
    constructor(init: SkillLimitErrorInit);
}
/**
 * Best-effort extraction of a human-readable message from an unknown thrown
 * value, returning `undefined` when none can be found.
 *
 * Used by `otelMiddleware` so error reporting stays identical across chat and
 * media spans.
 */
export declare function errorMessage(err: unknown): string | undefined;
/**
 * Best-effort extraction of an error's type name (used for the `error.type`
 * metric attribute), falling back to `'Error'` when no name is available.
 */
export declare function errorTypeName(err: unknown): string;
/**
 * Convert an AG-UI RUN_ERROR event to the Error shape exposed to consumers.
 * Preserves the provider code and sanitized raw event when available, while
 * accepting the deprecated nested error payload for backward compatibility.
 */
export declare function runErrorEventToError(chunk: Extract<StreamChunk, {
    type: 'RUN_ERROR';
}>): Error;
