import { AttributeValue, Meter, Span, SpanOptions, Tracer } from '@opentelemetry/api';
import { ChatMiddleware, ChatMiddlewareContext } from '../activities/chat/middleware/types.js';
import { GenerationMiddleware, GenerationMiddlewareContext } from '../activities/middleware/types.js';
/**
 * Scope (role) of an OTel span emitted by this middleware.
 *
 * - `chat` — the root span for a single `chat()` call
 * - `iteration` — one per provider model call (agent-loop `beforeModel`
 *   turn, or the separate `structuredOutput` finalization when
 *   `outputSchema` skips the agent loop — see #1054)
 * - `tool` — one per tool execution inside an iteration
 * - `generation` — the single span for a media activity call
 *   (`generateImage`, `generateVideo`, `generateSpeech`, …)
 */
export type OtelSpanScope = 'chat' | 'iteration' | 'tool' | 'generation';
/**
 * Alias retained for backwards compatibility. Prefer {@link OtelSpanScope}.
 *
 * @deprecated Use `OtelSpanScope` instead — the name shadows OTel's built-in
 * `SpanKind` which is also imported by integrations of this middleware.
 */
export type OtelSpanKind = OtelSpanScope;
/**
 * Span metadata passed to `spanNameFormatter`, `attributeEnricher`,
 * `onBeforeSpanStart`, and `onSpanEnd`. Discriminated by `kind` so that
 * tool-only fields narrow automatically inside callback bodies.
 */
export type OtelSpanInfo<TScope extends OtelSpanScope = OtelSpanScope> = TScope extends 'chat' ? {
    kind: 'chat';
    ctx: ChatMiddlewareContext;
} : TScope extends 'iteration' ? {
    kind: 'iteration';
    ctx: ChatMiddlewareContext;
    iteration: number;
} : TScope extends 'tool' ? {
    kind: 'tool';
    ctx: ChatMiddlewareContext;
    iteration: number;
    toolName: string;
    toolCallId: string;
} : TScope extends 'generation' ? {
    kind: 'generation';
    ctx: GenerationMiddlewareContext;
} : never;
export interface OtelMiddlewareOptions {
    /** OTel `Tracer` used to start root, iteration, and tool spans. */
    tracer: Tracer;
    /**
     * Optional OTel `Meter`. When provided, the middleware records
     * `gen_ai.client.operation.duration` and `gen_ai.client.token.usage`
     * histograms. Omit to disable metrics without disabling tracing.
     */
    meter?: Meter;
    /**
     * When `true`, prompt and completion content is attached to iteration spans
     * as `gen_ai.*.message` / `gen_ai.choice` events. Defaults to `false` so
     * that PII never lands on a span by accident.
     */
    captureContent?: boolean;
    /**
     * Invoked on every captured content string before it lands on a span.
     * Return a redacted version. If this function throws, the middleware emits
     * the literal sentinel `"[redaction_failed]"` instead of the original text
     * — it never falls back to raw content.
     */
    redact?: (text: string) => string;
    /**
     * Maximum characters kept in the per-iteration assistant text buffer used
     * to emit `gen_ai.choice` events. Extra characters are truncated with a
     * trailing `"…"` marker. Defaults to 100 000. Set to `0` to disable the
     * cap. Exporters typically truncate long attribute values anyway.
     */
    maxContentLength?: number;
    /** Override the default span name for each `kind`. */
    spanNameFormatter?: (info: OtelSpanInfo) => string;
    /** Add extra attributes to each span. */
    attributeEnricher?: (info: OtelSpanInfo) => Record<string, AttributeValue>;
    /** Mutate `SpanOptions` immediately before `tracer.startSpan(...)`. */
    onBeforeSpanStart?: (info: OtelSpanInfo, options: SpanOptions) => SpanOptions;
    /** Fires just before every `span.end()`. */
    onSpanEnd?: (info: OtelSpanInfo, span: Span) => void;
}
export declare function otelMiddleware(options: OtelMiddlewareOptions): GenerationMiddleware & ChatMiddleware;
