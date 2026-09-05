/**
 * True when a thrown value is an abort-shaped error (DOM `AbortError`, OpenAI
 * `APIUserAbortError`, OpenRouter `RequestAbortedError`) — i.e. user-initiated
 * cancellation rather than a genuine failure. Matches on the error `name` so
 * callers can discriminate aborts without depending on a signal's state or on
 * provider-specific message strings.
 */
export declare function isAbortShapedError(error: unknown): boolean;
export declare function toRunErrorPayload(error: unknown, fallbackMessage?: string): {
    message: string;
    code: string | undefined;
};
/**
 * Extract the provider's *structured error body* from a thrown value, to attach
 * as the AG-UI `rawEvent` on a RUN_ERROR event. This is the recoverable upstream
 * detail (provider name, the upstream model's error JSON, rate-limit/overload
 * codes, etc.) that `toRunErrorPayload`'s `{ message, code }` deliberately drops.
 *
 * Security boundary: only known provider-response-body fields are forwarded —
 * never the raw SDK exception object, which can carry request metadata such as
 * auth headers or request ids. The recognized sources, in priority order:
 *
 *  - `error.rawEvent` — a provider body an adapter attached explicitly (e.g. the
 *    OpenRouter mid-stream `chunk.error`).
 *  - `error.error` (object) — the parsed provider response body exposed by SDK
 *    `APIError` instances (OpenAI/Anthropic `{ type, message, code, param }`,
 *    OpenRouter typed errors whose `.error` carries `.metadata`). This is
 *    provider-shaped data, distinct from `.headers` / `.request_id`.
 *  - `error.metadata` — OpenRouter's `provider_name` + raw upstream body, when
 *    surfaced directly on the thrown error.
 *
 * Returns `undefined` when no structured provider body is present, so callers
 * omit the field entirely rather than setting it to `null`:
 *
 *   const rawEvent = toRunErrorRawEvent(error)
 *   yield { type: EventType.RUN_ERROR, ..., ...(rawEvent !== undefined && { rawEvent }) }
 */
export declare function toRunErrorRawEvent(error: unknown): unknown;
