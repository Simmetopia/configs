import { EventType } from "../types.js";
import { isTanstackUsage, toSpecTokenUsage } from "./ag-ui-usage.js";
import { withTanstackMetadata } from "./merge-metadata.js";
import { reasoningEncryptedValue } from "./reasoning-encrypted-value.js";
import { specKeysFor } from "./spec-event-keys.js";
//#region src/utilities/normalize-stream-chunk.ts
function stringField(value) {
	return typeof value === "string" && value !== "" ? value : void 0;
}
function encryptedValueExtras(chunk) {
	const extras = [];
	const timestamp = "timestamp" in chunk && typeof chunk.timestamp === "number" ? chunk.timestamp : void 0;
	if (typeof chunk.signature === "string" && chunk.signature !== "") {
		const source = chunk;
		const toolCallId = stringField(source.toolCallId);
		const entityId = stringField(chunk.stepId) ?? stringField(source.stepName) ?? stringField(source.messageId) ?? toolCallId;
		if (entityId !== void 0) extras.push(reasoningEncryptedValue({
			subtype: toolCallId && !chunk.stepId ? "tool-call" : "message",
			entityId,
			encryptedValue: chunk.signature,
			timestamp
		}));
	}
	if (chunk.type === EventType.TOOL_CALL_START) {
		const thoughtSignature = stringField(chunk.metadata?.thoughtSignature);
		if (thoughtSignature !== void 0 && chunk.toolCallId) extras.push(reasoningEncryptedValue({
			subtype: "tool-call",
			entityId: chunk.toolCallId,
			encryptedValue: thoughtSignature,
			timestamp
		}));
	}
	return extras;
}
function normalizeStreamChunk(chunk) {
	const specKeys = specKeysFor(chunk.type);
	const source = chunk;
	const specChunk = {};
	for (const key of Object.keys(chunk)) if (specKeys.has(key)) specChunk[key] = source[key];
	if (chunk.type === EventType.TOOL_CALL_START) {
		if (specChunk.toolCallName === void 0 && chunk.toolName) specChunk.toolCallName = chunk.toolName;
	}
	if (chunk.type === EventType.RUN_ERROR && chunk.error != null) {
		if (specChunk.message === void 0 && chunk.error.message) specChunk.message = chunk.error.message;
		if (specChunk.code === void 0 && chunk.error.code !== void 0) specChunk.code = chunk.error.code;
	}
	const tanstack = {};
	if (chunk.model !== void 0 && chunk.type !== EventType.TEXT_MESSAGE_CONTENT && chunk.type !== EventType.TOOL_CALL_ARGS) tanstack.model = chunk.model;
	if (chunk.finishReason !== void 0) tanstack.finishReason = chunk.finishReason;
	const interruptErrors = chunk["tanstack:interruptErrors"];
	if (interruptErrors !== void 0) tanstack.interruptErrors = interruptErrors;
	if (chunk.type === EventType.CUSTOM || chunk.type === EventType.RUN_ERROR) {
		if (chunk.threadId !== void 0) tanstack.threadId = chunk.threadId;
		if (chunk.runId !== void 0) tanstack.runId = chunk.runId;
	}
	const skipLeftover = /* @__PURE__ */ new Set([
		"result",
		"error",
		"tanstack:interruptErrors"
	]);
	if (chunk.type === EventType.TEXT_MESSAGE_CONTENT || chunk.type === EventType.TOOL_CALL_ARGS) {
		skipLeftover.add("model");
		skipLeftover.add("content");
		skipLeftover.add("args");
	}
	if (chunk.type === EventType.TOOL_CALL_START) skipLeftover.add("toolName");
	for (const key of Object.keys(chunk)) {
		if (specKeys.has(key) || skipLeftover.has(key)) continue;
		if (tanstack[key] !== void 0) continue;
		const value = source[key];
		if (value !== void 0) tanstack[key] = value;
	}
	if ((chunk.type === EventType.RUN_FINISHED || chunk.type === EventType.RUN_ERROR) && isTanstackUsage(specChunk.usage)) {
		const { usage, leftover } = toSpecTokenUsage(specChunk.usage, { model: typeof chunk.model === "string" ? chunk.model : void 0 });
		specChunk.usage = usage;
		if (leftover !== void 0) tanstack.usage = leftover;
	}
	const normalized = Object.keys(tanstack).length === 0 ? specChunk : withTanstackMetadata(specChunk, tanstack);
	const extras = encryptedValueExtras(chunk);
	const main = [normalized];
	if (chunk.type === EventType.TOOL_CALL_END && chunk.result !== void 0) {
		const parentMessageId = source.parentMessageId;
		const resultChunk = {
			type: EventType.TOOL_CALL_RESULT,
			toolCallId: chunk.toolCallId,
			content: Array.isArray(chunk.result) ? JSON.stringify(chunk.result) : chunk.result,
			messageId: typeof parentMessageId === "string" && parentMessageId !== "" ? parentMessageId : chunk.toolCallId
		};
		if (chunk.state === "output-error") main.push({
			...resultChunk,
			metadata: { tanstack: { state: chunk.state } }
		});
		else main.push(resultChunk);
	}
	return [...main, ...extras];
}
//#endregion
export { normalizeStreamChunk };

//# sourceMappingURL=normalize-stream-chunk.js.map