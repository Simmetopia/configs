import { t as EventType } from "./events-BaoNrGbE.mjs";
import { z } from "zod/v4";

//#region src/schemas.ts
const EventTypeSchema = z.enum([
	"TEXT_MESSAGE_START",
	"TEXT_MESSAGE_CONTENT",
	"TEXT_MESSAGE_END",
	"TEXT_MESSAGE_CHUNK",
	"TOOL_CALL_START",
	"TOOL_CALL_ARGS",
	"TOOL_CALL_END",
	"TOOL_CALL_CHUNK",
	"TOOL_CALL_RESULT",
	"THINKING_START",
	"THINKING_END",
	"THINKING_TEXT_MESSAGE_START",
	"THINKING_TEXT_MESSAGE_CONTENT",
	"THINKING_TEXT_MESSAGE_END",
	"STATE_SNAPSHOT",
	"STATE_DELTA",
	"MESSAGES_SNAPSHOT",
	"ACTIVITY_SNAPSHOT",
	"ACTIVITY_DELTA",
	"RAW",
	"CUSTOM",
	"RUN_STARTED",
	"RUN_FINISHED",
	"RUN_ERROR",
	"STEP_STARTED",
	"STEP_FINISHED",
	"REASONING_START",
	"REASONING_MESSAGE_START",
	"REASONING_MESSAGE_CONTENT",
	"REASONING_MESSAGE_END",
	"REASONING_MESSAGE_CHUNK",
	"REASONING_END",
	"REASONING_ENCRYPTED_VALUE"
]);
const FunctionCallSchema = z.object({
	name: z.string(),
	arguments: z.string()
});
const ToolCallSchema = z.object({
	id: z.string(),
	type: z.literal("function"),
	function: FunctionCallSchema,
	encryptedValue: z.string().optional()
});
const TextInputContentSchema = z.object({
	type: z.literal("text"),
	text: z.string()
});
const InputContentDataSourceSchema = z.object({
	type: z.literal("data"),
	value: z.string(),
	mimeType: z.string()
});
const InputContentUrlSourceSchema = z.object({
	type: z.literal("url"),
	value: z.string(),
	mimeType: z.string().optional()
});
const InputContentSourceSchema = z.discriminatedUnion("type", [InputContentDataSourceSchema, InputContentUrlSourceSchema]);
const ImageInputContentSchema = z.object({
	type: z.literal("image"),
	source: InputContentSourceSchema,
	metadata: z.unknown().optional()
});
const AudioInputContentSchema = z.object({
	type: z.literal("audio"),
	source: InputContentSourceSchema,
	metadata: z.unknown().optional()
});
const VideoInputContentSchema = z.object({
	type: z.literal("video"),
	source: InputContentSourceSchema,
	metadata: z.unknown().optional()
});
const DocumentInputContentSchema = z.object({
	type: z.literal("document"),
	source: InputContentSourceSchema,
	metadata: z.unknown().optional()
});
const ImageInputPartSchema = ImageInputContentSchema;
const AudioInputPartSchema = AudioInputContentSchema;
const VideoInputPartSchema = VideoInputContentSchema;
const DocumentInputPartSchema = DocumentInputContentSchema;
const BinaryInputContentSchema = z.object({
	type: z.literal("binary"),
	mimeType: z.string(),
	id: z.string().optional(),
	url: z.string().optional(),
	data: z.string().optional(),
	filename: z.string().optional()
}).refine((value) => Boolean(value.id || value.url || value.data), { message: "BinaryInputContent requires at least one of id, url, or data." });
const InputContentSchema = z.discriminatedUnion("type", [
	TextInputContentSchema,
	ImageInputContentSchema,
	AudioInputContentSchema,
	VideoInputContentSchema,
	DocumentInputContentSchema,
	z.object({
		type: z.literal("binary"),
		mimeType: z.string(),
		id: z.string().optional(),
		url: z.string().optional(),
		data: z.string().optional(),
		filename: z.string().optional()
	})
]).refine((value) => {
	if (value.type === "binary") return Boolean(value.id || value.url || value.data);
	return true;
}, { message: "BinaryInputContent requires at least one of id, url, or data." });
const InputContentPartSchema = InputContentSchema;
const BaseMessageSchema = z.object({
	id: z.string(),
	name: z.string().optional(),
	encryptedValue: z.string().optional()
});
const DeveloperMessageSchema = BaseMessageSchema.extend({
	role: z.literal("developer"),
	content: z.string()
});
const SystemMessageSchema = BaseMessageSchema.extend({
	role: z.literal("system"),
	content: z.string()
});
const AssistantMessageSchema = BaseMessageSchema.extend({
	role: z.literal("assistant"),
	content: z.string().optional(),
	toolCalls: z.array(ToolCallSchema).optional()
});
const UserMessageSchema = BaseMessageSchema.extend({
	role: z.literal("user"),
	content: z.union([z.string(), z.array(InputContentSchema)])
});
const ToolMessageSchema = z.object({
	id: z.string(),
	content: z.string(),
	role: z.literal("tool"),
	toolCallId: z.string(),
	error: z.string().optional(),
	encryptedValue: z.string().optional()
});
const ActivityMessageSchema = z.object({
	id: z.string(),
	role: z.literal("activity"),
	activityType: z.string(),
	content: z.record(z.string(), z.any())
});
const ReasoningMessageSchema = z.object({
	id: z.string(),
	role: z.literal("reasoning"),
	content: z.string(),
	encryptedValue: z.string().optional()
});
const MessageSchema = z.discriminatedUnion("role", [
	DeveloperMessageSchema,
	SystemMessageSchema,
	AssistantMessageSchema,
	UserMessageSchema,
	ToolMessageSchema,
	ActivityMessageSchema,
	ReasoningMessageSchema
]);
const RoleSchema = z.union([
	z.literal("developer"),
	z.literal("system"),
	z.literal("assistant"),
	z.literal("user"),
	z.literal("tool"),
	z.literal("activity"),
	z.literal("reasoning")
]);
const ContextSchema = z.object({
	description: z.string(),
	value: z.string()
});
const ToolSchema = z.object({
	name: z.string(),
	description: z.string(),
	parameters: z.any().optional(),
	metadata: z.record(z.string(), z.any()).optional()
});
const InterruptSchema = z.object({
	id: z.string(),
	reason: z.string(),
	message: z.string().optional(),
	toolCallId: z.string().optional(),
	responseSchema: z.record(z.string(), z.any()).optional(),
	expiresAt: z.string().optional(),
	metadata: z.record(z.string(), z.any()).optional()
});
const ResumeEntrySchema = z.object({
	interruptId: z.string(),
	status: z.enum(["resolved", "cancelled"]),
	payload: z.any().optional()
});
const RunAgentInputSchema = z.object({
	threadId: z.string(),
	runId: z.string(),
	parentRunId: z.string().optional(),
	state: z.any().optional(),
	messages: z.array(MessageSchema),
	tools: z.array(ToolSchema),
	context: z.array(ContextSchema),
	forwardedProps: z.any().optional(),
	resume: z.array(ResumeEntrySchema).optional()
});
const StateSchema = z.any();
const TextMessageRoleSchema = z.union([
	z.literal("developer"),
	z.literal("system"),
	z.literal("assistant"),
	z.literal("user")
]);
const BaseEventSchema = z.object({
	type: EventTypeSchema,
	timestamp: z.number().optional(),
	rawEvent: z.any().optional()
}).passthrough();
const TextMessageStartEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.TEXT_MESSAGE_START),
	messageId: z.string(),
	role: TextMessageRoleSchema.default("assistant"),
	name: z.string().optional()
});
const TextMessageContentEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.TEXT_MESSAGE_CONTENT),
	messageId: z.string(),
	delta: z.string()
});
const TextMessageEndEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.TEXT_MESSAGE_END),
	messageId: z.string()
});
const TextMessageChunkEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.TEXT_MESSAGE_CHUNK),
	messageId: z.string().optional(),
	role: TextMessageRoleSchema.optional(),
	delta: z.string().optional(),
	name: z.string().optional()
});
/**
* @deprecated Use ReasoningTextMessageStartEventSchema instead. Will be removed in 1.0.0.
*/
const ThinkingTextMessageStartEventSchema = BaseEventSchema.extend({ type: z.literal(EventType.THINKING_TEXT_MESSAGE_START) });
/**
* @deprecated Use ReasoningMessageContentEventSchema instead. Will be removed in 1.0.0.
*/
const ThinkingTextMessageContentEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.THINKING_TEXT_MESSAGE_CONTENT),
	delta: z.string()
});
/**
* @deprecated Use ReasoningMessageEndEventSchema instead. Will be removed in 1.0.0.
*/
const ThinkingTextMessageEndEventSchema = BaseEventSchema.extend({ type: z.literal(EventType.THINKING_TEXT_MESSAGE_END) });
const ToolCallStartEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.TOOL_CALL_START),
	toolCallId: z.string(),
	toolCallName: z.string(),
	parentMessageId: z.string().nullable().optional().transform((v) => v ?? void 0)
});
const ToolCallArgsEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.TOOL_CALL_ARGS),
	toolCallId: z.string(),
	delta: z.string()
});
const ToolCallEndEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.TOOL_CALL_END),
	toolCallId: z.string()
});
const ToolCallResultEventSchema = BaseEventSchema.extend({
	messageId: z.string(),
	type: z.literal(EventType.TOOL_CALL_RESULT),
	toolCallId: z.string(),
	content: z.string(),
	role: z.literal("tool").optional()
});
const ToolCallChunkEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.TOOL_CALL_CHUNK),
	toolCallId: z.string().optional(),
	toolCallName: z.string().optional(),
	parentMessageId: z.string().nullable().optional().transform((v) => v ?? void 0),
	delta: z.string().optional()
});
/**
* @deprecated Use ReasoningStartEventSchema instead. Will be removed in 1.0.0.
*/
const ThinkingStartEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.THINKING_START),
	title: z.string().optional()
});
/**
* @deprecated Use ReasoningEndEventSchema instead. Will be removed in 1.0.0.
*/
const ThinkingEndEventSchema = BaseEventSchema.extend({ type: z.literal(EventType.THINKING_END) });
const StateSnapshotEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.STATE_SNAPSHOT),
	snapshot: StateSchema.optional()
});
const StateDeltaEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.STATE_DELTA),
	delta: z.array(z.any())
});
const MessagesSnapshotEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.MESSAGES_SNAPSHOT),
	messages: z.array(MessageSchema)
});
const ActivitySnapshotEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.ACTIVITY_SNAPSHOT),
	messageId: z.string(),
	activityType: z.string(),
	content: z.record(z.string(), z.any()),
	replace: z.boolean().optional().default(true)
});
const ActivityDeltaEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.ACTIVITY_DELTA),
	messageId: z.string(),
	activityType: z.string(),
	patch: z.array(z.any())
});
const RawEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.RAW),
	event: z.any().optional(),
	source: z.string().optional()
});
const CustomEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.CUSTOM),
	name: z.string(),
	value: z.any().optional()
});
const RunStartedEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.RUN_STARTED),
	threadId: z.string(),
	runId: z.string(),
	parentRunId: z.string().optional(),
	input: RunAgentInputSchema.optional()
});
const RunFinishedSuccessOutcomeSchema = z.object({ type: z.literal("success") }).strict();
const RunFinishedInterruptOutcomeSchema = z.object({
	type: z.literal("interrupt"),
	interrupts: z.array(InterruptSchema).min(1)
}).strict();
const RunFinishedOutcomeSchema = z.discriminatedUnion("type", [RunFinishedSuccessOutcomeSchema, RunFinishedInterruptOutcomeSchema]);
const RunFinishedEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.RUN_FINISHED),
	threadId: z.string(),
	runId: z.string(),
	result: z.any().optional(),
	outcome: RunFinishedOutcomeSchema.nullable().optional().transform((v) => v ?? void 0)
});
const RunErrorEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.RUN_ERROR),
	message: z.string(),
	code: z.string().optional()
});
const StepStartedEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.STEP_STARTED),
	stepName: z.string()
});
const StepFinishedEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.STEP_FINISHED),
	stepName: z.string()
});
const ReasoningEncryptedValueSubtypeSchema = z.union([z.literal("tool-call"), z.literal("message")]);
const ReasoningStartEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.REASONING_START),
	messageId: z.string()
});
const ReasoningMessageStartEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.REASONING_MESSAGE_START),
	messageId: z.string(),
	role: z.literal("reasoning")
});
const ReasoningMessageContentEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.REASONING_MESSAGE_CONTENT),
	messageId: z.string(),
	delta: z.string()
});
const ReasoningMessageEndEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.REASONING_MESSAGE_END),
	messageId: z.string()
});
const ReasoningMessageChunkEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.REASONING_MESSAGE_CHUNK),
	messageId: z.string().optional(),
	delta: z.string().optional()
});
const ReasoningEndEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.REASONING_END),
	messageId: z.string()
});
const ReasoningEncryptedValueEventSchema = BaseEventSchema.extend({
	type: z.literal(EventType.REASONING_ENCRYPTED_VALUE),
	subtype: ReasoningEncryptedValueSubtypeSchema,
	entityId: z.string(),
	encryptedValue: z.string()
});
/**
* Discriminated union of all AG-UI event schemas. Suitable for validating
* untrusted event payloads from the wire.
*/
const EventSchemas = z.discriminatedUnion("type", [
	TextMessageStartEventSchema,
	TextMessageContentEventSchema,
	TextMessageEndEventSchema,
	TextMessageChunkEventSchema,
	ThinkingStartEventSchema,
	ThinkingEndEventSchema,
	ThinkingTextMessageStartEventSchema,
	ThinkingTextMessageContentEventSchema,
	ThinkingTextMessageEndEventSchema,
	ToolCallStartEventSchema,
	ToolCallArgsEventSchema,
	ToolCallEndEventSchema,
	ToolCallChunkEventSchema,
	ToolCallResultEventSchema,
	StateSnapshotEventSchema,
	StateDeltaEventSchema,
	MessagesSnapshotEventSchema,
	ActivitySnapshotEventSchema,
	ActivityDeltaEventSchema,
	RawEventSchema,
	CustomEventSchema,
	RunStartedEventSchema,
	RunFinishedEventSchema,
	RunErrorEventSchema,
	StepStartedEventSchema,
	StepFinishedEventSchema,
	ReasoningStartEventSchema,
	ReasoningMessageStartEventSchema,
	ReasoningMessageContentEventSchema,
	ReasoningMessageEndEventSchema,
	ReasoningMessageChunkEventSchema,
	ReasoningEndEventSchema,
	ReasoningEncryptedValueEventSchema
]);
/** Describes a sub-agent that can be invoked by a parent agent. */
const SubAgentInfoSchema = z.object({
	name: z.string(),
	description: z.string().optional()
});
/**
* Basic metadata about the agent. Useful for discovery UIs, agent marketplaces,
* and debugging.
*/
const IdentityCapabilitiesSchema = z.object({
	name: z.string().optional(),
	type: z.string().optional(),
	description: z.string().optional(),
	version: z.string().optional(),
	provider: z.string().optional(),
	documentationUrl: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
});
/**
* Declares which transport mechanisms the agent supports.
*/
const TransportCapabilitiesSchema = z.object({
	streaming: z.boolean().optional(),
	websocket: z.boolean().optional(),
	httpBinary: z.boolean().optional(),
	pushNotifications: z.boolean().optional(),
	resumable: z.boolean().optional()
});
/**
* Tool calling capabilities.
*/
const ToolsCapabilitiesSchema = z.object({
	supported: z.boolean().optional(),
	items: z.array(ToolSchema).optional(),
	parallelCalls: z.boolean().optional(),
	clientProvided: z.boolean().optional()
});
/**
* Output format support.
*/
const OutputCapabilitiesSchema = z.object({
	structuredOutput: z.boolean().optional(),
	supportedMimeTypes: z.array(z.string()).optional()
});
/**
* State and memory management capabilities.
*/
const StateCapabilitiesSchema = z.object({
	snapshots: z.boolean().optional(),
	deltas: z.boolean().optional(),
	memory: z.boolean().optional(),
	persistentState: z.boolean().optional()
});
/**
* Multi-agent coordination capabilities.
*/
const MultiAgentCapabilitiesSchema = z.object({
	supported: z.boolean().optional(),
	delegation: z.boolean().optional(),
	handoffs: z.boolean().optional(),
	subAgents: z.array(SubAgentInfoSchema).optional()
});
/**
* Reasoning and thinking capabilities.
*/
const ReasoningCapabilitiesSchema = z.object({
	supported: z.boolean().optional(),
	streaming: z.boolean().optional(),
	encrypted: z.boolean().optional()
});
/**
* Modalities the agent can accept as input.
*/
const MultimodalInputCapabilitiesSchema = z.object({
	image: z.boolean().optional(),
	audio: z.boolean().optional(),
	video: z.boolean().optional(),
	pdf: z.boolean().optional(),
	file: z.boolean().optional()
});
/**
* Modalities the agent can produce as output.
*/
const MultimodalOutputCapabilitiesSchema = z.object({
	image: z.boolean().optional(),
	audio: z.boolean().optional()
});
/**
* Multimodal input and output support.
*/
const MultimodalCapabilitiesSchema = z.object({
	input: MultimodalInputCapabilitiesSchema.optional(),
	output: MultimodalOutputCapabilitiesSchema.optional()
});
/**
* Execution control and limits.
*/
const ExecutionCapabilitiesSchema = z.object({
	codeExecution: z.boolean().optional(),
	sandboxed: z.boolean().optional(),
	maxIterations: z.number().optional(),
	maxExecutionTime: z.number().optional()
});
/**
* Human-in-the-loop interaction support.
*/
const HumanInTheLoopCapabilitiesSchema = z.object({
	supported: z.boolean().optional(),
	approvals: z.boolean().optional(),
	interventions: z.boolean().optional(),
	feedback: z.boolean().optional(),
	interrupts: z.boolean().optional(),
	approveWithEdits: z.boolean().optional()
});
/**
* A typed, categorized snapshot of an agent's current capabilities.
* Returned by `getCapabilities()` on `AbstractAgent`.
*/
const AgentCapabilitiesSchema = z.object({
	identity: IdentityCapabilitiesSchema.optional(),
	transport: TransportCapabilitiesSchema.optional(),
	tools: ToolsCapabilitiesSchema.optional(),
	output: OutputCapabilitiesSchema.optional(),
	state: StateCapabilitiesSchema.optional(),
	multiAgent: MultiAgentCapabilitiesSchema.optional(),
	reasoning: ReasoningCapabilitiesSchema.optional(),
	multimodal: MultimodalCapabilitiesSchema.optional(),
	execution: ExecutionCapabilitiesSchema.optional(),
	humanInTheLoop: HumanInTheLoopCapabilitiesSchema.optional(),
	custom: z.record(z.string(), z.unknown()).optional()
});

