import { fromSpecTokenUsage, toSpecTokenUsage } from "./utilities/ag-ui-usage.js";
import { mergeMetadata, tanstackMetadata, withTanstackMetadata } from "./utilities/merge-metadata.js";
import { normalizeStreamChunk } from "./utilities/normalize-stream-chunk.js";
import { canonicalInterruptJson, cloneAndDeepFreezeJson, digestInterruptJson } from "./interrupt-serialization.js";
import { INTERRUPT_BINDING_VERSION, canonicalizeInterruptResolutions } from "./interrupts.js";
import { convertSchemaToJsonSchema, isStandardSchema, parseWithStandardSchema, validateWithStandardSchema } from "./activities/chat/tools/schema-converter.js";
import { hashSchemaInput, normalizeApprovalSchema } from "./activities/chat/tools/approval-schema.js";
import { INTERRUPT_BINDING_METADATA_KEY, readInterruptBinding, readUnopenedInterruptBinding, withInterruptBinding, withoutInterruptBinding } from "./interrupt-resume.js";
import { INTERRUPT_PAYLOAD_METADATA_KEY, defineInterrupt, hashInterruptDefinitionSchema } from "./interrupt-definition.js";
import { INTERRUPT_CONTINUATION_METADATA_KEY, INTERRUPT_CONTINUATION_VERSION, genericInterruptContinuationFromDescriptor, readGenericInterruptContinuation, wrapGenericInterruptContinuation } from "./generic-interrupt-continuation.js";
import { convertMessagesToModelMessages, generateMessageId, modelMessageToUIMessage, modelMessagesToUIMessages, normalizeToUIMessage, uiMessageToModelMessages } from "./activities/chat/messages.js";
import { uiMessagesToWire } from "./utilities/ag-ui-wire.js";
import { restoreInboundChunk } from "./utilities/restore-inbound-chunk.js";
import { toolDefinition } from "./activities/chat/tools/tool-definition.js";
import { getChunkRunId, getChunkThreadId } from "./utilities/chunk-ids.js";
import { PartialJSONParser, defaultJSONParser, parsePartialJSON } from "./activities/chat/stream/json-parser.js";
import { BatchStrategy, CompositeStrategy, ImmediateStrategy, PunctuationStrategy, WordBoundaryStrategy } from "./activities/chat/stream/strategies.js";
import { StreamProcessor } from "./activities/chat/stream/processor.js";
//#region src/client.ts
var generationKinds = [
	"image",
	"audio",
	"tts",
	"video",
	"transcription"
];
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasOwnKey(value, key) {
	return Object.prototype.hasOwnProperty.call(value, key);
}
function isGenerationEnvelope(body) {
	return isRecord(body) && (hasOwnKey(body, "data") || hasOwnKey(body, "forwardedProps"));
}
function assertGenerationKind(kind) {
	if (!generationKinds.includes(kind)) throw new Error(`Unsupported generation kind: ${String(kind)}. Expected one of ${generationKinds.join(", ")}.`);
}
function assertInputForKind(kind, input) {
	if (!isRecord(input)) throw new Error(`Generation ${kind} input must be an object.`);
	const requiredKey = kind === "tts" ? "text" : kind === "transcription" ? "audio" : "prompt";
	if (!hasOwnKey(input, requiredKey)) throw new Error(`Generation ${kind} input must include ${requiredKey}.`);
}
function isInputForKind(kind, input) {
	if (!isRecord(input)) return false;
	return hasOwnKey(input, kind === "tts" ? "text" : kind === "transcription" ? "audio" : "prompt");
}
function forwardedPropsFromEnvelope(envelope) {
	if (!hasOwnKey(envelope, "forwardedProps")) return {};
	if (!isRecord(envelope.forwardedProps)) throw new Error("Generation envelope forwardedProps must be an object.");
	return envelope.forwardedProps;
}
function optionalStringField(envelope, key) {
	if (!hasOwnKey(envelope, key)) return;
	const value = envelope[key];
	if (typeof value !== "string") throw new Error(`Generation envelope ${key} must be a string.`);
	return value;
}
function generationIdentityFields(envelope) {
	const identity = {};
	const threadId = optionalStringField(envelope, "threadId");
	const runId = optionalStringField(envelope, "runId");
	if (threadId !== void 0) identity.threadId = threadId;
	if (runId !== void 0) identity.runId = runId;
	return identity;
}
function generationParamsFromBody(kind, body) {
	assertGenerationKind(kind);
	if (isInputForKind(kind, body)) {
		assertInputForKind(kind, body);
		return {
			input: body,
			forwardedProps: {}
		};
	}
	if (!isGenerationEnvelope(body)) {
		assertInputForKind(kind, body);
		return {
			input: body,
			forwardedProps: {}
		};
	}
	if (!hasOwnKey(body, "data")) throw new Error(`Generation ${kind} envelope must include data.`);
	const input = body.data;
	assertInputForKind(kind, input);
	return {
		input,
		forwardedProps: forwardedPropsFromEnvelope(body),
		...generationIdentityFields(body)
	};
}
async function generationParamsFromRequest(kind, request) {
	let body;
	try {
		body = await request.json();
	} catch (error) {
		throw new Error("Invalid JSON request body.", { cause: error });
	}
	if (!isRecord(body)) throw new Error("Generation request body must be a JSON object.");
	return generationParamsFromBody(kind, body);
}
var EventType = /* @__PURE__ */ function(EventType) {
	EventType["TEXT_MESSAGE_START"] = "TEXT_MESSAGE_START";
	EventType["TEXT_MESSAGE_CONTENT"] = "TEXT_MESSAGE_CONTENT";
	EventType["TEXT_MESSAGE_END"] = "TEXT_MESSAGE_END";
	EventType["TEXT_MESSAGE_CHUNK"] = "TEXT_MESSAGE_CHUNK";
	EventType["TOOL_CALL_START"] = "TOOL_CALL_START";
	EventType["TOOL_CALL_ARGS"] = "TOOL_CALL_ARGS";
	EventType["TOOL_CALL_END"] = "TOOL_CALL_END";
	EventType["TOOL_CALL_CHUNK"] = "TOOL_CALL_CHUNK";
	EventType["TOOL_CALL_RESULT"] = "TOOL_CALL_RESULT";
	EventType["THINKING_START"] = "THINKING_START";
	EventType["THINKING_END"] = "THINKING_END";
	EventType["THINKING_TEXT_MESSAGE_START"] = "THINKING_TEXT_MESSAGE_START";
	EventType["THINKING_TEXT_MESSAGE_CONTENT"] = "THINKING_TEXT_MESSAGE_CONTENT";
	EventType["THINKING_TEXT_MESSAGE_END"] = "THINKING_TEXT_MESSAGE_END";
	EventType["STATE_SNAPSHOT"] = "STATE_SNAPSHOT";
	EventType["STATE_DELTA"] = "STATE_DELTA";
	EventType["MESSAGES_SNAPSHOT"] = "MESSAGES_SNAPSHOT";
	EventType["ACTIVITY_SNAPSHOT"] = "ACTIVITY_SNAPSHOT";
	EventType["ACTIVITY_DELTA"] = "ACTIVITY_DELTA";
	EventType["RAW"] = "RAW";
	EventType["CUSTOM"] = "CUSTOM";
	EventType["RUN_STARTED"] = "RUN_STARTED";
	EventType["RUN_FINISHED"] = "RUN_FINISHED";
	EventType["RUN_ERROR"] = "RUN_ERROR";
	EventType["STEP_STARTED"] = "STEP_STARTED";
	EventType["STEP_FINISHED"] = "STEP_FINISHED";
	EventType["REASONING_START"] = "REASONING_START";
	EventType["REASONING_MESSAGE_START"] = "REASONING_MESSAGE_START";
	EventType["REASONING_MESSAGE_CONTENT"] = "REASONING_MESSAGE_CONTENT";
	EventType["REASONING_MESSAGE_END"] = "REASONING_MESSAGE_END";
	EventType["REASONING_MESSAGE_CHUNK"] = "REASONING_MESSAGE_CHUNK";
	EventType["REASONING_END"] = "REASONING_END";
	EventType["REASONING_ENCRYPTED_VALUE"] = "REASONING_ENCRYPTED_VALUE";
	return EventType;
}({});
//#endregion
export { BatchStrategy, CompositeStrategy, EventType, INTERRUPT_BINDING_METADATA_KEY, INTERRUPT_BINDING_VERSION, INTERRUPT_CONTINUATION_METADATA_KEY, INTERRUPT_CONTINUATION_VERSION, INTERRUPT_PAYLOAD_METADATA_KEY, ImmediateStrategy, PartialJSONParser, PunctuationStrategy, StreamProcessor, WordBoundaryStrategy, canonicalInterruptJson, canonicalizeInterruptResolutions, cloneAndDeepFreezeJson, convertMessagesToModelMessages, convertSchemaToJsonSchema, defaultJSONParser, defineInterrupt, digestInterruptJson, fromSpecTokenUsage, generateMessageId, generationParamsFromBody, generationParamsFromRequest, genericInterruptContinuationFromDescriptor, getChunkRunId, getChunkThreadId, hashInterruptDefinitionSchema, hashSchemaInput, isStandardSchema, mergeMetadata, modelMessageToUIMessage, modelMessagesToUIMessages, normalizeApprovalSchema, normalizeStreamChunk, normalizeToUIMessage, parsePartialJSON, parseWithStandardSchema, readGenericInterruptContinuation, readInterruptBinding, readUnopenedInterruptBinding, restoreInboundChunk, tanstackMetadata, toSpecTokenUsage, toolDefinition, uiMessageToModelMessages, uiMessagesToWire, validateWithStandardSchema, withInterruptBinding, withTanstackMetadata, withoutInterruptBinding, wrapGenericInterruptContinuation };

//# sourceMappingURL=client.js.map