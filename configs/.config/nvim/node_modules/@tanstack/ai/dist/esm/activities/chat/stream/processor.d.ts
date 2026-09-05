import { ChunkRecording, ChunkStrategy, ProcessorResult, ProcessorState, ToolCallState } from './types.js';
import { ContentPart, ModelMessage, StreamChunk, UIMessage } from '../../../types.js';
/**
 * Events emitted by the StreamProcessor
 */
export interface StreamProcessorEvents {
    onMessagesChange?: (messages: Array<UIMessage>) => void;
    onStreamStart?: () => void;
    onStreamEnd?: (message: UIMessage) => void;
    onError?: (error: Error) => void;
    onToolCall?: (args: {
        toolCallId: string;
        toolName: string;
        input: any;
    }) => void;
    onApprovalRequest?: (args: {
        toolCallId: string;
        toolName: string;
        input: any;
        approvalId: string;
    }) => void;
    onCustomEvent?: (eventType: string, data: unknown, context: {
        toolCallId?: string;
    }) => void;
    onTextUpdate?: (messageId: string, content: string) => void;
    onToolCallStateChange?: (messageId: string, toolCallId: string, state: ToolCallState, args: string) => void;
    onThinkingUpdate?: (messageId: string, stepId: string, content: string) => void;
    onStructuredOutputChange?: (args: {
        phase: 'start' | 'update' | 'complete' | 'error';
        messageId: string;
        status: 'streaming' | 'complete' | 'error';
        raw: string;
        partial?: unknown;
        data?: unknown;
        reasoning?: string;
        errorMessage?: string;
        delta?: string;
    }) => void;
}
/**
 * Options for StreamProcessor
 */
export interface StreamProcessorOptions {
    chunkStrategy?: ChunkStrategy;
    /** Event-driven handlers */
    events?: StreamProcessorEvents;
    jsonParser?: {
        parse: (jsonString: string) => any;
    };
    /** Enable recording for replay testing */
    recording?: boolean;
    /** Initial messages to populate the processor */
    initialMessages?: Array<UIMessage>;
}
/**
 * StreamProcessor - State machine for processing AI response streams
 *
 * Manages the full UIMessage[] conversation and emits events on changes.
 * Trusts the adapter contract: adapters emit clean AG-UI events in the
 * correct order.
 *
 * State tracking:
 * - Full message array
 * - Per-message stream state (text, tool calls, thinking)
 * - Multiple concurrent message streams
 * - Tool call completion via TOOL_CALL_END events
 *
 * @see docs/chat-architecture.md#streamprocessor-internal-state — State field reference
 * @see docs/chat-architecture.md#adapter-contract — What this class expects from adapters
 */
