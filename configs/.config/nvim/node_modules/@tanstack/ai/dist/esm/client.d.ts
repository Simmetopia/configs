import { AudioGenerationOptions, ImageGenerationOptions, TTSOptions, TranscriptionOptions, VideoGenerationOptions } from './types.js';
export type GenerationKind = 'image' | 'audio' | 'tts' | 'video' | 'transcription';
type GenerationInputByKind = {
    image: Omit<ImageGenerationOptions, 'logger' | 'model'>;
    audio: Omit<AudioGenerationOptions, 'logger' | 'model'>;
    tts: Omit<TTSOptions, 'logger' | 'model'>;
    video: Omit<VideoGenerationOptions, 'logger' | 'model'>;
    transcription: Omit<TranscriptionOptions, 'logger' | 'model'>;
};
export interface GenerationParams<TKind extends GenerationKind> {
    input: GenerationInputByKind[TKind];
    forwardedProps: Record<string, unknown>;
    threadId?: string;
    runId?: string;
}
export declare function generationParamsFromBody<TKind extends GenerationKind>(kind: TKind, body: unknown): GenerationParams<TKind>;
export declare function generationParamsFromRequest<TKind extends GenerationKind>(kind: TKind, request: Request): Promise<GenerationParams<TKind>>;
export declare enum EventType {
    TEXT_MESSAGE_START = "TEXT_MESSAGE_START",
    TEXT_MESSAGE_CONTENT = "TEXT_MESSAGE_CONTENT",
    TEXT_MESSAGE_END = "TEXT_MESSAGE_END",
    TEXT_MESSAGE_CHUNK = "TEXT_MESSAGE_CHUNK",
    TOOL_CALL_START = "TOOL_CALL_START",
    TOOL_CALL_ARGS = "TOOL_CALL_ARGS",
    TOOL_CALL_END = "TOOL_CALL_END",
    TOOL_CALL_CHUNK = "TOOL_CALL_CHUNK",
    TOOL_CALL_RESULT = "TOOL_CALL_RESULT",
    THINKING_START = "THINKING_START",
    THINKING_END = "THINKING_END",
    THINKING_TEXT_MESSAGE_START = "THINKING_TEXT_MESSAGE_START",
    THINKING_TEXT_MESSAGE_CONTENT = "THINKING_TEXT_MESSAGE_CONTENT",
    THINKING_TEXT_MESSAGE_END = "THINKING_TEXT_MESSAGE_END",
    STATE_SNAPSHOT = "STATE_SNAPSHOT",
    STATE_DELTA = "STATE_DELTA",
    MESSAGES_SNAPSHOT = "MESSAGES_SNAPSHOT",
    ACTIVITY_SNAPSHOT = "ACTIVITY_SNAPSHOT",
    ACTIVITY_DELTA = "ACTIVITY_DELTA",
    RAW = "RAW",
    CUSTOM = "CUSTOM",
    RUN_STARTED = "RUN_STARTED",
    RUN_FINISHED = "RUN_FINISHED",
    RUN_ERROR = "RUN_ERROR",
    STEP_STARTED = "STEP_STARTED",
    STEP_FINISHED = "STEP_FINISHED",
    REASONING_START = "REASONING_START",
    REASONING_MESSAGE_START = "REASONING_MESSAGE_START",
    REASONING_MESSAGE_CONTENT = "REASONING_MESSAGE_CONTENT",
    REASONING_MESSAGE_END = "REASONING_MESSAGE_END",
    REASONING_MESSAGE_CHUNK = "REASONING_MESSAGE_CHUNK",
    REASONING_END = "REASONING_END",
    REASONING_ENCRYPTED_VALUE = "REASONING_ENCRYPTED_VALUE"
}
export { toolDefinition, type AnyClientTool, type ClientTool, type InferToolInput, type InferToolName, type InferToolOutput, type ApprovalCapabilityOf, type ApprovalSchemaConfig, type ApprovalSchemaOf, type InputSchemaOf, type OutputSchemaOf, type NoSchema, type ToolDefinition, type ToolDefinitionConfig, type ToolDefinitionInstance, } from './activities/chat/tools/tool-definition.js';
export { hashSchemaInput, normalizeApprovalSchema, type NormalizedApprovalSchema, type NormalizedSchemaInput, } from './activities/chat/tools/approval-schema.js';
export { canonicalInterruptJson, cloneAndDeepFreezeJson, digestInterruptJson, } from './interrupt-serialization.js';
export { convertSchemaToJsonSchema, isStandardSchema, parseWithStandardSchema, validateWithStandardSchema, } from './activities/chat/tools/schema-converter.js';
export { convertMessagesToModelMessages, generateMessageId, modelMessageToUIMessage, modelMessagesToUIMessages, normalizeToUIMessage, uiMessageToModelMessages, } from './activities/chat/messages.js';
export { BatchStrategy, CompositeStrategy, defaultJSONParser, ImmediateStrategy, parsePartialJSON, PartialJSONParser, PunctuationStrategy, StreamProcessor, WordBoundaryStrategy, } from './activities/chat/stream/index.js';
export type { ChunkRecording, ChunkStrategy, InternalToolCallState, JSONParser, ProcessorResult, ProcessorState, StreamProcessorEvents, StreamProcessorOptions, ToolCallState, ToolResultState, } from './activities/chat/stream/index.js';
export { uiMessagesToWire } from './utilities/ag-ui-wire.js';
export { mergeMetadata, tanstackMetadata, withTanstackMetadata, } from './utilities/merge-metadata.js';
export { fromSpecTokenUsage, toSpecTokenUsage } from './utilities/ag-ui-usage.js';
export type { SpecTokenUsage } from './utilities/ag-ui-usage.js';
export { normalizeStreamChunk } from './utilities/normalize-stream-chunk.js';
export { restoreInboundChunk } from './utilities/restore-inbound-chunk.js';
export type { AdapterYieldChunk } from './utilities/adapter-yield-chunk.js';
export { getChunkRunId, getChunkThreadId } from './utilities/chunk-ids.js';
export type { WireMessage } from './utilities/ag-ui-wire.js';
export type { AudioPart, ContentPart, ContentPartDataSource, ContentPartSource, ContentPartUrlSource, CustomEvent, DocumentPart, ImagePart, MediaInputMetadata, MediaInputRole, MediaPrompt, MediaPromptPart, MessagePart, ModelMessage, PersistedArtifactActivity, PersistedArtifactRef, PersistedArtifactRole, Interrupt, RunAgentResumeItem, RunErrorEvent, RunFinishedEvent, RunFinishedOutcome, SchemaInput, StreamChunk, StructuredOutputPart, TextPart, TanStackMessageMetadata, TanStackRunMetadata, ThinkingPart, ToolCall, ToolCallPart, ToolResultPart, UIMessage, UIResourcePart, VideoPart, InferSchemaType, } from './types.js';
export { INTERRUPT_BINDING_VERSION, canonicalizeInterruptResolutions, } from './interrupts.js';
export { defineInterrupt, hashInterruptDefinitionSchema, INTERRUPT_PAYLOAD_METADATA_KEY, } from './interrupt-definition.js';
export { INTERRUPT_CONTINUATION_METADATA_KEY, INTERRUPT_CONTINUATION_VERSION, genericInterruptContinuationFromDescriptor, readGenericInterruptContinuation, wrapGenericInterruptContinuation, } from './generic-interrupt-continuation.js';
export type { GenericInterruptContinuation, GenericInterruptContinuationReadResult, } from './generic-interrupt-continuation.js';
export type { GenericInterruptRequest, InterruptDefinition, } from './interrupt-definition.js';
export type { BatchInterruptError, BatchInterruptErrorCode, InterruptBinding, InterruptCorrelation, InterruptSubmissionError, ItemInterruptError, ItemInterruptErrorCode, ToolApprovalResolution, UnopenedInterruptBinding, } from './interrupts.js';
export { INTERRUPT_BINDING_METADATA_KEY, readInterruptBinding, readUnopenedInterruptBinding, withInterruptBinding, withoutInterruptBinding, } from './interrupt-resume.js';
export type { AudioVisualization, RealtimeAdapter, RealtimeConnection, RealtimeError, RealtimeErrorCode, RealtimeEvent, RealtimeEventHandler, RealtimeEventPayloads, RealtimeMessage, RealtimeMessagePart, RealtimeMode, RealtimeSessionConfig, RealtimeStatus, RealtimeToken, RealtimeAudioPart, RealtimeImagePart, RealtimeTextPart, RealtimeToolCallPart, RealtimeToolResultPart, VADConfig, } from './realtime/types.js';
