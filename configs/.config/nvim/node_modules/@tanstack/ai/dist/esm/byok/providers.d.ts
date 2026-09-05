/**
 * Provider ids are open slugs, not a closed catalog. `@tanstack/ai` does not
 * list adapters. Any matching string is a valid id and becomes `x-byok-<id>`.
 */
export type ProviderId = string;
/** `[a-z][a-z0-9-]{0,63}` — lowercase, no underscores, max 64 chars. */
export declare const BYOK_PROVIDER_ID_PATTERN: RegExp;
export declare const BYOK_HEADER_PREFIX = "x-byok-";
export declare function isProviderId(value: unknown): value is ProviderId;
export declare function resolveProviderId(provider: string | {
    readonly id: string;
}): string;
export declare function byokHeaderName(provider: string): string;
