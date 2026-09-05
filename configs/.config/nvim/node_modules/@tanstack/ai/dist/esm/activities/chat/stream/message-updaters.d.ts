import { ContentPart, UIMessage } from '../../../types.js';
import { ToolCallState, ToolResultState } from './types.js';
/**
 * Update or add a text part to a message.
 *
 * If the last part is a text part, update it (continuing the same text segment).
 * Otherwise, create a new text part (starting a new text segment after tool calls).
 */
export declare function updateTextPart(messages: Array<UIMessage>, messageId: string, content: string): Array<UIMessage>;
/**
 * Update or add a tool call part to a message.
 */
export declare function updateToolCallPart(messages: Array<UIMessage>, messageId: string, toolCall: {
    id: string;
    name: string;
    arguments: string;
    state: ToolCallState;
    /** Parsed input — set when the arguments are complete. */
    input?: unknown;
    metadata?: Record<string, unknown>;
}): Array<UIMessage>;
/**
 * Update or add a tool result part to a message.
 */
export declare function updateToolResultPart(messages: Array<UIMessage>, messageId: string, toolCallId: string, content: string | Array<ContentPart>, state: ToolResultState, error?: string): Array<UIMessage>;
/**
 * Update a tool call part with approval request metadata.
 */
export declare function updateToolCallApproval(messages: Array<UIMessage>, messageId: string, toolCallId: string, approvalId: string): Array<UIMessage>;
/**
 * Update a tool call part's state (e.g., to "input-complete").
 */
export declare function updateToolCallState(messages: Array<UIMessage>, messageId: string, toolCallId: string, state: ToolCallState): Array<UIMessage>;
/**
 * Update a tool call part with output.
 * Searches all messages to find the tool call by ID.
 */
export declare function updateToolCallWithOutput(messages: Array<UIMessage>, toolCallId: string, output: any, state?: ToolCallState, errorText?: string): Array<UIMessage>;
/**
 * Update a tool call part with approval response.
 * Searches all messages to find the tool call by approval ID.
 */
export declare function updateToolCallApprovalResponse(messages: Array<UIMessage>, approvalId: string, approved: boolean): Array<UIMessage>;
/**
 * Append a delta to the structured-output part on `messageId`, or create one
 * if absent. Progressive parse of the accumulated buffer fills `partial`.
 *
 * Callers must only invoke this while the part is still in flight — the
 * helper unconditionally writes `status: 'streaming'`, so feeding it a delta
 * after a `complete`/`error` terminal would regress the part. In practice the
 * processor gates calls via `structuredMessageIds`, which is dropped on
 * terminal events.
 *
 * If the progressive parse returns null/undefined (the buffer is not yet a
 * parseable JSON prefix), the previously-good `partial` is preserved so the
 * UI doesn't flicker back to empty for a single render.
 */
export declare function appendStructuredOutputDelta(messages: Array<UIMessage>, messageId: string, delta: string): Array<UIMessage>;
/**
 * Snap the structured-output part on `messageId` to `complete` with the
 * validated `data`. Picks the freshest available `raw` so the wire
 * round-trip stays internally consistent:
 *
 *   1. Caller-supplied `raw` (the original streamed bytes from the model).
 *   2. The existing part's `raw` (deltas accumulated before this terminal).
 *   3. `JSON.stringify(data)` as a defensive fallback for terminal-only
 *      completes that never shipped raw — keeps the part self-consistent
 *      so downstream consumers never see a complete part with empty raw.
 */
export declare function completeStructuredOutputPart(messages: Array<UIMessage>, messageId: string, data: unknown, raw: string, reasoning?: string): Array<UIMessage>;
/**
 * Mark the structured-output part on `messageId` as errored. If no part
 * exists yet — RUN_ERROR fired after `structured-output.start` but before
 * any delta — create an empty errored placeholder so consumers have
 * something renderable. Existing complete parts are left alone (an error
 * after a successful complete should not retroactively un-complete it).
 */
export declare function errorStructuredOutputPart(messages: Array<UIMessage>, messageId: string, errorMessage: string): Array<UIMessage>;
/**
 * Update or add a thinking part to a message, keyed by stepId.
 * Each distinct stepId produces its own ThinkingPart.
 */
export declare function updateThinkingPart(messages: Array<UIMessage>, messageId: string, stepId: string, content: string, signature?: string): Array<UIMessage>;