//#endregion
//#region src/event-factories.ts
const buildEvent = (eventType, schema, props) => schema.parse({
	...props,
	type: eventType
});
/** Creates a TEXT_MESSAGE_START event. `role` defaults to `"assistant"` when omitted. */
const createTextMessageStartEvent = (props) => buildEvent(EventType.TEXT_MESSAGE_START, TextMessageStartEventSchema, props);
/** Creates a TEXT_MESSAGE_CONTENT event. */
const createTextMessageContentEvent = (props) => buildEvent(EventType.TEXT_MESSAGE_CONTENT, TextMessageContentEventSchema, props);
/** Creates a TEXT_MESSAGE_END event. */
const createTextMessageEndEvent = (props) => buildEvent(EventType.TEXT_MESSAGE_END, TextMessageEndEventSchema, props);
/** Creates a TEXT_MESSAGE_CHUNK event. */
const createTextMessageChunkEvent = (props) => buildEvent(EventType.TEXT_MESSAGE_CHUNK, TextMessageChunkEventSchema, props);
/** @deprecated Use `createReasoningMessageStartEvent` instead. Will be removed in 1.0.0. */
const createThinkingTextMessageStartEvent = (props) => buildEvent(EventType.THINKING_TEXT_MESSAGE_START, ThinkingTextMessageStartEventSchema, props);
/** @deprecated Use `createReasoningMessageContentEvent` instead. Will be removed in 1.0.0. */
const createThinkingTextMessageContentEvent = (props) => buildEvent(EventType.THINKING_TEXT_MESSAGE_CONTENT, ThinkingTextMessageContentEventSchema, props);
/** @deprecated Use `createReasoningMessageEndEvent` instead. Will be removed in 1.0.0. */
const createThinkingTextMessageEndEvent = (props) => buildEvent(EventType.THINKING_TEXT_MESSAGE_END, ThinkingTextMessageEndEventSchema, props);
/** Creates a TOOL_CALL_START event. */
const createToolCallStartEvent = (props) => buildEvent(EventType.TOOL_CALL_START, ToolCallStartEventSchema, props);
/** Creates a TOOL_CALL_ARGS event. */
const createToolCallArgsEvent = (props) => buildEvent(EventType.TOOL_CALL_ARGS, ToolCallArgsEventSchema, props);
/** Creates a TOOL_CALL_END event. */
const createToolCallEndEvent = (props) => buildEvent(EventType.TOOL_CALL_END, ToolCallEndEventSchema, props);
/** Creates a TOOL_CALL_CHUNK event. */
const createToolCallChunkEvent = (props) => buildEvent(EventType.TOOL_CALL_CHUNK, ToolCallChunkEventSchema, props);
/** Creates a TOOL_CALL_RESULT event. */
const createToolCallResultEvent = (props) => buildEvent(EventType.TOOL_CALL_RESULT, ToolCallResultEventSchema, props);
/** @deprecated Use `createReasoningStartEvent` instead. Will be removed in 1.0.0. */
const createThinkingStartEvent = (props) => buildEvent(EventType.THINKING_START, ThinkingStartEventSchema, props);
/** @deprecated Use `createReasoningEndEvent` instead. Will be removed in 1.0.0. */
const createThinkingEndEvent = (props) => buildEvent(EventType.THINKING_END, ThinkingEndEventSchema, props);
/** Creates a STATE_SNAPSHOT event. */
const createStateSnapshotEvent = (props) => buildEvent(EventType.STATE_SNAPSHOT, StateSnapshotEventSchema, props);
/** Creates a STATE_DELTA event. */
const createStateDeltaEvent = (props) => buildEvent(EventType.STATE_DELTA, StateDeltaEventSchema, props);
/** Creates a MESSAGES_SNAPSHOT event. */
const createMessagesSnapshotEvent = (props) => buildEvent(EventType.MESSAGES_SNAPSHOT, MessagesSnapshotEventSchema, props);
/** Creates an ACTIVITY_SNAPSHOT event. `replace` defaults to `true` when omitted. */
const createActivitySnapshotEvent = (props) => buildEvent(EventType.ACTIVITY_SNAPSHOT, ActivitySnapshotEventSchema, props);
/** Creates an ACTIVITY_DELTA event. */
const createActivityDeltaEvent = (props) => buildEvent(EventType.ACTIVITY_DELTA, ActivityDeltaEventSchema, props);
/** Creates a RAW event. */
const createRawEvent = (props) => buildEvent(EventType.RAW, RawEventSchema, props);
/** Creates a CUSTOM event. */
const createCustomEvent = (props) => buildEvent(EventType.CUSTOM, CustomEventSchema, props);
/** Creates a RUN_STARTED event. */
const createRunStartedEvent = (props) => buildEvent(EventType.RUN_STARTED, RunStartedEventSchema, props);
/**
* Creates a RUN_FINISHED event.
*
* `outcome` is optional. Omit it for legacy/back-compat behavior, or set it
* explicitly to `{ type: "success" }` or `{ type: "interrupt", interrupts }` —
* see `createRunFinishedSuccessEvent` and `createRunFinishedInterruptEvent` for
* convenience helpers. `outcome: null` is normalized to `outcome` being omitted.
*/
const createRunFinishedEvent = (props) => buildEvent(EventType.RUN_FINISHED, RunFinishedEventSchema, props);
/** Creates a RUN_FINISHED event with `outcome: { type: "success" }`. */
const createRunFinishedSuccessEvent = (props) => buildEvent(EventType.RUN_FINISHED, RunFinishedEventSchema, {
	...props,
	outcome: { type: "success" }
});
/**
* Creates a RUN_FINISHED event with `outcome: { type: "interrupt", interrupts }`.
* Throws if `interrupts` is empty (the schema requires at least one entry).
*/
const createRunFinishedInterruptEvent = (props) => {
	const { interrupts, ...rest } = props;
	return buildEvent(EventType.RUN_FINISHED, RunFinishedEventSchema, {
		...rest,
		outcome: {
			type: "interrupt",
			interrupts
		}
	});
};
/** Creates a RUN_ERROR event. */
const createRunErrorEvent = (props) => buildEvent(EventType.RUN_ERROR, RunErrorEventSchema, props);
/** Creates a STEP_STARTED event. */
const createStepStartedEvent = (props) => buildEvent(EventType.STEP_STARTED, StepStartedEventSchema, props);
/** Creates a STEP_FINISHED event. */
const createStepFinishedEvent = (props) => buildEvent(EventType.STEP_FINISHED, StepFinishedEventSchema, props);
/** Creates a REASONING_START event. */
const createReasoningStartEvent = (props) => buildEvent(EventType.REASONING_START, ReasoningStartEventSchema, props);
/** Creates a REASONING_MESSAGE_START event. */
const createReasoningMessageStartEvent = (props) => buildEvent(EventType.REASONING_MESSAGE_START, ReasoningMessageStartEventSchema, props);
/** Creates a REASONING_MESSAGE_CONTENT event. */
const createReasoningMessageContentEvent = (props) => buildEvent(EventType.REASONING_MESSAGE_CONTENT, ReasoningMessageContentEventSchema, props);
/** Creates a REASONING_MESSAGE_END event. */
const createReasoningMessageEndEvent = (props) => buildEvent(EventType.REASONING_MESSAGE_END, ReasoningMessageEndEventSchema, props);
/** Creates a REASONING_MESSAGE_CHUNK event. */
const createReasoningMessageChunkEvent = (props) => buildEvent(EventType.REASONING_MESSAGE_CHUNK, ReasoningMessageChunkEventSchema, props);
/** Creates a REASONING_END event. */
const createReasoningEndEvent = (props) => buildEvent(EventType.REASONING_END, ReasoningEndEventSchema, props);
/** Creates a REASONING_ENCRYPTED_VALUE event. */
const createReasoningEncryptedValueEvent = (props) => buildEvent(EventType.REASONING_ENCRYPTED_VALUE, ReasoningEncryptedValueEventSchema, props);

