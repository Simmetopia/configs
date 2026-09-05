const require_events = require('./events-CMtdFXWl.js');
let zod_v4 = require("zod/v4");

//#region src/schemas.ts
const EventTypeSchema = zod_v4.z.enum([
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
const FunctionCallSchema = zod_v4.z.object({
	name: zod_v4.z.string(),
	arguments: zod_v4.z.string()
});
const ToolCallSchema = zod_v4.z.object({
	id: zod_v4.z.string(),
	type: zod_v4.z.literal("function"),
	function: FunctionCallSchema,
	encryptedValue: zod_v4.z.string().optional()
});
const TextInputContentSchema = zod_v4.z.object({
	type: zod_v4.z.literal("text"),
	text: zod_v4.z.string()
});
const InputContentDataSourceSchema = zod_v4.z.object({
	type: zod_v4.z.literal("data"),
	value: zod_v4.z.string(),
	mimeType: zod_v4.z.string()
});
const InputContentUrlSourceSchema = zod_v4.z.object({
	type: zod_v4.z.literal("url"),
	value: zod_v4.z.string(),
	mimeType: zod_v4.z.string().optional()
});
const InputContentSourceSchema = zod_v4.z.discriminatedUnion("type", [InputContentDataSourceSchema, InputContentUrlSourceSchema]);
const ImageInputContentSchema = zod_v4.z.object({
	type: zod_v4.z.literal("image"),
	source: InputContentSourceSchema,
	metadata: zod_v4.z.unknown().optional()
});
const AudioInputContentSchema = zod_v4.z.object({
	type: zod_v4.z.literal("audio"),
	source: InputContentSourceSchema,
	metadata: zod_v4.z.unknown().optional()
});
const VideoInputContentSchema = zod_v4.z.object({
	type: zod_v4.z.literal("video"),
	source: InputContentSourceSchema,
	metadata: zod_v4.z.unknown().optional()
});
const DocumentInputContentSchema = zod_v4.z.object({
	type: zod_v4.z.literal("document"),
	source: InputContentSourceSchema,
	metadata: zod_v4.z.unknown().optional()
});
const ImageInputPartSchema = ImageInputContentSchema;
const AudioInputPartSchema = AudioInputContentSchema;
const VideoInputPartSchema = VideoInputContentSchema;
const DocumentInputPartSchema = DocumentInputContentSchema;
const BinaryInputContentSchema = zod_v4.z.object({
	type: zod_v4.z.literal("binary"),
	mimeType: zod_v4.z.string(),
	id: zod_v4.z.string().optional(),
	url: zod_v4.z.string().optional(),
	data: zod_v4.z.string().optional(),
	filename: zod_v4.z.string().optional()
}).refine((value) => Boolean(value.id || value.url || value.data), { message: "BinaryInputContent requires at least one of id, url, or data." });
const InputContentSchema = zod_v4.z.discriminatedUnion("type", [
	TextInputContentSchema,
	ImageInputContentSchema,
	AudioInputContentSchema,
	VideoInputContentSchema,
	DocumentInputContentSchema,
	zod_v4.z.object({
		type: zod_v4.z.literal("binary"),
		mimeType: zod_v4.z.string(),
		id: zod_v4.z.string().optional(),
		url: zod_v4.z.string().optional(),
		data: zod_v4.z.string().optional(),
		filename: zod_v4.z.string().optional()
	})
]).refine((value) => {
	if (value.type === "binary") return Boolean(value.id || value.url || value.data);
	return true;
}, { message: "BinaryInputContent requires at least one of id, url, or data." });
const InputContentPartSchema = InputContentSchema;
const BaseMessageSchema = zod_v4.z.object({
	id: zod_v4.z.string(),
	name: zod_v4.z.string().optional(),
	encryptedValue: zod_v4.z.string().optional()
});
const DeveloperMessageSchema = BaseMessageSchema.extend({
	role: zod_v4.z.literal("developer"),
	content: zod_v4.z.string()
});
const SystemMessageSchema = BaseMessageSchema.extend({
	role: zod_v4.z.literal("system"),
	content: zod_v4.z.string()
});
const AssistantMessageSchema = BaseMessageSchema.extend({
	role: zod_v4.z.literal("assistant"),
	content: zod_v4.z.string().optional(),
	toolCalls: zod_v4.z.array(ToolCallSchema).optional()
});
const UserMessageSchema = BaseMessageSchema.extend({
	role: zod_v4.z.literal("user"),
	content: zod_v4.z.union([zod_v4.z.string(), zod_v4.z.array(InputContentSchema)])
});
const ToolMessageSchema = zod_v4.z.object({
	id: zod_v4.z.string(),
	content: zod_v4.z.string(),
	role: zod_v4.z.literal("tool"),
	toolCallId: zod_v4.z.string(),
	error: zod_v4.z.string().optional(),
	encryptedValue: zod_v4.z.string().optional()
});
const ActivityMessageSchema = zod_v4.z.object({
	id: zod_v4.z.string(),
	role: zod_v4.z.literal("activity"),
	activityType: zod_v4.z.string(),
	content: zod_v4.z.record(zod_v4.z.string(), zod_v4.z.any())
});
const ReasoningMessageSchema = zod_v4.z.object({
	id: zod_v4.z.string(),
	role: zod_v4.z.literal("reasoning"),
	content: zod_v4.z.string(),
	encryptedValue: zod_v4.z.string().optional()
});
const MessageSchema = zod_v4.z.discriminatedUnion("role", [
	DeveloperMessageSchema,
	SystemMessageSchema,
	AssistantMessageSchema,
	UserMessageSchema,
	ToolMessageSchema,
	ActivityMessageSchema,
	ReasoningMessageSchema
]);
const RoleSchema = zod_v4.z.union([
	zod_v4.z.literal("developer"),
	zod_v4.z.literal("system"),
	zod_v4.z.literal("assistant"),
	zod_v4.z.literal("user"),
	zod_v4.z.literal("tool"),
	zod_v4.z.literal("activity"),
	zod_v4.z.literal("reasoning")
]);
const ContextSchema = zod_v4.z.object({
	description: zod_v4.z.string(),
	value: zod_v4.z.string()
});
const ToolSchema = zod_v4.z.object({
	name: zod_v4.z.string(),
	description: zod_v4.z.string(),
	parameters: zod_v4.z.any().optional(),
	metadata: zod_v4.z.record(zod_v4.z.string(), zod_v4.z.any()).optional()
});
const InterruptSchema = zod_v4.z.object({
	id: zod_v4.z.string(),
	reason: zod_v4.z.string(),
	message: zod_v4.z.string().optional(),
	toolCallId: zod_v4.z.string().optional(),
	responseSchema: zod_v4.z.record(zod_v4.z.string(), zod_v4.z.any()).optional(),
	expiresAt: zod_v4.z.string().optional(),
	metadata: zod_v4.z.record(zod_v4.z.string(), zod_v4.z.any()).optional()
});
const ResumeEntrySchema = zod_v4.z.object({
	interruptId: zod_v4.z.string(),
	status: zod_v4.z.enum(["resolved", "cancelled"]),
	payload: zod_v4.z.any().optional()
});
const RunAgentInputSchema = zod_v4.z.object({
	threadId: zod_v4.z.string(),
	runId: zod_v4.z.string(),
	parentRunId: zod_v4.z.string().optional(),
	state: zod_v4.z.any().optional(),
	messages: zod_v4.z.array(MessageSchema),
	tools: zod_v4.z.array(ToolSchema),
	context: zod_v4.z.array(ContextSchema),
	forwardedProps: zod_v4.z.any().optional(),
	resume: zod_v4.z.array(ResumeEntrySchema).optional()
});
const StateSchema = zod_v4.z.any();
const TextMessageRoleSchema = zod_v4.z.union([
	zod_v4.z.literal("developer"),
	zod_v4.z.literal("system"),
	zod_v4.z.literal("assistant"),
	zod_v4.z.literal("user")
]);
const BaseEventSchema = zod_v4.z.object({
	type: EventTypeSchema,
	timestamp: zod_v4.z.number().optional(),
	rawEvent: zod_v4.z.any().optional()
}).passthrough();
const TextMessageStartEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.TEXT_MESSAGE_START),
	messageId: zod_v4.z.string(),
	role: TextMessageRoleSchema.default("assistant"),
	name: zod_v4.z.string().optional()
});
const TextMessageContentEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.TEXT_MESSAGE_CONTENT),
	messageId: zod_v4.z.string(),
	delta: zod_v4.z.string()
});
const TextMessageEndEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.TEXT_MESSAGE_END),
	messageId: zod_v4.z.string()
});
const TextMessageChunkEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.TEXT_MESSAGE_CHUNK),
	messageId: zod_v4.z.string().optional(),
	role: TextMessageRoleSchema.optional(),
	delta: zod_v4.z.string().optional(),
	name: zod_v4.z.string().optional()
});
/**
* @deprecated Use ReasoningTextMessageStartEventSchema instead. Will be removed in 1.0.0.
*/
const ThinkingTextMessageStartEventSchema = BaseEventSchema.extend({ type: zod_v4.z.literal(require_events.EventType.THINKING_TEXT_MESSAGE_START) });
/**
* @deprecated Use ReasoningMessageContentEventSchema instead. Will be removed in 1.0.0.
*/
const ThinkingTextMessageContentEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.THINKING_TEXT_MESSAGE_CONTENT),
	delta: zod_v4.z.string()
});
/**
* @deprecated Use ReasoningMessageEndEventSchema instead. Will be removed in 1.0.0.
*/
const ThinkingTextMessageEndEventSchema = BaseEventSchema.extend({ type: zod_v4.z.literal(require_events.EventType.THINKING_TEXT_MESSAGE_END) });
const ToolCallStartEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.TOOL_CALL_START),
	toolCallId: zod_v4.z.string(),
	toolCallName: zod_v4.z.string(),
	parentMessageId: zod_v4.z.string().nullable().optional().transform((v) => v ?? void 0)
});
const ToolCallArgsEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.TOOL_CALL_ARGS),
	toolCallId: zod_v4.z.string(),
	delta: zod_v4.z.string()
});
const ToolCallEndEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.TOOL_CALL_END),
	toolCallId: zod_v4.z.string()
});
const ToolCallResultEventSchema = BaseEventSchema.extend({
	messageId: zod_v4.z.string(),
	type: zod_v4.z.literal(require_events.EventType.TOOL_CALL_RESULT),
	toolCallId: zod_v4.z.string(),
	content: zod_v4.z.string(),
	role: zod_v4.z.literal("tool").optional()
});
const ToolCallChunkEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.TOOL_CALL_CHUNK),
	toolCallId: zod_v4.z.string().optional(),
	toolCallName: zod_v4.z.string().optional(),
	parentMessageId: zod_v4.z.string().nullable().optional().transform((v) => v ?? void 0),
	delta: zod_v4.z.string().optional()
});
/**
* @deprecated Use ReasoningStartEventSchema instead. Will be removed in 1.0.0.
*/
const ThinkingStartEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.THINKING_START),
	title: zod_v4.z.string().optional()
});
/**
* @deprecated Use ReasoningEndEventSchema instead. Will be removed in 1.0.0.
*/
const ThinkingEndEventSchema = BaseEventSchema.extend({ type: zod_v4.z.literal(require_events.EventType.THINKING_END) });
const StateSnapshotEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.STATE_SNAPSHOT),
	snapshot: StateSchema.optional()
});
const StateDeltaEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.STATE_DELTA),
	delta: zod_v4.z.array(zod_v4.z.any())
});
const MessagesSnapshotEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.MESSAGES_SNAPSHOT),
	messages: zod_v4.z.array(MessageSchema)
});
const ActivitySnapshotEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.ACTIVITY_SNAPSHOT),
	messageId: zod_v4.z.string(),
	activityType: zod_v4.z.string(),
	content: zod_v4.z.record(zod_v4.z.string(), zod_v4.z.any()),
	replace: zod_v4.z.boolean().optional().default(true)
});
const ActivityDeltaEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.ACTIVITY_DELTA),
	messageId: zod_v4.z.string(),
	activityType: zod_v4.z.string(),
	patch: zod_v4.z.array(zod_v4.z.any())
});
const RawEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.RAW),
	event: zod_v4.z.any().optional(),
	source: zod_v4.z.string().optional()
});
const CustomEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.CUSTOM),
	name: zod_v4.z.string(),
	value: zod_v4.z.any().optional()
});
const RunStartedEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.RUN_STARTED),
	threadId: zod_v4.z.string(),
	runId: zod_v4.z.string(),
	parentRunId: zod_v4.z.string().optional(),
	input: RunAgentInputSchema.optional()
});
const RunFinishedSuccessOutcomeSchema = zod_v4.z.object({ type: zod_v4.z.literal("success") }).strict();
const RunFinishedInterruptOutcomeSchema = zod_v4.z.object({
	type: zod_v4.z.literal("interrupt"),
	interrupts: zod_v4.z.array(InterruptSchema).min(1)
}).strict();
const RunFinishedOutcomeSchema = zod_v4.z.discriminatedUnion("type", [RunFinishedSuccessOutcomeSchema, RunFinishedInterruptOutcomeSchema]);
const RunFinishedEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.RUN_FINISHED),
	threadId: zod_v4.z.string(),
	runId: zod_v4.z.string(),
	result: zod_v4.z.any().optional(),
	outcome: RunFinishedOutcomeSchema.nullable().optional().transform((v) => v ?? void 0)
});
const RunErrorEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.RUN_ERROR),
	message: zod_v4.z.string(),
	code: zod_v4.z.string().optional()
});
const StepStartedEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.STEP_STARTED),
	stepName: zod_v4.z.string()
});
const StepFinishedEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.STEP_FINISHED),
	stepName: zod_v4.z.string()
});
const ReasoningEncryptedValueSubtypeSchema = zod_v4.z.union([zod_v4.z.literal("tool-call"), zod_v4.z.literal("message")]);
const ReasoningStartEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.REASONING_START),
	messageId: zod_v4.z.string()
});
const ReasoningMessageStartEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.REASONING_MESSAGE_START),
	messageId: zod_v4.z.string(),
	role: zod_v4.z.literal("reasoning")
});
const ReasoningMessageContentEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.REASONING_MESSAGE_CONTENT),
	messageId: zod_v4.z.string(),
	delta: zod_v4.z.string()
});
const ReasoningMessageEndEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.REASONING_MESSAGE_END),
	messageId: zod_v4.z.string()
});
const ReasoningMessageChunkEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.REASONING_MESSAGE_CHUNK),
	messageId: zod_v4.z.string().optional(),
	delta: zod_v4.z.string().optional()
});
const ReasoningEndEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.REASONING_END),
	messageId: zod_v4.z.string()
});
const ReasoningEncryptedValueEventSchema = BaseEventSchema.extend({
	type: zod_v4.z.literal(require_events.EventType.REASONING_ENCRYPTED_VALUE),
	subtype: ReasoningEncryptedValueSubtypeSchema,
	entityId: zod_v4.z.string(),
	encryptedValue: zod_v4.z.string()
});
/**
* Discriminated union of all AG-UI event schemas. Suitable for validating
* untrusted event payloads from the wire.
*/
const EventSchemas = zod_v4.z.discriminatedUnion("type", [
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
const SubAgentInfoSchema = zod_v4.z.object({
	name: zod_v4.z.string(),
	description: zod_v4.z.string().optional()
});
/**
* Basic metadata about the agent. Useful for discovery UIs, agent marketplaces,
* and debugging.
*/
const IdentityCapabilitiesSchema = zod_v4.z.object({
	name: zod_v4.z.string().optional(),
	type: zod_v4.z.string().optional(),
	description: zod_v4.z.string().optional(),
	version: zod_v4.z.string().optional(),
	provider: zod_v4.z.string().optional(),
	documentationUrl: zod_v4.z.string().optional(),
	metadata: zod_v4.z.record(zod_v4.z.string(), zod_v4.z.unknown()).optional()
});
/**
* Declares which transport mechanisms the agent supports.
*/
const TransportCapabilitiesSchema = zod_v4.z.object({
	streaming: zod_v4.z.boolean().optional(),
	websocket: zod_v4.z.boolean().optional(),
	httpBinary: zod_v4.z.boolean().optional(),
	pushNotifications: zod_v4.z.boolean().optional(),
	resumable: zod_v4.z.boolean().optional()
});
/**
* Tool calling capabilities.
*/
const ToolsCapabilitiesSchema = zod_v4.z.object({
	supported: zod_v4.z.boolean().optional(),
	items: zod_v4.z.array(ToolSchema).optional(),
	parallelCalls: zod_v4.z.boolean().optional(),
	clientProvided: zod_v4.z.boolean().optional()
});
/**
* Output format support.
*/
const OutputCapabilitiesSchema = zod_v4.z.object({
	structuredOutput: zod_v4.z.boolean().optional(),
	supportedMimeTypes: zod_v4.z.array(zod_v4.z.string()).optional()
});
/**
* State and memory management capabilities.
*/
const StateCapabilitiesSchema = zod_v4.z.object({
	snapshots: zod_v4.z.boolean().optional(),
	deltas: zod_v4.z.boolean().optional(),
	memory: zod_v4.z.boolean().optional(),
	persistentState: zod_v4.z.boolean().optional()
});
/**
* Multi-agent coordination capabilities.
*/
const MultiAgentCapabilitiesSchema = zod_v4.z.object({
	supported: zod_v4.z.boolean().optional(),
	delegation: zod_v4.z.boolean().optional(),
	handoffs: zod_v4.z.boolean().optional(),
	subAgents: zod_v4.z.array(SubAgentInfoSchema).optional()
});
/**
* Reasoning and thinking capabilities.
*/
const ReasoningCapabilitiesSchema = zod_v4.z.object({
	supported: zod_v4.z.boolean().optional(),
	streaming: zod_v4.z.boolean().optional(),
	encrypted: zod_v4.z.boolean().optional()
});
/**
* Modalities the agent can accept as input.
*/
const MultimodalInputCapabilitiesSchema = zod_v4.z.object({
	image: zod_v4.z.boolean().optional(),
	audio: zod_v4.z.boolean().optional(),
	video: zod_v4.z.boolean().optional(),
	pdf: zod_v4.z.boolean().optional(),
	file: zod_v4.z.boolean().optional()
});
/**
* Modalities the agent can produce as output.
*/
const MultimodalOutputCapabilitiesSchema = zod_v4.z.object({
	image: zod_v4.z.boolean().optional(),
	audio: zod_v4.z.boolean().optional()
});
/**
* Multimodal input and output support.
*/
const MultimodalCapabilitiesSchema = zod_v4.z.object({
	input: MultimodalInputCapabilitiesSchema.optional(),
	output: MultimodalOutputCapabilitiesSchema.optional()
});
/**
* Execution control and limits.
*/
const ExecutionCapabilitiesSchema = zod_v4.z.object({
	codeExecution: zod_v4.z.boolean().optional(),
	sandboxed: zod_v4.z.boolean().optional(),
	maxIterations: zod_v4.z.number().optional(),
	maxExecutionTime: zod_v4.z.number().optional()
});
/**
* Human-in-the-loop interaction support.
*/
const HumanInTheLoopCapabilitiesSchema = zod_v4.z.object({
	supported: zod_v4.z.boolean().optional(),
	approvals: zod_v4.z.boolean().optional(),
	interventions: zod_v4.z.boolean().optional(),
	feedback: zod_v4.z.boolean().optional(),
	interrupts: zod_v4.z.boolean().optional(),
	approveWithEdits: zod_v4.z.boolean().optional()
});
/**
* A typed, categorized snapshot of an agent's current capabilities.
* Returned by `getCapabilities()` on `AbstractAgent`.
*/
const AgentCapabilitiesSchema = zod_v4.z.object({
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
	custom: zod_v4.z.record(zod_v4.z.string(), zod_v4.z.unknown()).optional()
});

//#endregion
//#region src/event-factories.ts
const buildEvent = (eventType, schema, props) => schema.parse({
	...props,
	type: eventType
});
/** Creates a TEXT_MESSAGE_START event. `role` defaults to `"assistant"` when omitted. */
const createTextMessageStartEvent = (props) => buildEvent(require_events.EventType.TEXT_MESSAGE_START, TextMessageStartEventSchema, props);
/** Creates a TEXT_MESSAGE_CONTENT event. */
const createTextMessageContentEvent = (props) => buildEvent(require_events.EventType.TEXT_MESSAGE_CONTENT, TextMessageContentEventSchema, props);
/** Creates a TEXT_MESSAGE_END event. */
const createTextMessageEndEvent = (props) => buildEvent(require_events.EventType.TEXT_MESSAGE_END, TextMessageEndEventSchema, props);
/** Creates a TEXT_MESSAGE_CHUNK event. */
const createTextMessageChunkEvent = (props) => buildEvent(require_events.EventType.TEXT_MESSAGE_CHUNK, TextMessageChunkEventSchema, props);
/** @deprecated Use `createReasoningMessageStartEvent` instead. Will be removed in 1.0.0. */
const createThinkingTextMessageStartEvent = (props) => buildEvent(require_events.EventType.THINKING_TEXT_MESSAGE_START, ThinkingTextMessageStartEventSchema, props);
/** @deprecated Use `createReasoningMessageContentEvent` instead. Will be removed in 1.0.0. */
const createThinkingTextMessageContentEvent = (props) => buildEvent(require_events.EventType.THINKING_TEXT_MESSAGE_CONTENT, ThinkingTextMessageContentEventSchema, props);
/** @deprecated Use `createReasoningMessageEndEvent` instead. Will be removed in 1.0.0. */
const createThinkingTextMessageEndEvent = (props) => buildEvent(require_events.EventType.THINKING_TEXT_MESSAGE_END, ThinkingTextMessageEndEventSchema, props);
/** Creates a TOOL_CALL_START event. */
const createToolCallStartEvent = (props) => buildEvent(require_events.EventType.TOOL_CALL_START, ToolCallStartEventSchema, props);
/** Creates a TOOL_CALL_ARGS event. */
const createToolCallArgsEvent = (props) => buildEvent(require_events.EventType.TOOL_CALL_ARGS, ToolCallArgsEventSchema, props);
/** Creates a TOOL_CALL_END event. */
const createToolCallEndEvent = (props) => buildEvent(require_events.EventType.TOOL_CALL_END, ToolCallEndEventSchema, props);
/** Creates a TOOL_CALL_CHUNK event. */
const createToolCallChunkEvent = (props) => buildEvent(require_events.EventType.TOOL_CALL_CHUNK, ToolCallChunkEventSchema, props);
/** Creates a TOOL_CALL_RESULT event. */
const createToolCallResultEvent = (props) => buildEvent(require_events.EventType.TOOL_CALL_RESULT, ToolCallResultEventSchema, props);
/** @deprecated Use `createReasoningStartEvent` instead. Will be removed in 1.0.0. */
const createThinkingStartEvent = (props) => buildEvent(require_events.EventType.THINKING_START, ThinkingStartEventSchema, props);
/** @deprecated Use `createReasoningEndEvent` instead. Will be removed in 1.0.0. */
const createThinkingEndEvent = (props) => buildEvent(require_events.EventType.THINKING_END, ThinkingEndEventSchema, props);
/** Creates a STATE_SNAPSHOT event. */
const createStateSnapshotEvent = (props) => buildEvent(require_events.EventType.STATE_SNAPSHOT, StateSnapshotEventSchema, props);
/** Creates a STATE_DELTA event. */
const createStateDeltaEvent = (props) => buildEvent(require_events.EventType.STATE_DELTA, StateDeltaEventSchema, props);
/** Creates a MESSAGES_SNAPSHOT event. */
const createMessagesSnapshotEvent = (props) => buildEvent(require_events.EventType.MESSAGES_SNAPSHOT, MessagesSnapshotEventSchema, props);
/** Creates an ACTIVITY_SNAPSHOT event. `replace` defaults to `true` when omitted. */
const createActivitySnapshotEvent = (props) => buildEvent(require_events.EventType.ACTIVITY_SNAPSHOT, ActivitySnapshotEventSchema, props);
/** Creates an ACTIVITY_DELTA event. */
const createActivityDeltaEvent = (props) => buildEvent(require_events.EventType.ACTIVITY_DELTA, ActivityDeltaEventSchema, props);
/** Creates a RAW event. */
const createRawEvent = (props) => buildEvent(require_events.EventType.RAW, RawEventSchema, props);
/** Creates a CUSTOM event. */
const createCustomEvent = (props) => buildEvent(require_events.EventType.CUSTOM, CustomEventSchema, props);
/** Creates a RUN_STARTED event. */
const createRunStartedEvent = (props) => buildEvent(require_events.EventType.RUN_STARTED, RunStartedEventSchema, props);
/**
* Creates a RUN_FINISHED event.
*
* `outcome` is optional. Omit it for legacy/back-compat behavior, or set it
* explicitly to `{ type: "success" }` or `{ type: "interrupt", interrupts }` —
* see `createRunFinishedSuccessEvent` and `createRunFinishedInterruptEvent` for
* convenience helpers. `outcome: null` is normalized to `outcome` being omitted.
*/
const createRunFinishedEvent = (props) => buildEvent(require_events.EventType.RUN_FINISHED, RunFinishedEventSchema, props);
/** Creates a RUN_FINISHED event with `outcome: { type: "success" }`. */
const createRunFinishedSuccessEvent = (props) => buildEvent(require_events.EventType.RUN_FINISHED, RunFinishedEventSchema, {
	...props,
	outcome: { type: "success" }
});
/**
* Creates a RUN_FINISHED event with `outcome: { type: "interrupt", interrupts }`.
* Throws if `interrupts` is empty (the schema requires at least one entry).
*/
const createRunFinishedInterruptEvent = (props) => {
	const { interrupts, ...rest } = props;
	return buildEvent(require_events.EventType.RUN_FINISHED, RunFinishedEventSchema, {
		...rest,
		outcome: {
			type: "interrupt",
			interrupts
		}
	});
};
/** Creates a RUN_ERROR event. */
const createRunErrorEvent = (props) => buildEvent(require_events.EventType.RUN_ERROR, RunErrorEventSchema, props);
/** Creates a STEP_STARTED event. */
const createStepStartedEvent = (props) => buildEvent(require_events.EventType.STEP_STARTED, StepStartedEventSchema, props);
/** Creates a STEP_FINISHED event. */
const createStepFinishedEvent = (props) => buildEvent(require_events.EventType.STEP_FINISHED, StepFinishedEventSchema, props);
/** Creates a REASONING_START event. */
const createReasoningStartEvent = (props) => buildEvent(require_events.EventType.REASONING_START, ReasoningStartEventSchema, props);
/** Creates a REASONING_MESSAGE_START event. */
const createReasoningMessageStartEvent = (props) => buildEvent(require_events.EventType.REASONING_MESSAGE_START, ReasoningMessageStartEventSchema, props);
/** Creates a REASONING_MESSAGE_CONTENT event. */
const createReasoningMessageContentEvent = (props) => buildEvent(require_events.EventType.REASONING_MESSAGE_CONTENT, ReasoningMessageContentEventSchema, props);
/** Creates a REASONING_MESSAGE_END event. */
const createReasoningMessageEndEvent = (props) => buildEvent(require_events.EventType.REASONING_MESSAGE_END, ReasoningMessageEndEventSchema, props);
/** Creates a REASONING_MESSAGE_CHUNK event. */
const createReasoningMessageChunkEvent = (props) => buildEvent(require_events.EventType.REASONING_MESSAGE_CHUNK, ReasoningMessageChunkEventSchema, props);
/** Creates a REASONING_END event. */
const createReasoningEndEvent = (props) => buildEvent(require_events.EventType.REASONING_END, ReasoningEndEventSchema, props);
/** Creates a REASONING_ENCRYPTED_VALUE event. */
const createReasoningEncryptedValueEvent = (props) => buildEvent(require_events.EventType.REASONING_ENCRYPTED_VALUE, ReasoningEncryptedValueEventSchema, props);

//#endregion
exports.ActivityDeltaEventSchema = ActivityDeltaEventSchema;
exports.ActivityMessageSchema = ActivityMessageSchema;
exports.ActivitySnapshotEventSchema = ActivitySnapshotEventSchema;
exports.AgentCapabilitiesSchema = AgentCapabilitiesSchema;
exports.AssistantMessageSchema = AssistantMessageSchema;
exports.AudioInputContentSchema = AudioInputContentSchema;
exports.AudioInputPartSchema = AudioInputPartSchema;
exports.BaseEventSchema = BaseEventSchema;
exports.BinaryInputContentSchema = BinaryInputContentSchema;
exports.ContextSchema = ContextSchema;
exports.CustomEventSchema = CustomEventSchema;
exports.DeveloperMessageSchema = DeveloperMessageSchema;
exports.DocumentInputContentSchema = DocumentInputContentSchema;
exports.DocumentInputPartSchema = DocumentInputPartSchema;
exports.EventSchemas = EventSchemas;
exports.EventTypeSchema = EventTypeSchema;
exports.ExecutionCapabilitiesSchema = ExecutionCapabilitiesSchema;
exports.FunctionCallSchema = FunctionCallSchema;
exports.HumanInTheLoopCapabilitiesSchema = HumanInTheLoopCapabilitiesSchema;
exports.IdentityCapabilitiesSchema = IdentityCapabilitiesSchema;
exports.ImageInputContentSchema = ImageInputContentSchema;
exports.ImageInputPartSchema = ImageInputPartSchema;
exports.InputContentDataSourceSchema = InputContentDataSourceSchema;
exports.InputContentPartSchema = InputContentPartSchema;
exports.InputContentSchema = InputContentSchema;
exports.InputContentSourceSchema = InputContentSourceSchema;
exports.InputContentUrlSourceSchema = InputContentUrlSourceSchema;
exports.InterruptSchema = InterruptSchema;
exports.MessageSchema = MessageSchema;
exports.MessagesSnapshotEventSchema = MessagesSnapshotEventSchema;
exports.MultiAgentCapabilitiesSchema = MultiAgentCapabilitiesSchema;
exports.MultimodalCapabilitiesSchema = MultimodalCapabilitiesSchema;
exports.MultimodalInputCapabilitiesSchema = MultimodalInputCapabilitiesSchema;
exports.MultimodalOutputCapabilitiesSchema = MultimodalOutputCapabilitiesSchema;
exports.OutputCapabilitiesSchema = OutputCapabilitiesSchema;
exports.RawEventSchema = RawEventSchema;
exports.ReasoningCapabilitiesSchema = ReasoningCapabilitiesSchema;
exports.ReasoningEncryptedValueEventSchema = ReasoningEncryptedValueEventSchema;
exports.ReasoningEncryptedValueSubtypeSchema = ReasoningEncryptedValueSubtypeSchema;
exports.ReasoningEndEventSchema = ReasoningEndEventSchema;
exports.ReasoningMessageChunkEventSchema = ReasoningMessageChunkEventSchema;
exports.ReasoningMessageContentEventSchema = ReasoningMessageContentEventSchema;
exports.ReasoningMessageEndEventSchema = ReasoningMessageEndEventSchema;
exports.ReasoningMessageSchema = ReasoningMessageSchema;
exports.ReasoningMessageStartEventSchema = ReasoningMessageStartEventSchema;
exports.ReasoningStartEventSchema = ReasoningStartEventSchema;
exports.ResumeEntrySchema = ResumeEntrySchema;
exports.RoleSchema = RoleSchema;
exports.RunAgentInputSchema = RunAgentInputSchema;
exports.RunErrorEventSchema = RunErrorEventSchema;
exports.RunFinishedEventSchema = RunFinishedEventSchema;
exports.RunFinishedInterruptOutcomeSchema = RunFinishedInterruptOutcomeSchema;
exports.RunFinishedOutcomeSchema = RunFinishedOutcomeSchema;
exports.RunFinishedSuccessOutcomeSchema = RunFinishedSuccessOutcomeSchema;
exports.RunStartedEventSchema = RunStartedEventSchema;
exports.StateCapabilitiesSchema = StateCapabilitiesSchema;
exports.StateDeltaEventSchema = StateDeltaEventSchema;
exports.StateSchema = StateSchema;
exports.StateSnapshotEventSchema = StateSnapshotEventSchema;
exports.StepFinishedEventSchema = StepFinishedEventSchema;
exports.StepStartedEventSchema = StepStartedEventSchema;
exports.SubAgentInfoSchema = SubAgentInfoSchema;
exports.SystemMessageSchema = SystemMessageSchema;
exports.TextInputContentSchema = TextInputContentSchema;
exports.TextMessageChunkEventSchema = TextMessageChunkEventSchema;
exports.TextMessageContentEventSchema = TextMessageContentEventSchema;
exports.TextMessageEndEventSchema = TextMessageEndEventSchema;
exports.TextMessageStartEventSchema = TextMessageStartEventSchema;
exports.ThinkingEndEventSchema = ThinkingEndEventSchema;
exports.ThinkingStartEventSchema = ThinkingStartEventSchema;
exports.ThinkingTextMessageContentEventSchema = ThinkingTextMessageContentEventSchema;
exports.ThinkingTextMessageEndEventSchema = ThinkingTextMessageEndEventSchema;
exports.ThinkingTextMessageStartEventSchema = ThinkingTextMessageStartEventSchema;
exports.ToolCallArgsEventSchema = ToolCallArgsEventSchema;
exports.ToolCallChunkEventSchema = ToolCallChunkEventSchema;
exports.ToolCallEndEventSchema = ToolCallEndEventSchema;
exports.ToolCallResultEventSchema = ToolCallResultEventSchema;
exports.ToolCallSchema = ToolCallSchema;
exports.ToolCallStartEventSchema = ToolCallStartEventSchema;
exports.ToolMessageSchema = ToolMessageSchema;
exports.ToolSchema = ToolSchema;
exports.ToolsCapabilitiesSchema = ToolsCapabilitiesSchema;
exports.TransportCapabilitiesSchema = TransportCapabilitiesSchema;
exports.UserMessageSchema = UserMessageSchema;
exports.VideoInputContentSchema = VideoInputContentSchema;
exports.VideoInputPartSchema = VideoInputPartSchema;
exports.createActivityDeltaEvent = createActivityDeltaEvent;
exports.createActivitySnapshotEvent = createActivitySnapshotEvent;
exports.createCustomEvent = createCustomEvent;
exports.createMessagesSnapshotEvent = createMessagesSnapshotEvent;
exports.createRawEvent = createRawEvent;
exports.createReasoningEncryptedValueEvent = createReasoningEncryptedValueEvent;
exports.createReasoningEndEvent = createReasoningEndEvent;
exports.createReasoningMessageChunkEvent = createReasoningMessageChunkEvent;
exports.createReasoningMessageContentEvent = createReasoningMessageContentEvent;
exports.createReasoningMessageEndEvent = createReasoningMessageEndEvent;
exports.createReasoningMessageStartEvent = createReasoningMessageStartEvent;
exports.createReasoningStartEvent = createReasoningStartEvent;
exports.createRunErrorEvent = createRunErrorEvent;
exports.createRunFinishedEvent = createRunFinishedEvent;
exports.createRunFinishedInterruptEvent = createRunFinishedInterruptEvent;
exports.createRunFinishedSuccessEvent = createRunFinishedSuccessEvent;
exports.createRunStartedEvent = createRunStartedEvent;
exports.createStateDeltaEvent = createStateDeltaEvent;
exports.createStateSnapshotEvent = createStateSnapshotEvent;
exports.createStepFinishedEvent = createStepFinishedEvent;
exports.createStepStartedEvent = createStepStartedEvent;
exports.createTextMessageChunkEvent = createTextMessageChunkEvent;
exports.createTextMessageContentEvent = createTextMessageContentEvent;
exports.createTextMessageEndEvent = createTextMessageEndEvent;
exports.createTextMessageStartEvent = createTextMessageStartEvent;
exports.createThinkingEndEvent = createThinkingEndEvent;
exports.createThinkingStartEvent = createThinkingStartEvent;
exports.createThinkingTextMessageContentEvent = createThinkingTextMessageContentEvent;
exports.createThinkingTextMessageEndEvent = createThinkingTextMessageEndEvent;
exports.createThinkingTextMessageStartEvent = createThinkingTextMessageStartEvent;
exports.createToolCallArgsEvent = createToolCallArgsEvent;
exports.createToolCallChunkEvent = createToolCallChunkEvent;
exports.createToolCallEndEvent = createToolCallEndEvent;
exports.createToolCallResultEvent = createToolCallResultEvent;
exports.createToolCallStartEvent = createToolCallStartEvent;
//# sourceMappingURL=schemas.js.map