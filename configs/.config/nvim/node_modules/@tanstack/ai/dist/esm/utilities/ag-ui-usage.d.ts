import { TokenUsage } from '../types.js';
/** AG-UI spec `usage[]` item (provider/model labels + token counts only). */
export interface SpecTokenUsage {
    provider?: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    reasoningTokens?: number;
    cachedInputTokens?: number;
}
export interface ToSpecTokenUsageOptions {
    provider?: string;
    model?: string;
}
/** TokenUsage fields that have no AG-UI `usage[]` equivalent. */
export type TokenUsageLeftover = Omit<TokenUsage, 'promptTokens' | 'completionTokens' | 'totalTokens'>;
export declare function isTanstackUsage(usage: unknown): usage is TokenUsage;
export declare function toSpecTokenUsage(usage: TokenUsage, options?: ToSpecTokenUsageOptions): {
    usage: Array<SpecTokenUsage>;
    leftover?: TokenUsageLeftover;
};
export declare function rebuildTokenUsage(usage: unknown, leftover?: TokenUsageLeftover): TokenUsage | undefined;
export declare function fromSpecTokenUsage(usage: ReadonlyArray<SpecTokenUsage> | undefined, leftover?: TokenUsageLeftover): TokenUsage | undefined;
