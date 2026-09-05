import { AssistantMessage, ReasoningMessage, SystemMessage, ToolMessage, UserMessage } from '@ag-ui/core';
import { ModelMessage, UIMessage } from '../types.js';
import { MetadataRecord } from './merge-metadata.js';
type WithMetadata<T> = T & {
    metadata?: MetadataRecord;
};
type WireSystemMessage = WithMetadata<SystemMessage>;
type WireUserMessage = WithMetadata<UserMessage>;
type WireAssistantMessage = WithMetadata<AssistantMessage>;
type WireToolMessage = WithMetadata<ToolMessage & {
    name?: string;
}>;
type WireReasoningMessage = WithMetadata<ReasoningMessage>;
export type WireMessage = WireSystemMessage | WireUserMessage | WireAssistantMessage | WireToolMessage | WireReasoningMessage;
/**
 * Serialize TanStack `UIMessage`s and `ModelMessage`s into the AG-UI
 * `RunAgentInput.messages` wire shape. Anchors are spec-only (`id`, `role`,
 * `name`, `content`, `toolCalls`, `metadata`). Tool results and thinking parts
 * on assistant messages are additionally emitted as fan-out
 * `{role:'tool',...}` and `{role:'reasoning',...}` entries for strict AG-UI
 * server consumers. Set `includeSnapshotStructuredOutput` to retain complete
 * structured-output metadata for UI snapshots.
 */
export declare function uiMessagesToWire(messages: Array<UIMessage | ModelMessage>, options?: {
    includeSnapshotStructuredOutput: boolean;
}): Array<WireMessage>;
export {};