export declare class StreamProcessor {
    private readonly chunkStrategy;
    private readonly events;
    private readonly jsonParser;
    private recordingEnabled;
    private messages;
    private readonly messageStates;
    private readonly activeMessageIds;
    private readonly toolCallToMessage;
    private pendingManualMessageId;
    private pendingThinkingStepId;
    private readonly structuredMessageIds;
    private readonly structuredOutputUpdateBatches;
    private readonly activeRuns;
    private finishReason;
    private hasError;
    private isDone;
    private streamEndEmitted;
    private recording;
    private recordingStartTime;
    constructor(options?: StreamProcessorOptions);
    /**
     * Set the messages array (e.g., from persisted state)
     */
    setMessages(messages: Array<UIMessage>): void;
    /**
     * Add a user message to the conversation.
     * Supports both simple string content and multimodal content arrays.
     *
     * @param content - The message content (string or array of content parts)
     * @param id - Optional custom message ID (generated if not provided)
     * @param metadata - Optional AG-UI metadata bag
     * @returns The created UIMessage
     *
     * @example
     * ```ts
     * // Simple text message
     * processor.addUserMessage('Hello!')
     *
     * // Multimodal message with image
     * processor.addUserMessage([
     *   { type: 'text', content: 'What is in this image?' },
     *   { type: 'image', source: { type: 'url', value: 'https://example.com/photo.jpg' } }
     * ])
     *
     * // With custom ID
     * processor.addUserMessage('Hello!', 'custom-id-123')
     * ```
     */
    addUserMessage(content: string | Array<ContentPart>, id?: string, metadata?: UIMessage['metadata']): UIMessage;
    /**
     * Prepare for a new assistant message stream.
     * Does NOT create the message immediately -- the message is created lazily
     * when the first content-bearing chunk arrives via ensureAssistantMessage().
     * This prevents empty assistant messages from flickering in the UI when
     * auto-continuation produces no content.
     */
    prepareAssistantMessage(): void;
    /**
     * @deprecated Use prepareAssistantMessage() instead. This eagerly creates
     * an assistant message which can cause empty message flicker.
     */
    startAssistantMessage(messageId?: string): string;
    /**
     * Get the current assistant message ID (if one has been created).
     * Returns null if prepareAssistantMessage() was called but no content
     * has arrived yet.
     */
    getCurrentAssistantMessageId(): string | null;
    /**
     * Add a tool result (called by client after handling onToolCall)
     */
    addToolResult(toolCallId: string, output: any, error?: string): void;
    /**
     * Add an approval response (called by client after handling onApprovalRequest)
     */
    addToolApprovalResponse(approvalId: string, approved: boolean): void;
    /**
     * Get the conversation as ModelMessages (for sending to LLM)
     */
    toModelMessages(): Array<ModelMessage>;
    /**
     * Get current messages
     */
    getMessages(): Array<UIMessage>;
    /**
     * Check if all tool calls in the last assistant message are complete
     * Useful for auto-continue logic
     */
    areAllToolsComplete(): boolean;
    /**
     * Remove messages after a certain index (for reload/retry)
     */
    removeMessagesAfter(index: number): void;
    /**
     * Clear all messages
     */
    clearMessages(): void;
    /**
     * Process a stream and emit events through handlers
     */
    process(stream: AsyncIterable<any>): Promise<ProcessorResult>;
    /**
     * Process a single chunk from the stream.
     *
     * Central dispatch for all AG-UI events. Each event type maps to a specific
     * handler. Events not listed in the switch are intentionally ignored
     * (STEP_STARTED, STATE_SNAPSHOT, STATE_DELTA).
     *
     * @see docs/chat-architecture.md#adapter-contract — Expected event types and ordering
     */
    processChunk(chunk: StreamChunk): void;
    /**
     * Create a new MessageStreamState for a message
     */
    private createMessageState;
    /**
     * Get the MessageStreamState for a message
     */
    private getMessageState;
    /**
     * Promote a pending stepId from a STEP_STARTED that fired before the
     * assistant message existed onto the given message state, so the next
     * thinking event (STEP_FINISHED or REASONING_MESSAGE_CONTENT) attributes
     * to the correct step.
     */
    private consumePendingThinkingStep;
    /**
     * Get the most recent active assistant message ID.
     * Used as fallback for events that don't include a messageId.
     */
    private getActiveAssistantMessageId;
    private resumeAssistantState;
    /**
     * Ensure an active assistant message exists, creating one if needed.
     * Used for backward compat when events arrive without prior TEXT_MESSAGE_START.
     *
     * On reconnect/resume, a TEXT_MESSAGE_CONTENT may arrive for a message that
     * already exists in this.messages (e.g. from initialMessages or a prior
     * MESSAGES_SNAPSHOT) but whose transient state was cleared. In that case we
     * hydrate state from the existing message rather than creating a duplicate.
     */
    private ensureAssistantMessage;
    /**
     * Merge event metadata onto a UIMessage. `tanstack` is deep-merged so a
     * later delta does not wipe `tanstack.model`. High-frequency leftover
     * keys (`content`, `args`) never stamp onto the message.
     * Rebuilds `createdAt` when `tanstack.createdAt` is an ISO string.
     */
    private mergeMessageMetadata;
    /**
     * Handle TEXT_MESSAGE_START event
     */
    private handleTextMessageStartEvent;
    /**
     * Handle TEXT_MESSAGE_END event
     */
    private handleTextMessageEndEvent;
    /**
     * Handle MESSAGES_SNAPSHOT event
     */
    private handleMessagesSnapshotEvent;
    /**
     * Reconcile a freshly normalized snapshot with the pre-snapshot message
     * state so unreconstructable tool-call metadata is preserved.
     *
     * Post-pass (a): anchor `tool-result`-only assistant messages (the shape
     * `aguiSnapshotMessageToUIMessage` emits for AG-UI `role: 'tool'` wire
     * messages) into the message containing the matching `tool-call` part, or —
     * when the snapshot supplies no such part — the nearest earlier anchorable
     * assistant message, matching the in-stream fan-out shape
     * `assistant: [text, tool-call, tool-result, ...]`. Detached messages with
     * no earlier anchorable assistant are kept verbatim.
     *
     * Post-pass (b): when a `tool-result` part references a `toolCallId` whose
     * `tool-call` part is absent from the snapshot, carry the `tool-call` part
     * forward from the pre-snapshot state (state and output untouched) so a
     * subsequent `addToolResult(toolCallId)` can still locate the call.
     *
     * Post-pass (c): AG-UI wire snapshots rebuild `tool-call` parts as
     * `input-complete` without `output` (ModelMessage has no result field on
     * the call). After anchoring results, copy each `tool-result` onto its
     * matching `tool-call` (and prefer pre-snapshot complete/output when the
     * snapshot is poorer) so server tools keep the same UI shape as client tools.
     */
    /**
     * Wire order is reasoning fan-outs, then the assistant anchor.
     * Snapshot conversion turns each reasoning row into its own assistant
     * message. Fold leading thinking-only messages into the next real
     * assistant. Do not fold into a tool-result-only message (`role: 'tool'`
     * on the wire). `reconcileSnapshotToolCalls` anchors those results.
     */
    private mergeReasoningFanOut;
    private reconcileSnapshotToolCalls;
    /**
     * Post-pass (c): fold `tool-result` content into sibling `tool-call` parts
     * and prefer pre-snapshot complete/output when the snapshot rebuilt a
     * poorer `input-complete` call (AG-UI ModelMessage has no result on calls).
     */
    private enrichSnapshotToolCallsFromResults;
    /**
     * Handle TEXT_MESSAGE_CONTENT event.
     *
     * Accumulates delta into both currentSegmentText (for UI emission) and
     * totalTextContent (for ProcessorResult). Lazily creates the assistant
     * UIMessage on first content. Uses updateTextPart() which replaces the
     * last TextPart or creates a new one depending on part ordering.
     *
     * @see docs/chat-architecture.md#single-shot-text-response — Text accumulation step-by-step
     * @see docs/chat-architecture.md#uimessage-part-ordering-invariants — Replace vs. push logic
     */
    private handleTextMessageContentEvent;
    /**
     * Handle TOOL_CALL_START event.
     *
     * Creates a new InternalToolCallState entry in the toolCalls Map and appends
     * a ToolCallPart to the UIMessage. Duplicate toolCallId is a no-op.
     *
     * CRITICAL: This MUST be received before any TOOL_CALL_ARGS for the same
     * toolCallId. Args for unknown IDs are silently dropped.
     *
     * @see docs/chat-architecture.md#single-shot-tool-call-response — Tool call state transitions
     * @see docs/chat-architecture.md#parallel-tool-calls-single-shot — Parallel tracking by ID
     * @see docs/chat-architecture.md#adapter-contract — Ordering requirements
     */
    private handleToolCallStartEvent;
    /**
     * Handle TOOL_CALL_ARGS event.
     *
     * Appends the delta to the tool call's accumulated arguments string.
     * Transitions state from awaiting-input → input-streaming on first non-empty delta.
     * Attempts partial JSON parse on each update for UI preview.
     *
     * If toolCallId is not found in the Map (no preceding TOOL_CALL_START),
     * this event is silently dropped.
     *
     * @see docs/chat-architecture.md#single-shot-tool-call-response — Step-by-step tool call processing
     */
    private handleToolCallArgsEvent;
    /**
     * Handle TOOL_CALL_END event — arguments are finalized (input-complete).
     * Tool output arrives on TOOL_CALL_RESULT, not on this event.
     *
     * If TOOL_CALL_END carries parsed `input`, use it as the canonical arguments:
     * back-fill the accumulated string when no TOOL_CALL_ARGS deltas were seen
     * (adapters that deliver the whole input on END — e.g. Anthropic
     * server_tool_use / web_search — issue #839) and override the rendered part's
     * `input` with the canonical value.
     *
     * @see docs/chat-architecture.md#single-shot-tool-call-response — End-to-end flow
     */
    private handleToolCallEndEvent;
    private extractToolResultError;
    /**
     * Handle TOOL_CALL_RESULT event (AG-UI spec).
     *
     * Creates a tool-result part and updates the tool-call output field,
     * mirroring the logic from TOOL_CALL_END when it carries a result.
     * This is the spec-compliant path for delivering tool results to the client.
     */
    private handleToolCallResultEvent;
    /**
     * Handle RUN_STARTED event.
     *
     * Registers the run so that RUN_FINISHED can determine whether other
     * runs are still active before finalizing.
     */
    private handleRunStartedEvent;
    /**
     * Handle RUN_FINISHED event.
     *
     * Records the finishReason and removes the run from activeRuns.
     * Only finalizes when no more runs are active, so that concurrent
     * runs don't interfere with each other.
     *
     * @see docs/chat-architecture.md#single-shot-tool-call-response — finishReason semantics
     * @see docs/chat-architecture.md#adapter-contract — Why RUN_FINISHED is mandatory
     */
    private handleRunFinishedEvent;
    private handleInterrupts;
    private findToolCallName;
    /**
     * Handle RUN_ERROR event
     */
    private handleRunErrorEvent;
    /**
     * Handle STEP_STARTED event (for thinking/reasoning content).
     *
     * Records the stepId so later REASONING_MESSAGE_CONTENT deltas accumulate
     * into their own ThinkingPart. Does not create a message — the message
     * is lazily created when the first REASONING_MESSAGE_CONTENT arrives.
     */
    private handleStepStartedEvent;
    /**
     * Handle STEP_FINISHED event.
     *
     * Thinking *content* comes from REASONING_MESSAGE_CONTENT, not STEP_FINISHED.
     * But some adapters (e.g. BytePlus thinking-summary) carry the provider
     * signature blob ONLY on the STEP_FINISHED event, so still extract that here
     * and attach it to the thinking step the reasoning events already built.
     */
    private handleStepFinishedEvent;
    /**
     * Handle REASONING_MESSAGE_CONTENT event (AG-UI reasoning protocol).
     *
     * Accumulates reasoning delta into thinking content and updates the
     * corresponding ThinkingPart in the UIMessage.
     */
    private handleReasoningMessageContentEvent;
    /**
     * Attach a provider signature blob from REASONING_ENCRYPTED_VALUE.
     * `subtype: 'message'` updates ThinkingPart.signature.
     * `subtype: 'tool-call'` stores Gemini thoughtSignature on the tool-call part.
     */
    private handleReasoningEncryptedValueEvent;
    private attachToolCallSignature;
    /**
     * Handle CUSTOM event.
     *
     * Handles custom events consumed by the processor:
     * - 'tool-input-available': Legacy/replay-compatible input for client tool
     *   execution. Fires onToolCall.
     * - 'approval-requested': Legacy/replay-compatible input for tool approval.
     *   Updates tool-call part state and fires onApprovalRequest.
     *
     * Current core streams represent user-actionable waits through
     * RUN_FINISHED.outcome.type === 'interrupt'; these custom events are not the
     * source of truth for new emissions.
     *
     * @see docs/chat-architecture.md#client-tools-and-approval-flows — Full flow details
     */
    private handleCustomEvent;
    /**
     * Detect if an incoming content chunk represents a NEW text segment
     */
    private isNewTextSegment;
    /**
     * Complete all tool calls across all active messages — safety net for stream termination.
     *
     * Called by RUN_FINISHED and finalizeStream(). Force-transitions any tool call
     * not yet in input-complete state. Handles cases where TOOL_CALL_END was
     * missed (adapter bug, network error, aborted stream).
     *
     * @see docs/chat-architecture.md#single-shot-tool-call-response — Safety net behavior
     */
    private completeAllToolCalls;
    /**
     * Complete all tool calls for a specific message
     */
    private completeAllToolCallsForMessage;
    /**
     * Mark a tool call as complete and emit event
     */
    private completeToolCall;
    private isToolCallPartAwaitingUserAction;
    /**
     * Whether the rendered tool-call part for the given id has reached the
     * terminal 'error' state. Used to prevent the completion safety net from
     * downgrading a failed call back to 'input-complete'.
     */
    private isToolCallPartErrored;
    /**
     * Emit pending text update for a specific message.
     *
     * Calls updateTextPart() which has critical append-vs-replace logic:
     * - If last UIMessage part is TextPart → replaces its content (same segment).
     * - If last part is anything else → pushes new TextPart (new segment after tools).
     *
     * @see docs/chat-architecture.md#uimessage-part-ordering-invariants — Replace vs. push logic
     */
    private emitTextUpdateForMessage;
    private queueStructuredOutputUpdate;
    private flushStructuredOutputUpdate;
    private emitStructuredOutputChange;
    /**
     * Emit messages change event
     */
    private emitMessagesChange;
    /**
     * Finalize the stream — complete all pending operations.
     *
     * Called when the async iterable ends (stream closed). Acts as the final
     * safety net: completes any remaining tool calls, flushes un-emitted text,
     * and fires onStreamEnd.
     *
     * @see docs/chat-architecture.md#single-shot-text-response — Finalization step
     */
    finalizeStream(): void;
    /**
     * Get completed tool calls in API format (aggregated across all messages)
     */
    private getCompletedToolCalls;
    /**
     * Get current result (aggregated across all messages)
     */
    private getResult;
    /**
     * Get current processor state (aggregated across all messages)
     */
    getState(): ProcessorState;
    /**
     * Start recording chunks
     */
    startRecording(): void;
    /**
     * Get the current recording
     */
    getRecording(): ChunkRecording | null;
    /**
     * Reset stream state (but keep messages)
     */
    private resetStreamState;
    /**
     * Full reset (including messages)
     */
    reset(): void;
    /**
     * Check if a message contains only whitespace text and no other meaningful parts
     * (no tool calls, tool results, thinking, etc.)
     */
    private isWhitespaceOnlyMessage;
    /**
     * Replay a recording through the processor
     */
    static replay(recording: ChunkRecording, options?: StreamProcessorOptions): Promise<ProcessorResult>;
}
/**
 * Create an async iterable from a recording
 */
export declare function createReplayStream(recording: ChunkRecording): AsyncIterable<StreamChunk>;
