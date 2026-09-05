import { mergeMetadata, tanstackMetadata } from "../../../utilities/merge-metadata.js";
import { runErrorEventToError } from "../../../utilities/errors.js";
import { INTERRUPT_BINDING_METADATA_KEY } from "../../../interrupt-resume.js";
import { normalizeToolResult } from "../../../utilities/tool-result.js";
import { isProviderExecutedToolCall } from "../../../utilities/provider-executed.js";
import { aguiSnapshotMessageToUIMessage, coerceCreatedAt, generateMessageId, uiMessageToModelMessages } from "../messages.js";
import { getChunkRunId } from "../../../utilities/chunk-ids.js";
import { defaultJSONParser } from "./json-parser.js";
import { appendStructuredOutputDelta, completeStructuredOutputPart, errorStructuredOutputPart, updateTextPart, updateThinkingPart, updateToolCallApproval, updateToolCallApprovalResponse, updateToolCallPart, updateToolCallWithOutput, updateToolResultPart } from "./message-updaters.js";
import { ImmediateStrategy } from "./strategies.js";
//#region src/activities/chat/stream/processor.ts
/**
* Unified Stream Processor
*
* Core stream processing engine that manages the full UIMessage[] conversation.
* Single source of truth for message state.
*
* Handles:
* - Full conversation management (UIMessage[])
* - Text content accumulation with configurable chunking strategies
* - Parallel tool calls with lifecycle state tracking
* - Tool results and approval flows
* - Thinking/reasoning content
* - Recording/replay for testing
* - Event-driven architecture for UI updates
* - Per-message stream state tracking for multi-message sessions
*
* @see docs/chat-architecture.md — Canonical reference for AG-UI chunk ordering,
*   adapter contract, single-shot flows, and expected UIMessage output.
*/
var STRUCTURED_OUTPUT_UPDATE_BATCH_SIZE = 12;
function interruptBatchHasGeneric(interrupts) {
	return interrupts.some((interrupt) => {
		const metadata = interrupt.metadata;
		if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
		const binding = metadata[INTERRUPT_BINDING_METADATA_KEY];
		return binding !== null && typeof binding === "object" && !Array.isArray(binding) && binding.kind === "generic";
	});
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
var StreamProcessor = class StreamProcessor {
	chunkStrategy;
	events;
	jsonParser;
	recordingEnabled;
	messages = [];
	messageStates = /* @__PURE__ */ new Map();
	activeMessageIds = /* @__PURE__ */ new Set();
	toolCallToMessage = /* @__PURE__ */ new Map();
	pendingManualMessageId = null;
	pendingThinkingStepId = null;
	structuredMessageIds = /* @__PURE__ */ new Set();
	structuredOutputUpdateBatches = /* @__PURE__ */ new Map();
	activeRuns = /* @__PURE__ */ new Set();
	finishReason = null;
	hasError = false;
	isDone = false;
	streamEndEmitted = false;
	recording = null;
	recordingStartTime = 0;
	constructor(options = {}) {
		this.chunkStrategy = options.chunkStrategy || new ImmediateStrategy();
		this.events = options.events || {};
		this.jsonParser = options.jsonParser || defaultJSONParser;
		this.recordingEnabled = options.recording ?? false;
		if (options.initialMessages) this.messages = [...options.initialMessages];
	}
	/**
	* Set the messages array (e.g., from persisted state)
	*/
	setMessages(messages) {
		this.messages = [...messages];
		this.emitMessagesChange();
	}
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
	addUserMessage(content, id, metadata) {
		const parts = typeof content === "string" ? [{
			type: "text",
			content
		}] : content.map((part) => {
			return part;
		});
		const userMessage = {
			id: id ?? generateMessageId(),
			role: "user",
			parts,
			createdAt: /* @__PURE__ */ new Date(),
			...metadata != null ? { metadata } : {}
		};
		this.messages = [...this.messages, userMessage];
		this.emitMessagesChange();
		return userMessage;
	}
	/**
	* Prepare for a new assistant message stream.
	* Does NOT create the message immediately -- the message is created lazily
	* when the first content-bearing chunk arrives via ensureAssistantMessage().
	* This prevents empty assistant messages from flickering in the UI when
	* auto-continuation produces no content.
	*/
	prepareAssistantMessage() {
		this.resetStreamState();
	}
	/**
	* @deprecated Use prepareAssistantMessage() instead. This eagerly creates
	* an assistant message which can cause empty message flicker.
	*/
	startAssistantMessage(messageId) {
		this.prepareAssistantMessage();
		const { messageId: id } = this.ensureAssistantMessage(messageId);
		this.pendingManualMessageId = id;
		return id;
	}
	/**
	* Get the current assistant message ID (if one has been created).
	* Returns null if prepareAssistantMessage() was called but no content
	* has arrived yet.
	*/
	getCurrentAssistantMessageId() {
		let lastId = null;
		for (const [id, state] of this.messageStates) if (state.role === "assistant") lastId = id;
		return lastId;
	}
	/**
	* Add a tool result (called by client after handling onToolCall)
	*/
	addToolResult(toolCallId, output, error) {
		const messageWithToolCall = this.messages.find((msg) => msg.parts.some((p) => p.type === "tool-call" && p.id === toolCallId));
		if (!messageWithToolCall) {
			console.warn(`[StreamProcessor] Could not find message with tool call ${toolCallId}`);
			return;
		}
		let updatedMessages = updateToolCallWithOutput(this.messages, toolCallId, output, error ? "error" : void 0, error);
		const content = normalizeToolResult(output);
		const toolResultState = error ? "error" : "complete";
		updatedMessages = updateToolResultPart(updatedMessages, messageWithToolCall.id, toolCallId, content, toolResultState, error);
		this.messages = updatedMessages;
		this.emitMessagesChange();
	}
	/**
	* Add an approval response (called by client after handling onApprovalRequest)
	*/
	addToolApprovalResponse(approvalId, approved) {
		this.messages = updateToolCallApprovalResponse(this.messages, approvalId, approved);
		this.emitMessagesChange();
	}
	/**
	* Get the conversation as ModelMessages (for sending to LLM)
	*/
	toModelMessages() {
		const modelMessages = [];
		for (const msg of this.messages) modelMessages.push(...uiMessageToModelMessages(msg));
		return modelMessages;
	}
	/**
	* Get current messages
	*/
	getMessages() {
		return this.messages;
	}
	/**
	* Check if all tool calls in the last assistant message are complete
	* Useful for auto-continue logic
	*/
	areAllToolsComplete() {
		const lastAssistant = this.messages.findLast((m) => m.role === "assistant");
		if (!lastAssistant) return true;
		const toolParts = lastAssistant.parts.filter((p) => p.type === "tool-call");
		if (toolParts.length === 0) return true;
		const toolResultIds = new Set(lastAssistant.parts.filter((p) => p.type === "tool-result").map((p) => p.toolCallId));
		return toolParts.every((part) => part.state === "complete" || part.state === "approval-responded" || part.output !== void 0 && !part.approval || toolResultIds.has(part.id) || isProviderExecutedToolCall(part));
	}
	/**
	* Remove messages after a certain index (for reload/retry)
	*/
	removeMessagesAfter(index) {
		const keptIds = new Set(this.messages.slice(0, index + 1).map((m) => m.id));
		for (const id of this.structuredMessageIds) if (!keptIds.has(id)) this.structuredMessageIds.delete(id);
		for (const id of this.structuredOutputUpdateBatches.keys()) if (!keptIds.has(id)) this.structuredOutputUpdateBatches.delete(id);
		for (const id of this.messageStates.keys()) if (!keptIds.has(id)) this.messageStates.delete(id);
		for (const [toolCallId, msgId] of this.toolCallToMessage) if (!keptIds.has(msgId)) this.toolCallToMessage.delete(toolCallId);
		for (const id of this.activeMessageIds) if (!keptIds.has(id)) this.activeMessageIds.delete(id);
		this.messages = this.messages.slice(0, index + 1);
		this.emitMessagesChange();
	}
	/**
	* Clear all messages
	*/
	clearMessages() {
		this.messages = [];
		this.messageStates.clear();
		this.activeMessageIds.clear();
		this.toolCallToMessage.clear();
		this.structuredMessageIds.clear();
		this.structuredOutputUpdateBatches.clear();
		this.pendingManualMessageId = null;
		this.emitMessagesChange();
	}
	/**
	* Process a stream and emit events through handlers
	*/
	async process(stream) {
		this.resetStreamState();
		if (this.recordingEnabled) this.startRecording();
		for await (const chunk of stream) this.processChunk(chunk);
		this.finalizeStream();
		if (this.recording) this.recording.result = this.getResult();
		return this.getResult();
	}
	/**
	* Process a single chunk from the stream.
	*
	* Central dispatch for all AG-UI events. Each event type maps to a specific
	* handler. Events not listed in the switch are intentionally ignored
	* (STEP_STARTED, STATE_SNAPSHOT, STATE_DELTA).
	*
	* @see docs/chat-architecture.md#adapter-contract — Expected event types and ordering
	*/
	processChunk(chunk) {
		if (this.recording) this.recording.chunks.push({
			chunk,
			timestamp: Date.now(),
			index: this.recording.chunks.length
		});
		switch (chunk.type) {
			case "TEXT_MESSAGE_START":
				this.handleTextMessageStartEvent(chunk);
				break;
			case "TEXT_MESSAGE_CONTENT":
				this.handleTextMessageContentEvent(chunk);
				break;
			case "TEXT_MESSAGE_END":
				this.handleTextMessageEndEvent(chunk);
				break;
			case "TOOL_CALL_START":
				this.handleToolCallStartEvent(chunk);
				break;
			case "TOOL_CALL_ARGS":
				this.handleToolCallArgsEvent(chunk);
				break;
			case "TOOL_CALL_END":
				this.handleToolCallEndEvent(chunk);
				break;
			case "RUN_FINISHED":
				this.handleRunFinishedEvent(chunk);
				break;
			case "RUN_ERROR":
				this.handleRunErrorEvent(chunk);
				break;
			case "STEP_FINISHED":
				this.handleStepFinishedEvent(chunk);
				break;
			case "MESSAGES_SNAPSHOT":
				this.handleMessagesSnapshotEvent(chunk);
				break;
			case "CUSTOM":
				this.handleCustomEvent(chunk);
				break;
			case "RUN_STARTED":
				this.handleRunStartedEvent(chunk);
				break;
			case "REASONING_START":
			case "REASONING_MESSAGE_START":
			case "REASONING_MESSAGE_END":
			case "REASONING_END": break;
			case "REASONING_MESSAGE_CONTENT":
				this.handleReasoningMessageContentEvent(chunk);
				break;
			case "REASONING_ENCRYPTED_VALUE":
				this.handleReasoningEncryptedValueEvent(chunk);
				break;
			case "TOOL_CALL_RESULT":
				this.handleToolCallResultEvent(chunk);
				break;
			case "STEP_STARTED": this.handleStepStartedEvent(chunk);
		}
	}
	/**
	* Create a new MessageStreamState for a message
	*/
	createMessageState(messageId, role) {
		const state = {
			id: messageId,
			role,
			totalTextContent: "",
			currentSegmentText: "",
			lastEmittedText: "",
			hasSeenReasoningEvents: false,
			thinkingSteps: /* @__PURE__ */ new Map(),
			thinkingStepSignatures: /* @__PURE__ */ new Map(),
			thinkingStepOrder: [],
			currentThinkingStepId: null,
			toolCalls: /* @__PURE__ */ new Map(),
			toolCallOrder: [],
			hasToolCallsSinceTextStart: false,
			isComplete: false
		};
		this.messageStates.set(messageId, state);
		return state;
	}
	/**
	* Get the MessageStreamState for a message
	*/
	getMessageState(messageId) {
		return this.messageStates.get(messageId);
	}
	/**
	* Promote a pending stepId from a STEP_STARTED that fired before the
	* assistant message existed onto the given message state, so the next
	* thinking event (STEP_FINISHED or REASONING_MESSAGE_CONTENT) attributes
	* to the correct step.
	*/
	consumePendingThinkingStep(state) {
		if (!this.pendingThinkingStepId) return;
		const stepId = this.pendingThinkingStepId;
		state.currentThinkingStepId = stepId;
		if (!state.thinkingSteps.has(stepId)) {
			state.thinkingSteps.set(stepId, "");
			state.thinkingStepOrder.push(stepId);
		}
		this.pendingThinkingStepId = null;
	}
	/**
	* Get the most recent active assistant message ID.
	* Used as fallback for events that don't include a messageId.
	*/
	getActiveAssistantMessageId() {
		const ids = Array.from(this.activeMessageIds).reverse();
		for (const id of ids) {
			const state = this.messageStates.get(id);
			if (state && state.role === "assistant") return id;
		}
		for (const [id, state] of [...this.messageStates].reverse()) if (state.role === "assistant") return id;
		return null;
	}
	resumeAssistantState(id, state) {
		this.activeMessageIds.add(id);
		if (state.isComplete || this.isDone) {
			state.isComplete = false;
			this.isDone = false;
		}
	}
	/**
	* Ensure an active assistant message exists, creating one if needed.
	* Used for backward compat when events arrive without prior TEXT_MESSAGE_START.
	*
	* On reconnect/resume, a TEXT_MESSAGE_CONTENT may arrive for a message that
	* already exists in this.messages (e.g. from initialMessages or a prior
	* MESSAGES_SNAPSHOT) but whose transient state was cleared. In that case we
	* hydrate state from the existing message rather than creating a duplicate.
	*/
	ensureAssistantMessage(preferredId) {
		if (preferredId) {
			const state = this.getMessageState(preferredId);
			if (state) {
				this.resumeAssistantState(preferredId, state);
				return {
					messageId: preferredId,
					state
				};
			}
		}
		const activeId = this.getActiveAssistantMessageId();
		if (activeId) {
			const state = this.getMessageState(activeId);
			if (state) {
				this.resumeAssistantState(activeId, state);
				return {
					messageId: activeId,
					state
				};
			}
		}
		if (preferredId) {
			const existingMsg = this.messages.find((m) => m.id === preferredId);
			if (existingMsg) {
				const state = this.createMessageState(preferredId, existingMsg.role);
				this.activeMessageIds.add(preferredId);
				const lastPart = existingMsg.parts.length > 0 ? existingMsg.parts[existingMsg.parts.length - 1] : null;
				if (lastPart && lastPart.type === "text") {
					state.currentSegmentText = lastPart.content;
					state.lastEmittedText = lastPart.content;
					state.totalTextContent = lastPart.content;
				}
				return {
					messageId: preferredId,
					state
				};
			}
		}
		const id = preferredId || generateMessageId();
		const assistantMessage = {
			id,
			role: "assistant",
			parts: [],
			createdAt: /* @__PURE__ */ new Date()
		};
		this.messages = [...this.messages, assistantMessage];
		const state = this.createMessageState(id, "assistant");
		this.activeMessageIds.add(id);
		this.pendingManualMessageId = id;
		this.events.onStreamStart?.();
		this.emitMessagesChange();
		return {
			messageId: id,
			state
		};
	}
	/**
	* Merge event metadata onto a UIMessage. `tanstack` is deep-merged so a
	* later delta does not wipe `tanstack.model`. High-frequency leftover
	* keys (`content`, `args`) never stamp onto the message.
	* Rebuilds `createdAt` when `tanstack.createdAt` is an ISO string.
	*/
	mergeMessageMetadata(messageId, incoming) {
		if (incoming == null || typeof incoming !== "object" || Array.isArray(incoming)) return;
		const message = this.messages.find((msg) => msg.id === messageId);
		if (!message) return;
		const incomingRecord = incoming;
		const incomingTanstack = tanstackMetadata(incomingRecord);
		const toMerge = incomingTanstack != null && ("content" in incomingTanstack || "args" in incomingTanstack) ? {
			...incomingRecord,
			tanstack: Object.fromEntries(Object.entries(incomingTanstack).filter(([key]) => key !== "content" && key !== "args"))
		} : incomingRecord;
		const metadata = mergeMetadata(message.metadata, toMerge);
		const createdAt = coerceCreatedAt(tanstackMetadata(incomingRecord)?.createdAt);
		const createdAtValid = createdAt !== void 0;
		this.messages = this.messages.map((msg) => msg.id === messageId ? {
			...msg,
			...metadata !== void 0 ? { metadata } : {},
			...createdAtValid ? { createdAt } : {}
		} : msg);
		this.emitMessagesChange();
	}
	/**
	* Handle TEXT_MESSAGE_START event
	*/
	handleTextMessageStartEvent(chunk) {
		const { messageId, role } = chunk;
		const uiRole = role === "user" || role === "system" ? role : "assistant";
		if (this.pendingManualMessageId) {
			const pendingId = this.pendingManualMessageId;
			this.pendingManualMessageId = null;
			if (pendingId !== messageId) {
				this.messages = this.messages.map((msg) => msg.id === pendingId ? {
					...msg,
					id: messageId
				} : msg);
				const existingState = this.messageStates.get(pendingId);
				if (existingState) {
					existingState.id = messageId;
					this.messageStates.delete(pendingId);
					this.messageStates.set(messageId, existingState);
				}
				this.activeMessageIds.delete(pendingId);
				this.activeMessageIds.add(messageId);
				for (const [toolCallId, mappedMessageId] of this.toolCallToMessage) if (mappedMessageId === pendingId) this.toolCallToMessage.set(toolCallId, messageId);
			}
			let pendingState = this.messageStates.get(messageId);
			if (!pendingState) {
				pendingState = this.createMessageState(messageId, uiRole);
				this.activeMessageIds.add(messageId);
			} else if (pendingState.hasToolCallsSinceTextStart) {
				if (pendingState.currentSegmentText !== pendingState.lastEmittedText) this.emitTextUpdateForMessage(messageId);
				pendingState.currentSegmentText = "";
				pendingState.lastEmittedText = "";
				pendingState.hasToolCallsSinceTextStart = false;
			}
			this.mergeMessageMetadata(messageId, chunk.metadata);
			this.emitMessagesChange();
			return;
		}
		if (this.messages.find((m) => m.id === messageId)) {
			this.activeMessageIds.add(messageId);
			const existingState = this.messageStates.get(messageId);
			if (!existingState) this.createMessageState(messageId, uiRole);
			else if (existingState.hasToolCallsSinceTextStart) {
				if (existingState.currentSegmentText !== existingState.lastEmittedText) this.emitTextUpdateForMessage(messageId);
				existingState.currentSegmentText = "";
				existingState.lastEmittedText = "";
				existingState.hasToolCallsSinceTextStart = false;
			}
			this.mergeMessageMetadata(messageId, chunk.metadata);
			return;
		}
		const newMessage = {
			id: messageId,
			role: uiRole,
			parts: [],
			createdAt: /* @__PURE__ */ new Date()
		};
		this.messages = [...this.messages, newMessage];
		this.createMessageState(messageId, uiRole);
		this.activeMessageIds.add(messageId);
		this.mergeMessageMetadata(messageId, chunk.metadata);
		this.events.onStreamStart?.();
		this.emitMessagesChange();
	}
	/**
	* Handle TEXT_MESSAGE_END event
	*/
	handleTextMessageEndEvent(chunk) {
		const { messageId } = chunk;
		this.mergeMessageMetadata(messageId, chunk.metadata);
		const state = this.getMessageState(messageId);
		if (!state) return;
		if (state.isComplete) return;
		if (state.currentSegmentText !== state.lastEmittedText) this.emitTextUpdateForMessage(messageId);
	}
	/**
	* Handle MESSAGES_SNAPSHOT event
	*/
	handleMessagesSnapshotEvent(chunk) {
		this.resetStreamState();
		const prevMessages = this.messages;
		const prevById = new Map(prevMessages.map((msg) => [msg.id, msg]));
		const normalized = this.mergeReasoningFanOut(chunk.messages.map(aguiSnapshotMessageToUIMessage));
		this.messages = this.reconcileSnapshotToolCalls(normalized, prevMessages).map((msg) => {
			if (msg.metadata != null) return msg;
			const prev = prevById.get(msg.id);
			if (prev?.metadata == null) return msg;
			return {
				...msg,
				metadata: prev.metadata
			};
		});
		this.emitMessagesChange();
	}
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
	mergeReasoningFanOut(messages) {
		const out = [];
		let pending = [];
		const thinkingParts = (msg) => msg.parts.filter((part) => part.type === "thinking");
		const isThinkingOnly = (msg) => msg.role === "assistant" && msg.parts.length > 0 && msg.parts.every((part) => part.type === "thinking");
		const isToolResultOnly = (msg) => msg.role === "assistant" && msg.parts.some((part) => part.type === "tool-result") && msg.parts.every((part) => part.type === "tool-result" || part.type === "ui-resource");
		const flushPending = () => {
			out.push(...pending);
			pending = [];
		};
		for (const msg of messages) {
			if (isThinkingOnly(msg)) {
				pending.push(msg);
				continue;
			}
			if (msg.role === "assistant" && pending.length > 0 && !isToolResultOnly(msg)) {
				out.push({
					...msg,
					parts: [...pending.flatMap(thinkingParts), ...msg.parts]
				});
				pending = [];
				continue;
			}
			flushPending();
			out.push(msg);
		}
		flushPending();
		return out;
	}
	reconcileSnapshotToolCalls(snapshot, prevMessages) {
		const prevToolCalls = /* @__PURE__ */ new Map();
		for (const msg of prevMessages) for (const part of msg.parts) if (part.type === "tool-call") prevToolCalls.set(part.id, part);
		const snapshotToolCallIds = /* @__PURE__ */ new Set();
		for (const msg of snapshot) for (const part of msg.parts) if (part.type === "tool-call") snapshotToolCallIds.add(part.id);
		const reconciled = [];
		for (const msg of snapshot) {
			const toolResultParts = msg.parts.filter((part) => part.type === "tool-result");
			const toolResultPart = msg.role === "assistant" && toolResultParts.length === 1 && msg.parts.every((part) => part.type === "tool-result" || part.type === "ui-resource") ? toolResultParts[0] : void 0;
			if (!toolResultPart) {
				reconciled.push(msg);
				continue;
			}
			const target = reconciled.findLast((m) => m.parts.some((p) => p.type === "tool-call" && p.id === toolResultPart.toolCallId)) ?? reconciled.findLast((m) => m.role === "assistant" && !(m.parts.length === 1 && m.parts[0]?.type === "tool-result"));
			if (!target) {
				if (!snapshotToolCallIds.has(toolResultPart.toolCallId)) console.warn(`[StreamProcessor] MESSAGES_SNAPSHOT contains a tool-result for "${toolResultPart.toolCallId}" but no matching tool-call exists in the snapshot, and there is no assistant message to anchor into; addToolResult("${toolResultPart.toolCallId}") will not be able to locate this call`);
				reconciled.push(msg);
				continue;
			}
			const parts = [...target.parts];
			if (!snapshotToolCallIds.has(toolResultPart.toolCallId) && !parts.some((p) => p.type === "tool-call" && p.id === toolResultPart.toolCallId)) {
				const prev = prevToolCalls.get(toolResultPart.toolCallId);
				if (prev) {
					parts.push({ ...prev });
					snapshotToolCallIds.add(prev.id);
				} else console.warn(`[StreamProcessor] MESSAGES_SNAPSHOT contains a tool-result for "${toolResultPart.toolCallId}" but no matching tool-call exists in the snapshot or the pre-snapshot state; addToolResult("${toolResultPart.toolCallId}") will not be able to locate this call`);
			}
			parts.push(...msg.parts);
			target.parts = parts;
		}
		return this.enrichSnapshotToolCallsFromResults(reconciled, prevToolCalls);
	}
	/**
	* Post-pass (c): fold `tool-result` content into sibling `tool-call` parts
	* and prefer pre-snapshot complete/output when the snapshot rebuilt a
	* poorer `input-complete` call (AG-UI ModelMessage has no result on calls).
	*/
	enrichSnapshotToolCallsFromResults(messages, prevToolCalls) {
		const resultsByCallId = /* @__PURE__ */ new Map();
		for (const msg of messages) for (const part of msg.parts) if (part.type === "tool-result") resultsByCallId.set(part.toolCallId, part);
		return messages.map((msg) => {
			const parts = msg.parts.map((part) => {
				if (part.type !== "tool-call") return part;
				const prev = prevToolCalls.get(part.id);
				const result = resultsByCallId.get(part.id);
				let next = part;
				if (prev && (prev.output !== void 0 || prev.state === "complete" || prev.state === "error") && (part.output === void 0 || part.state === "input-complete" || part.state === "input-streaming" || part.state === "awaiting-input")) next = {
					...part,
					...prev.output !== void 0 ? { output: prev.output } : {},
					state: prev.state,
					...prev.approval !== void 0 ? { approval: prev.approval } : {},
					...prev.metadata !== void 0 ? { metadata: prev.metadata } : {}
				};
				if (result && next.output === void 0) {
					let output;
					if (Array.isArray(result.content)) output = result.content;
					else try {
						output = JSON.parse(result.content);
					} catch {
						output = result.content;
					}
					const errorText = result.state === "error" ? this.extractToolResultError(output) : void 0;
					next = {
						...next,
						output: errorText ? { error: errorText } : output,
						state: result.state === "error" ? "error" : "complete"
					};
				}
				return next;
			});
			return parts.some((part, index) => part !== msg.parts[index]) ? {
				...msg,
				parts
			} : msg;
		});
	}
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
	handleTextMessageContentEvent(chunk) {
		const { messageId, state } = this.ensureAssistantMessage(chunk.messageId);
		this.mergeMessageMetadata(messageId, chunk.metadata);
		if (this.structuredMessageIds.has(messageId)) {
			const delta = chunk.delta || "";
			if (delta !== "") {
				this.messages = appendStructuredOutputDelta(this.messages, messageId, delta);
				state.totalTextContent += delta;
				this.queueStructuredOutputUpdate(messageId, delta);
				this.emitMessagesChange();
			}
			return;
		}
		const previousSegment = state.currentSegmentText;
		if (state.hasToolCallsSinceTextStart && previousSegment.length > 0 && this.isNewTextSegment(chunk, previousSegment)) {
			if (previousSegment !== state.lastEmittedText) this.emitTextUpdateForMessage(messageId);
			state.currentSegmentText = "";
			state.lastEmittedText = "";
			state.hasToolCallsSinceTextStart = false;
		}
		state.hasToolCallsSinceTextStart = false;
		const currentText = state.currentSegmentText;
		const delta = chunk.delta || "";
		const nextText = delta !== "" ? currentText + delta : currentText;
		const textDelta = nextText.slice(currentText.length);
		state.currentSegmentText = nextText;
		state.totalTextContent += textDelta;
		const chunkPortion = chunk.delta || "";
		if (this.chunkStrategy.shouldEmit(chunkPortion, state.currentSegmentText) && state.currentSegmentText !== state.lastEmittedText) this.emitTextUpdateForMessage(messageId);
	}
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
	handleToolCallStartEvent(chunk) {
		const targetMessageId = chunk.parentMessageId ?? this.getActiveAssistantMessageId();
		const { messageId, state } = this.ensureAssistantMessage(targetMessageId ?? void 0);
		state.hasToolCallsSinceTextStart = true;
		const toolCallId = chunk.toolCallId;
		if (!state.toolCalls.get(toolCallId)) {
			const initialState = "awaiting-input";
			const toolName = chunk.toolCallName;
			const chunkMetadata = chunk.metadata;
			const newToolCall = {
				id: chunk.toolCallId,
				name: toolName,
				arguments: "",
				state: initialState,
				parsedArguments: void 0,
				index: state.toolCalls.size,
				...chunkMetadata !== void 0 && { metadata: chunkMetadata }
			};
			state.toolCalls.set(toolCallId, newToolCall);
			state.toolCallOrder.push(toolCallId);
			this.toolCallToMessage.set(toolCallId, messageId);
			this.messages = updateToolCallPart(this.messages, messageId, {
				id: chunk.toolCallId,
				name: toolName,
				arguments: "",
				state: initialState,
				...chunkMetadata !== void 0 && { metadata: chunkMetadata }
			});
			this.emitMessagesChange();
			this.events.onToolCallStateChange?.(messageId, chunk.toolCallId, initialState, "");
		}
	}
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
	handleToolCallArgsEvent(chunk) {
		const toolCallId = chunk.toolCallId;
		const messageId = this.toolCallToMessage.get(toolCallId);
		if (!messageId) return;
		const state = this.getMessageState(messageId);
		if (!state) return;
		const existingToolCall = state.toolCalls.get(toolCallId);
		if (!existingToolCall) return;
		const wasAwaitingInput = existingToolCall.state === "awaiting-input";
		existingToolCall.arguments += chunk.delta || "";
		if (wasAwaitingInput && chunk.delta) existingToolCall.state = "input-streaming";
		existingToolCall.parsedArguments = this.jsonParser.parse(existingToolCall.arguments);
		this.messages = updateToolCallPart(this.messages, messageId, {
			id: existingToolCall.id,
			name: existingToolCall.name,
			arguments: existingToolCall.arguments,
			state: existingToolCall.state
		});
		this.emitMessagesChange();
		this.events.onToolCallStateChange?.(messageId, existingToolCall.id, existingToolCall.state, existingToolCall.arguments);
	}
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
	handleToolCallEndEvent(chunk) {
		const messageId = this.toolCallToMessage.get(chunk.toolCallId);
		if (!messageId) return;
		const msgState = this.getMessageState(messageId);
		if (!msgState) return;
		const input = chunk.input !== void 0 ? chunk.input : tanstackMetadata(chunk)?.input;
		const existingToolCall = msgState.toolCalls.get(chunk.toolCallId);
		if (existingToolCall && existingToolCall.state !== "input-complete") {
			if (input !== void 0 && !existingToolCall.arguments) try {
				existingToolCall.arguments = JSON.stringify(input);
			} catch {}
			const index = msgState.toolCallOrder.indexOf(chunk.toolCallId);
			this.completeToolCall(messageId, index, existingToolCall);
			if (input !== void 0) {
				existingToolCall.parsedArguments = input;
				this.messages = updateToolCallPart(this.messages, messageId, {
					id: existingToolCall.id,
					name: existingToolCall.name,
					arguments: existingToolCall.arguments,
					state: "input-complete",
					input,
					...existingToolCall.metadata !== void 0 && { metadata: existingToolCall.metadata }
				});
				this.emitMessagesChange();
			}
		}
	}
	extractToolResultError(output) {
		if (output && typeof output === "object" && "error" in output && typeof output.error === "string") return output.error;
		return typeof output === "string" ? output : "Tool execution failed";
	}
	/**
	* Handle TOOL_CALL_RESULT event (AG-UI spec).
	*
	* Creates a tool-result part and updates the tool-call output field,
	* mirroring the logic from TOOL_CALL_END when it carries a result.
	* This is the spec-compliant path for delivering tool results to the client.
	*/
	handleToolCallResultEvent(chunk) {
		const messageId = this.toolCallToMessage.get(chunk.toolCallId) ?? this.messages.find((m) => m.parts.some((p) => p.type === "tool-call" && p.id === chunk.toolCallId))?.id;
		if (!messageId) return;
		const isOutputError = chunk.state === "output-error" || tanstackMetadata(chunk)?.state === "output-error";
		let output;
		try {
			output = JSON.parse(chunk.content);
		} catch {
			output = chunk.content;
		}
		this.messages = updateToolCallWithOutput(this.messages, chunk.toolCallId, output, isOutputError ? "error" : void 0);
		const resultState = isOutputError ? "error" : "complete";
		this.messages = updateToolResultPart(this.messages, messageId, chunk.toolCallId, chunk.content, resultState, resultState === "error" ? this.extractToolResultError(output) : void 0);
		this.emitMessagesChange();
	}
	/**
	* Handle RUN_STARTED event.
	*
	* Registers the run so that RUN_FINISHED can determine whether other
	* runs are still active before finalizing.
	*/
	handleRunStartedEvent(chunk) {
		this.activeRuns.add(chunk.runId);
	}
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
	handleRunFinishedEvent(chunk) {
		const extra = chunk;
		this.finishReason = extra.finishReason !== void 0 ? extra.finishReason : tanstackMetadata(chunk)?.finishReason ?? null;
		this.activeRuns.delete(chunk.runId);
		if (chunk.outcome?.type === "interrupt") this.handleInterrupts(chunk.outcome.interrupts);
		if (this.activeRuns.size === 0) {
			this.completeAllToolCalls();
			if (this.finishReason === "tool_calls" && chunk.outcome?.type !== "interrupt") return;
			this.isDone = true;
			this.finalizeStream();
		}
	}
	handleInterrupts(interrupts) {
		const hasGeneric = interruptBatchHasGeneric(interrupts);
		for (const interrupt of interrupts) {
			const metadata = interrupt.metadata && typeof interrupt.metadata === "object" ? interrupt.metadata : {};
			const kind = typeof metadata.kind === "string" ? metadata.kind : void 0;
			const toolCallId = interrupt.toolCallId;
			if (!toolCallId) continue;
			const toolName = typeof metadata.toolName === "string" ? metadata.toolName : this.findToolCallName(toolCallId);
			const input = Object.hasOwn(metadata, "input") ? metadata.input : {};
			if (kind === "approval" || interrupt.reason === "approval_required") {
				const resolvedMessageId = this.getActiveAssistantMessageId() ?? this.toolCallToMessage.get(toolCallId) ?? this.messages.find((m) => m.role === "assistant" && m.parts.some((p) => p.type === "tool-call" && p.id === toolCallId))?.id;
				if (resolvedMessageId) {
					this.messages = updateToolCallApproval(this.messages, resolvedMessageId, toolCallId, interrupt.id);
					this.emitMessagesChange();
				}
				this.events.onApprovalRequest?.({
					toolCallId,
					toolName,
					input,
					approvalId: interrupt.id
				});
				continue;
			}
			if (kind === "client_tool" || interrupt.reason === "client_tool_input") {
				if (hasGeneric) continue;
				this.events.onToolCall?.({
					toolCallId,
					toolName,
					input
				});
			}
		}
	}
	findToolCallName(toolCallId) {
		for (const state of this.messageStates.values()) {
			const toolCall = state.toolCalls.get(toolCallId);
			if (toolCall) return toolCall.name;
		}
		return "";
	}
	/**
	* Handle RUN_ERROR event
	*/
	handleRunErrorEvent(chunk) {
		this.hasError = true;
		const runId = getChunkRunId(chunk);
		if (runId) this.activeRuns.delete(runId);
		else this.activeRuns.clear();
		const { messageId } = this.ensureAssistantMessage();
		const errorMessage = chunk.message || "An error occurred";
		if (!chunk.message) console.error("[StreamProcessor] RUN_ERROR with no message; original chunk:", chunk);
		if (this.structuredMessageIds.has(messageId)) {
			this.flushStructuredOutputUpdate(messageId);
			this.messages = errorStructuredOutputPart(this.messages, messageId, errorMessage);
			this.structuredMessageIds.delete(messageId);
			this.emitStructuredOutputChange(messageId, "error");
			this.emitMessagesChange();
		}
		this.events.onError?.(runErrorEventToError(chunk));
	}
	/**
	* Handle STEP_STARTED event (for thinking/reasoning content).
	*
	* Records the stepId so later REASONING_MESSAGE_CONTENT deltas accumulate
	* into their own ThinkingPart. Does not create a message — the message
	* is lazily created when the first REASONING_MESSAGE_CONTENT arrives.
	*/
	handleStepStartedEvent(chunk) {
		const stepId = chunk.stepName || generateMessageId();
		const activeId = this.getActiveAssistantMessageId();
		if (activeId) {
			const state = this.getMessageState(activeId);
			if (state) {
				state.currentThinkingStepId = stepId;
				if (!state.thinkingSteps.has(stepId)) {
					state.thinkingSteps.set(stepId, "");
					state.thinkingStepOrder.push(stepId);
				}
				this.pendingThinkingStepId = null;
				return;
			}
		}
		this.pendingThinkingStepId = stepId;
	}
	/**
	* Handle STEP_FINISHED event.
	*
	* Thinking *content* comes from REASONING_MESSAGE_CONTENT, not STEP_FINISHED.
	* But some adapters (e.g. BytePlus thinking-summary) carry the provider
	* signature blob ONLY on the STEP_FINISHED event, so still extract that here
	* and attach it to the thinking step the reasoning events already built.
	*/
	handleStepFinishedEvent(chunk) {
		const extra = chunk;
		const signature = extra.signature;
		if (!signature) return;
		const { messageId, state } = this.ensureAssistantMessage(this.getActiveAssistantMessageId() ?? void 0);
		const stepId = state.currentThinkingStepId ?? extra.stepId;
		if (!stepId) return;
		const thinking = state.thinkingSteps.get(stepId);
		if (thinking === void 0) return;
		state.thinkingStepSignatures.set(stepId, signature);
		this.messages = updateThinkingPart(this.messages, messageId, stepId, thinking, signature);
		this.emitMessagesChange();
	}
	/**
	* Handle REASONING_MESSAGE_CONTENT event (AG-UI reasoning protocol).
	*
	* Accumulates reasoning delta into thinking content and updates the
	* corresponding ThinkingPart in the UIMessage.
	*/
	handleReasoningMessageContentEvent(chunk) {
		const { messageId, state } = this.ensureAssistantMessage(this.getActiveAssistantMessageId() ?? void 0);
		state.hasSeenReasoningEvents = true;
		const delta = chunk.delta || "";
		this.consumePendingThinkingStep(state);
		const stepId = state.currentThinkingStepId ?? chunk.messageId;
		if (!state.thinkingSteps.has(stepId)) {
			state.thinkingSteps.set(stepId, "");
			state.thinkingStepOrder.push(stepId);
			state.currentThinkingStepId = stepId;
		}
		const nextThinking = (state.thinkingSteps.get(stepId) ?? "") + delta;
		state.thinkingSteps.set(stepId, nextThinking);
		this.messages = updateThinkingPart(this.messages, messageId, stepId, nextThinking, state.thinkingStepSignatures.get(stepId));
		this.emitMessagesChange();
		this.events.onThinkingUpdate?.(messageId, stepId, nextThinking);
	}
	/**
	* Attach a provider signature blob from REASONING_ENCRYPTED_VALUE.
	* `subtype: 'message'` updates ThinkingPart.signature.
	* `subtype: 'tool-call'` stores Gemini thoughtSignature on the tool-call part.
	*/
	handleReasoningEncryptedValueEvent(chunk) {
		const encryptedValue = chunk.encryptedValue;
		if (typeof encryptedValue !== "string" || encryptedValue === "") return;
		if (chunk.subtype === "tool-call") {
			this.attachToolCallSignature(chunk.entityId, encryptedValue);
			return;
		}
		const { messageId, state } = this.ensureAssistantMessage(this.getActiveAssistantMessageId() ?? void 0);
		const stepId = state.currentThinkingStepId ?? chunk.entityId;
		state.thinkingStepSignatures.set(stepId, encryptedValue);
		const content = state.thinkingSteps.get(stepId) ?? "";
		if (!state.thinkingSteps.has(stepId)) {
			state.thinkingSteps.set(stepId, content);
			state.thinkingStepOrder.push(stepId);
		}
		this.messages = updateThinkingPart(this.messages, messageId, stepId, content, encryptedValue);
		this.emitMessagesChange();
	}
	attachToolCallSignature(toolCallId, thoughtSignature) {
		this.messages = this.messages.map((msg) => {
			let changed = false;
			const parts = msg.parts.map((part) => {
				if (part.type !== "tool-call" || part.id !== toolCallId) return part;
				changed = true;
				return {
					...part,
					metadata: {
						...part.metadata != null && typeof part.metadata === "object" ? part.metadata : {},
						thoughtSignature
					}
				};
			});
			return changed ? {
				...msg,
				parts
			} : msg;
		});
		for (const state of this.messageStates.values()) {
			const call = state.toolCalls.get(toolCallId);
			if (!call) continue;
			call.metadata = {
				...call.metadata ?? {},
				thoughtSignature
			};
		}
		this.emitMessagesChange();
	}
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
	handleCustomEvent(chunk) {
		const messageId = this.getActiveAssistantMessageId();
		if (chunk.name === "structured-output.start" && chunk.value) {
			const v = chunk.value;
			const { messageId: targetId } = this.ensureAssistantMessage(v.messageId ?? messageId ?? void 0);
			if (targetId) {
				this.structuredMessageIds.add(targetId);
				this.structuredOutputUpdateBatches.delete(targetId);
				this.events.onStructuredOutputChange?.({
					phase: "start",
					messageId: targetId,
					status: "streaming",
					raw: ""
				});
			}
			return;
		}
		if (chunk.name === "structured-output.complete" && chunk.value) {
			const v = chunk.value;
			const { messageId: targetId } = this.ensureAssistantMessage(v.messageId ?? messageId ?? void 0);
			if (targetId) {
				this.flushStructuredOutputUpdate(targetId);
				this.messages = completeStructuredOutputPart(this.messages, targetId, v.object, v.raw ?? "", v.reasoning);
				this.structuredMessageIds.delete(targetId);
				this.emitStructuredOutputChange(targetId, "complete");
				this.emitMessagesChange();
			}
		}
		if (chunk.name === "tool-input-available" && chunk.value) {
			const { toolCallId, toolName, input } = chunk.value;
			this.events.onToolCall?.({
				toolCallId,
				toolName,
				input
			});
			return;
		}
		if (chunk.name === "approval-requested" && chunk.value) {
			const { toolCallId, toolName, input, approval } = chunk.value;
			const resolvedMessageId = messageId ?? this.toolCallToMessage.get(toolCallId);
			if (resolvedMessageId) {
				this.messages = updateToolCallApproval(this.messages, resolvedMessageId, toolCallId, approval.id);
				this.emitMessagesChange();
			}
			this.events.onApprovalRequest?.({
				toolCallId,
				toolName,
				input,
				approvalId: approval.id
			});
			return;
		}
		if (chunk.name === "ui-resource" && chunk.value) {
			const v = chunk.value;
			const resolvedMessageId = this.toolCallToMessage.get(v.toolCallId) ?? messageId;
			if (resolvedMessageId) {
				const part = {
					type: "ui-resource",
					resource: v.resource,
					toolCallId: v.toolCallId,
					toolName: v.toolName,
					...v.serverId !== void 0 && { serverId: v.serverId },
					...v.meta !== void 0 && { meta: v.meta }
				};
				this.messages = this.messages.map((msg) => msg.id === resolvedMessageId ? {
					...msg,
					parts: [...msg.parts, part]
				} : msg);
				this.emitMessagesChange();
			} else console.warn(`[mcp-apps] dropped ui-resource: no target message for toolCallId "${v.toolCallId}" (toolName "${v.toolName}")`);
			return;
		}
		if (this.events.onCustomEvent) {
			const toolCallId = chunk.value && typeof chunk.value === "object" ? chunk.value.toolCallId : void 0;
			this.events.onCustomEvent(chunk.name, chunk.value, { toolCallId });
		}
	}
	/**
	* Detect if an incoming content chunk represents a NEW text segment
	*/
	isNewTextSegment(_chunk, _previous) {
		return true;
	}
	/**
	* Complete all tool calls across all active messages — safety net for stream termination.
	*
	* Called by RUN_FINISHED and finalizeStream(). Force-transitions any tool call
	* not yet in input-complete state. Handles cases where TOOL_CALL_END was
	* missed (adapter bug, network error, aborted stream).
	*
	* @see docs/chat-architecture.md#single-shot-tool-call-response — Safety net behavior
	*/
	completeAllToolCalls() {
		for (const messageId of this.activeMessageIds) this.completeAllToolCallsForMessage(messageId);
	}
	/**
	* Complete all tool calls for a specific message
	*/
	completeAllToolCallsForMessage(messageId) {
		const state = this.getMessageState(messageId);
		if (!state) return;
		state.toolCalls.forEach((toolCall, id) => {
			if (toolCall.state !== "input-complete") {
				const index = state.toolCallOrder.indexOf(id);
				this.completeToolCall(messageId, index, toolCall);
			}
		});
	}
	/**
	* Mark a tool call as complete and emit event
	*/
	completeToolCall(messageId, _index, toolCall) {
		toolCall.state = "input-complete";
		let strictParseSucceeded = false;
		try {
			toolCall.parsedArguments = JSON.parse(toolCall.arguments);
			strictParseSucceeded = true;
		} catch {
			toolCall.parsedArguments = void 0;
		}
		if (this.isToolCallPartErrored(toolCall.id)) return;
		if (this.isToolCallPartAwaitingUserAction(toolCall.id)) return;
		this.messages = updateToolCallPart(this.messages, messageId, {
			id: toolCall.id,
			name: toolCall.name,
			arguments: toolCall.arguments,
			state: "input-complete",
			...strictParseSucceeded && { input: toolCall.parsedArguments },
			...toolCall.metadata !== void 0 && { metadata: toolCall.metadata }
		});
		this.emitMessagesChange();
		this.events.onToolCallStateChange?.(messageId, toolCall.id, "input-complete", toolCall.arguments);
	}
	isToolCallPartAwaitingUserAction(toolCallId) {
		return this.messages.some((msg) => msg.parts?.some((part) => part.type === "tool-call" && part.id === toolCallId && (part.state === "approval-requested" || part.state === "approval-responded")));
	}
	/**
	* Whether the rendered tool-call part for the given id has reached the
	* terminal 'error' state. Used to prevent the completion safety net from
	* downgrading a failed call back to 'input-complete'.
	*/
	isToolCallPartErrored(toolCallId) {
		return this.messages.some((msg) => msg.parts?.some((part) => part.type === "tool-call" && part.id === toolCallId && part.state === "error"));
	}
	/**
	* Emit pending text update for a specific message.
	*
	* Calls updateTextPart() which has critical append-vs-replace logic:
	* - If last UIMessage part is TextPart → replaces its content (same segment).
	* - If last part is anything else → pushes new TextPart (new segment after tools).
	*
	* @see docs/chat-architecture.md#uimessage-part-ordering-invariants — Replace vs. push logic
	*/
	emitTextUpdateForMessage(messageId) {
		const state = this.getMessageState(messageId);
		if (!state) return;
		state.lastEmittedText = state.currentSegmentText;
		this.messages = updateTextPart(this.messages, messageId, state.currentSegmentText);
		this.emitMessagesChange();
		this.events.onTextUpdate?.(messageId, state.currentSegmentText);
	}
	queueStructuredOutputUpdate(messageId, delta) {
		const existing = this.structuredOutputUpdateBatches.get(messageId);
		const next = {
			delta: `${existing?.delta ?? ""}${delta}`,
			chunkCount: (existing?.chunkCount ?? 0) + 1
		};
		this.structuredOutputUpdateBatches.set(messageId, next);
		if (next.chunkCount >= STRUCTURED_OUTPUT_UPDATE_BATCH_SIZE) this.flushStructuredOutputUpdate(messageId);
	}
	flushStructuredOutputUpdate(messageId) {
		const batch = this.structuredOutputUpdateBatches.get(messageId);
		if (!batch || batch.chunkCount === 0) return;
		this.structuredOutputUpdateBatches.delete(messageId);
		this.emitStructuredOutputChange(messageId, "update", batch.delta);
	}
	emitStructuredOutputChange(messageId, phase, delta) {
		const part = this.messages.find((message) => message.id === messageId)?.parts.find((messagePart) => messagePart.type === "structured-output");
		if (!part) return;
		this.events.onStructuredOutputChange?.({
			phase,
			messageId,
			status: part.status,
			raw: part.raw,
			...part.partial !== void 0 ? { partial: part.partial } : {},
			...part.data !== void 0 ? { data: part.data } : {},
			...part.reasoning !== void 0 ? { reasoning: part.reasoning } : {},
			...part.errorMessage !== void 0 ? { errorMessage: part.errorMessage } : {},
			...delta !== void 0 ? { delta } : {}
		});
	}
	/**
	* Emit messages change event
	*/
	emitMessagesChange() {
		this.events.onMessagesChange?.([...this.messages]);
	}
	/**
	* Finalize the stream — complete all pending operations.
	*
	* Called when the async iterable ends (stream closed). Acts as the final
	* safety net: completes any remaining tool calls, flushes un-emitted text,
	* and fires onStreamEnd.
	*
	* @see docs/chat-architecture.md#single-shot-text-response — Finalization step
	*/
	finalizeStream() {
		this.isDone = true;
		let lastAssistantMessage;
		for (const messageId of this.activeMessageIds) {
			const state = this.getMessageState(messageId);
			if (!state) continue;
			this.completeAllToolCallsForMessage(messageId);
			if (state.currentSegmentText !== state.lastEmittedText) this.emitTextUpdateForMessage(messageId);
			state.isComplete = true;
			const msg = this.messages.find((m) => m.id === messageId);
			if (msg && msg.role === "assistant") lastAssistantMessage = msg;
		}
		for (const messageId of this.structuredMessageIds) {
			this.flushStructuredOutputUpdate(messageId);
			this.messages = errorStructuredOutputPart(this.messages, messageId, "Stream ended without structured-output.complete");
			this.emitStructuredOutputChange(messageId, "error");
		}
		this.structuredMessageIds.clear();
		this.structuredOutputUpdateBatches.clear();
		this.activeMessageIds.clear();
		if (lastAssistantMessage && !this.hasError) {
			if (this.isWhitespaceOnlyMessage(lastAssistantMessage)) {
				this.messages = this.messages.filter((m) => m.id !== lastAssistantMessage.id);
				this.emitMessagesChange();
				return;
			}
		}
		if (lastAssistantMessage && !this.streamEndEmitted) {
			this.streamEndEmitted = true;
			this.events.onStreamEnd?.(lastAssistantMessage);
		}
	}
	/**
	* Get completed tool calls in API format (aggregated across all messages)
	*/
	getCompletedToolCalls() {
		const result = [];
		for (const state of this.messageStates.values()) for (const tc of state.toolCalls.values()) if (tc.state === "input-complete") result.push({
			id: tc.id,
			type: "function",
			function: {
				name: tc.name,
				arguments: tc.arguments
			},
			...tc.metadata !== void 0 && { metadata: tc.metadata }
		});
		return result;
	}
	/**
	* Get current result (aggregated across all messages)
	*/
	getResult() {
		const toolCalls = this.getCompletedToolCalls();
		let content = "";
		let thinking = "";
		for (const state of this.messageStates.values()) {
			content += state.totalTextContent;
			for (const stepId of state.thinkingStepOrder) thinking += state.thinkingSteps.get(stepId) ?? "";
		}
		return {
			content,
			thinking: thinking || void 0,
			toolCalls: toolCalls.length > 0 ? toolCalls : void 0,
			finishReason: this.finishReason
		};
	}
	/**
	* Get current processor state (aggregated across all messages)
	*/
	getState() {
		let content = "";
		let thinking = "";
		const toolCalls = /* @__PURE__ */ new Map();
		const toolCallOrder = [];
		for (const state of this.messageStates.values()) {
			content += state.totalTextContent;
			for (const stepId of state.thinkingStepOrder) thinking += state.thinkingSteps.get(stepId) ?? "";
			for (const [id, tc] of state.toolCalls) toolCalls.set(id, tc);
			toolCallOrder.push(...state.toolCallOrder);
		}
		return {
			content,
			thinking,
			toolCalls,
			toolCallOrder,
			finishReason: this.finishReason,
			done: this.isDone
		};
	}
	/**
	* Start recording chunks
	*/
	startRecording() {
		this.recordingEnabled = true;
		this.recordingStartTime = Date.now();
		this.recording = {
			version: "1.0",
			timestamp: this.recordingStartTime,
			chunks: []
		};
	}
	/**
	* Get the current recording
	*/
	getRecording() {
		return this.recording;
	}
	/**
	* Reset stream state (but keep messages)
	*/
	resetStreamState() {
		this.messageStates.clear();
		this.activeMessageIds.clear();
		this.activeRuns.clear();
		this.toolCallToMessage.clear();
		this.structuredMessageIds.clear();
		this.structuredOutputUpdateBatches.clear();
		this.pendingManualMessageId = null;
		this.pendingThinkingStepId = null;
		this.finishReason = null;
		this.hasError = false;
		this.isDone = false;
		this.streamEndEmitted = false;
		this.chunkStrategy.reset?.();
	}
	/**
	* Full reset (including messages)
	*/
	reset() {
		this.resetStreamState();
		this.messages = [];
	}
	/**
	* Check if a message contains only whitespace text and no other meaningful parts
	* (no tool calls, tool results, thinking, etc.)
	*/
	isWhitespaceOnlyMessage(message) {
		if (message.parts.length === 0) return false;
		return message.parts.every((part) => part.type === "text" && part.content.trim() === "");
	}
	/**
	* Replay a recording through the processor
	*/
	static async replay(recording, options) {
		return new StreamProcessor(options).process(createReplayStream(recording));
	}
};
/**
* Create an async iterable from a recording
*/
function createReplayStream(recording) {
	return { async *[Symbol.asyncIterator]() {
		for (const { chunk } of recording.chunks) yield chunk;
	} };
}
//#endregion
export { StreamProcessor, createReplayStream };

//# sourceMappingURL=processor.js.map