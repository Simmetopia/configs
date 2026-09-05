import { AttributeValue } from '@opentelemetry/api';
import { TokenUsage } from '../types.js';
/**
 * Build the full set of `gen_ai.usage.*` span attributes from a `TokenUsage`.
 *
 * Beyond input/output tokens, this emits provider-reported cost, total tokens,
 * cache and reasoning breakdowns, duration-based billing, and media unit counts
 * — every field is guarded so spans stay clean when a provider doesn't report
 * it. Cache and reasoning use the official GenAI semconv names;
 * `gen_ai.usage.cost` and `gen_ai.usage.total_tokens` are de-facto extensions
 * consumed by backends like PostHog (which otherwise re-derive cost from their
 * own price tables, losing cache discounts and gateway markup). Fields with no
 * semconv or de-facto convention (`billed`, `costDetails`, and the deprecated
 * `durationSeconds`/`unitsBilled`) are TanStack-namespaced.
 *
 * Shared by `otelMiddleware` across every activity (chat and the media
 * activities) so usage lands identically whichever activity produced the span.
 *
 * Deliberately not emitted: `providerUsageDetails` (a provider-shaped bag,
 * unsafe to spread onto spans) and the per-modality token breakdowns
 * (`promptTokensDetails.audioTokens`, etc.) — those can balloon the attribute
 * set and have no agreed convention yet.
 */
export declare function usageAttributes(usage: TokenUsage): Record<string, AttributeValue>;
