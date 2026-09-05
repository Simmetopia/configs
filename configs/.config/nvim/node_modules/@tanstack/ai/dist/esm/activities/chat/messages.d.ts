import { Message as AGUIMessage } from '@ag-ui/core';
import { ModelMessage, UIMessage } from '../../types.js';
export declare function safeJsonStringify(value: unknown): string;
/**
 * Convert UIMessages or ModelMessages to ModelMessages
 */
export declare function convertMessagesToModelMessages(messages: Array<UIMessage | ModelMessage>): Array<ModelMessage>;
export declare function restoreToolResultOwnership<T extends object>(message: T): T;
/**
 * Rebuild a `Date` from a live `Date` or from an ISO string.
 * `JSON.stringify` turns `Date` into a string, so persistence reload
 * and AG-UI wire both land here as strings.
 */
export declare function coerceCreatedAt(value: unknown): Date | undefined;
/**
 * Convert a UIMessage to ModelMessage(s)
 *
 * Walks the parts array IN ORDER to preserve the interleaving of text,
 * tool calls, and tool results. This is critical for multi-round tool
 * flows where the model generates text, calls a tool, gets the result,
 * then generates more text and calls another tool.
 *
 * The output preserves the sequential structure:
 *   text1 → toolCall1 → toolResult1 → text2 → toolCall2 → toolResult2
 * becomes:
 *   assistant: {content: "text1", toolCalls: [toolCall1]}
 *   tool: toolResult1
 *   assistant: {content: "text2", toolCalls: [toolCall2]}
 *   tool: toolResult2
 *
 * @param uiMessage - The UIMessage to convert
 * @returns An array of ModelMessages preserving part ordering
 */
export declare function uiMessageToModelMessages(uiMessage: UIMessage): Array<ModelMessage>;
/**
 * Convert a ModelMessage to UIMessage
 *
 * This conversion creates a parts-based structure:
 * - content field → TextPart
 * - toolCalls array → ToolCallPart[]
 * - role="tool" messages should be converted separately and merged
 *
 * @param modelMessage - The ModelMessage to convert
 * @param id - Optional ID for the UIMessage (generated if not provided)
 * @returns A UIMessage with parts
 */
export declare function modelMessageToUIMessage(modelMessage: ModelMessage, id?: string): UIMessage;
/**
 * Normalize a single AG-UI `MESSAGES_SNAPSHOT` message into a `UIMessage`.
 *
 * AG-UI snapshot messages use the wire shape `{ id, role, content }` and have
 * no `parts` array. Casting them directly to `UIMessage` is unsafe: any code
 * that later reads `message.parts` (e.g. the devtools `onToolCallStateChange`
 * handler) crashes with "Cannot read properties of undefined (reading 'find')".
 *
 * Each role is mapped to the canonical `UIMessage` shape, reusing
 * `modelMessageToUIMessage` for the roles that share `ModelMessage`'s structure.
 * The original AG-UI `id` is preserved so later `TEXT_MESSAGE_CONTENT` /
 * `TOOL_CALL_*` events still route by `messageId` (falling back to a generated
 * id only when the snapshot omits one). Messages that already carry `parts`
 * (e.g. a TanStack server echoing `UIMessage`s back over the wire) pass through
 * unchanged apart from ensuring an id.
 */
export declare function aguiSnapshotMessageToUIMessage(message: AGUIMessage | UIMessage): UIMessage;
/**
 * Convert an array of ModelMessages to UIMessages
 *
 * This handles merging tool result messages with their corresponding assistant messages
 *
 * @param modelMessages - Array of ModelMessages to convert
 * @returns Array of UIMessages
 */
export declare function modelMessagesToUIMessages(modelMessages: Array<ModelMessage>): Array<UIMessage>;
/**
 * Normalize a message (UIMessage or ModelMessage) to a UIMessage
 * Ensures the message has an ID and createdAt timestamp
 *
 * @param message - Either a UIMessage or ModelMessage
 * @param generateId - Function to generate a message ID if needed
 * @returns A UIMessage with guaranteed id and createdAt
 */
export declare function normalizeToUIMessage(message: UIMessage | ModelMessage, generateId: () => string): UIMessage;
/**
 * Generate a unique message ID
 */
export declare function generateMessageId(): string;