//#endregion
export { ActivityDeltaEventSchema, ActivityMessageSchema, ActivitySnapshotEventSchema, AgentCapabilitiesSchema, AssistantMessageSchema, AudioInputContentSchema, AudioInputPartSchema, BaseEventSchema, BinaryInputContentSchema, ContextSchema, CustomEventSchema, DeveloperMessageSchema, DocumentInputContentSchema, DocumentInputPartSchema, EventSchemas, EventTypeSchema, ExecutionCapabilitiesSchema, FunctionCallSchema, HumanInTheLoopCapabilitiesSchema, IdentityCapabilitiesSchema, ImageInputContentSchema, ImageInputPartSchema, InputContentDataSourceSchema, InputContentPartSchema, InputContentSchema, InputContentSourceSchema, InputContentUrlSourceSchema, InterruptSchema, MessageSchema, MessagesSnapshotEventSchema, MultiAgentCapabilitiesSchema, MultimodalCapabilitiesSchema, MultimodalInputCapabilitiesSchema, MultimodalOutputCapabilitiesSchema, OutputCapabilitiesSchema, RawEventSchema, ReasoningCapabilitiesSchema, ReasoningEncryptedValueEventSchema, ReasoningEncryptedValueSubtypeSchema, ReasoningEndEventSchema, ReasoningMessageChunkEventSchema, ReasoningMessageContentEventSchema, ReasoningMessageEndEventSchema, ReasoningMessageSchema, ReasoningMessageStartEventSchema, ReasoningStartEventSchema, ResumeEntrySchema, RoleSchema, RunAgentInputSchema, RunErrorEventSchema, RunFinishedEventSchema, RunFinishedInterruptOutcomeSchema, RunFinishedOutcomeSchema, RunFinishedSuccessOutcomeSchema, RunStartedEventSchema, StateCapabilitiesSchema, StateDeltaEventSchema, StateSchema, StateSnapshotEventSchema, StepFinishedEventSchema, StepStartedEventSchema, SubAgentInfoSchema, SystemMessageSchema, TextInputContentSchema, TextMessageChunkEventSchema, TextMessageContentEventSchema, TextMessageEndEventSchema, TextMessageStartEventSchema, ThinkingEndEventSchema, ThinkingStartEventSchema, ThinkingTextMessageContentEventSchema, ThinkingTextMessageEndEventSchema, ThinkingTextMessageStartEventSchema, ToolCallArgsEventSchema, ToolCallChunkEventSchema, ToolCallEndEventSchema, ToolCallResultEventSchema, ToolCallSchema, ToolCallStartEventSchema, ToolMessageSchema, ToolSchema, ToolsCapabilitiesSchema, TransportCapabilitiesSchema, UserMessageSchema, VideoInputContentSchema, VideoInputPartSchema, createActivityDeltaEvent, createActivitySnapshotEvent, createCustomEvent, createMessagesSnapshotEvent, createRawEvent, createReasoningEncryptedValueEvent, createReasoningEndEvent, createReasoningMessageChunkEvent, createReasoningMessageContentEvent, createReasoningMessageEndEvent, createReasoningMessageStartEvent, createReasoningStartEvent, createRunErrorEvent, createRunFinishedEvent, createRunFinishedInterruptEvent, createRunFinishedSuccessEvent, createRunStartedEvent, createStateDeltaEvent, createStateSnapshotEvent, createStepFinishedEvent, createStepStartedEvent, createTextMessageChunkEvent, createTextMessageContentEvent, createTextMessageEndEvent, createTextMessageStartEvent, createThinkingEndEvent, createThinkingStartEvent, createThinkingTextMessageContentEvent, createThinkingTextMessageEndEvent, createThinkingTextMessageStartEvent, createToolCallArgsEvent, createToolCallChunkEvent, createToolCallEndEvent, createToolCallResultEvent, createToolCallStartEvent };
//# sourceMappingURL=schemas.mjs.map