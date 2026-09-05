import { parsePartialJSON } from "./json-parser.js";
//#region src/activities/chat/stream/message-updaters.ts
/**
* Message Updaters (Internal)
*
* Internal helper functions for updating UIMessage parts.
* These are used by StreamProcessor to manage the message array.
*/
/**
* Update or add a text part to a message.
*
* If the last part is a text part, update it (continuing the same text segment).
* Otherwise, create a new text part (starting a new text segment after tool calls).
*/
function updateTextPart(messages, messageId, content) {
	return messages.map((msg) => {
		if (msg.id !== messageId) return msg;
		const parts = [...msg.parts];
		const lastPart = parts.length > 0 ? parts[parts.length - 1] : null;
		if (lastPart && lastPart.type === "text") parts[parts.length - 1] = {
			type: "text",
			content
		};
		else parts.push({
			type: "text",
			content
		});
		return {
			...msg,
			parts
		};
	});
}
/**
* Update or add a tool call part to a message.
*/
function updateToolCallPart(messages, messageId, toolCall) {
	return messages.map((msg) => {
		if (msg.id !== messageId) return msg;
		const parts = [...msg.parts];
		const existing = parts.find((p) => p.type === "tool-call" && p.id === toolCall.id);
		const metadata = toolCall.metadata ?? existing?.metadata;
		const input = toolCall.input ?? existing?.input;
		const toolCallPart = {
			type: "tool-call",
			id: toolCall.id,
			name: toolCall.name,
			arguments: toolCall.arguments,
			state: toolCall.state,
			...existing?.approval && { approval: { ...existing.approval } },
			...existing?.output !== void 0 && { output: existing.output },
			...input !== void 0 && { input },
			...metadata !== void 0 && { metadata }
		};
		if (existing) parts[parts.indexOf(existing)] = toolCallPart;
		else parts.push(toolCallPart);
		return {
			...msg,
			parts
		};
	});
}
/**
* Update or add a tool result part to a message.
*/
function updateToolResultPart(messages, messageId, toolCallId, content, state, error) {
	return messages.map((msg) => {
		if (msg.id !== messageId) return msg;
		const parts = [...msg.parts];
		const resultPartIndex = parts.findIndex((p) => p.type === "tool-result" && p.toolCallId === toolCallId);
		const toolResultPart = {
			type: "tool-result",
			toolCallId,
			content,
			state,
			...error && { error }
		};
		if (resultPartIndex >= 0) parts[resultPartIndex] = toolResultPart;
		else parts.push(toolResultPart);
		return {
			...msg,
			parts
		};
	});
}
/**
* Update a tool call part with approval request metadata.
*/
function updateToolCallApproval(messages, messageId, toolCallId, approvalId) {
	return messages.map((msg) => {
		if (msg.id !== messageId) return msg;
		const parts = [...msg.parts];
		const toolCallPart = parts.find((p) => p.type === "tool-call" && p.id === toolCallId);
		if (toolCallPart) {
			const index = parts.indexOf(toolCallPart);
			parts[index] = {
				...toolCallPart,
				state: "approval-requested",
				approval: {
					id: approvalId,
					needsApproval: true
				}
			};
		}
		return {
			...msg,
			parts
		};
	});
}
/**
* Update a tool call part with output.
* Searches all messages to find the tool call by ID.
*/
function updateToolCallWithOutput(messages, toolCallId, output, state, errorText) {
	return messages.map((msg) => {
		const parts = [...msg.parts];
		const toolCallPart = parts.find((p) => p.type === "tool-call" && p.id === toolCallId);
		if (toolCallPart) {
			const index = parts.indexOf(toolCallPart);
			parts[index] = {
				...toolCallPart,
				output: errorText ? { error: errorText } : output,
				state: state ?? (errorText ? "error" : "complete")
			};
		}
		return {
			...msg,
			parts
		};
	});
}
/**
* Update a tool call part with approval response.
* Searches all messages to find the tool call by approval ID.
*/
function updateToolCallApprovalResponse(messages, approvalId, approved) {
	return messages.map((msg) => {
		const parts = [...msg.parts];
		const toolCallPart = parts.find((p) => p.type === "tool-call" && p.approval?.id === approvalId);
		if (toolCallPart && toolCallPart.approval) {
			const index = parts.indexOf(toolCallPart);
			parts[index] = {
				...toolCallPart,
				approval: {
					...toolCallPart.approval,
					approved
				},
				state: "approval-responded"
			};
		}
		return {
			...msg,
			parts
		};
	});
}
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
function appendStructuredOutputDelta(messages, messageId, delta) {
	return messages.map((msg) => {
		if (msg.id !== messageId) return msg;
		const parts = [...msg.parts];
		const existingIndex = parts.findIndex((p) => p.type === "structured-output");
		const existing = existingIndex >= 0 ? parts[existingIndex] : null;
		const nextRaw = (existing?.raw ?? "") + delta;
		const progressive = parsePartialJSON(nextRaw);
		const nextPartial = progressive !== void 0 && progressive !== null ? progressive : existing?.partial;
		const nextPart = {
			type: "structured-output",
			status: "streaming",
			raw: nextRaw,
			...nextPartial !== void 0 ? { partial: nextPartial } : {},
			...existing?.reasoning !== void 0 ? { reasoning: existing.reasoning } : {}
		};
		if (existingIndex >= 0) parts[existingIndex] = nextPart;
		else parts.push(nextPart);
		return {
			...msg,
			parts
		};
	});
}
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
function completeStructuredOutputPart(messages, messageId, data, raw, reasoning) {
	return messages.map((msg) => {
		if (msg.id !== messageId) return msg;
		const parts = [...msg.parts];
		const existingIndex = parts.findIndex((p) => p.type === "structured-output");
		const existingRaw = existingIndex >= 0 ? parts[existingIndex].raw : "";
		let resolvedRaw = raw || existingRaw;
		if (resolvedRaw === "" && data !== void 0) try {
			resolvedRaw = JSON.stringify(data);
		} catch {}
		const nextPart = {
			type: "structured-output",
			status: "complete",
			data,
			partial: data,
			raw: resolvedRaw,
			...reasoning !== void 0 ? { reasoning } : {}
		};
		if (existingIndex >= 0) parts[existingIndex] = nextPart;
		else parts.push(nextPart);
		return {
			...msg,
			parts
		};
	});
}
/**
* Mark the structured-output part on `messageId` as errored. If no part
* exists yet — RUN_ERROR fired after `structured-output.start` but before
* any delta — create an empty errored placeholder so consumers have
* something renderable. Existing complete parts are left alone (an error
* after a successful complete should not retroactively un-complete it).
*/
function errorStructuredOutputPart(messages, messageId, errorMessage) {
	return messages.map((msg) => {
		if (msg.id !== messageId) return msg;
		const parts = [...msg.parts];
		const existingIndex = parts.findIndex((p) => p.type === "structured-output");
		if (existingIndex < 0) {
			parts.push({
				type: "structured-output",
				status: "error",
				raw: "",
				errorMessage
			});
			return {
				...msg,
				parts
			};
		}
		const existing = parts[existingIndex];
		if (existing.status === "complete") return msg;
		parts[existingIndex] = {
			...existing,
			status: "error",
			errorMessage
		};
		return {
			...msg,
			parts
		};
	});
}
/**
* Update or add a thinking part to a message, keyed by stepId.
* Each distinct stepId produces its own ThinkingPart.
*/
function updateThinkingPart(messages, messageId, stepId, content, signature) {
	return messages.map((msg) => {
		if (msg.id !== messageId) return msg;
		const parts = [...msg.parts];
		const thinkingPartIndex = parts.findIndex((p) => p.type === "thinking" && p.stepId === stepId);
		const thinkingPart = {
			type: "thinking",
			content,
			stepId,
			...signature && { signature }
		};
		if (thinkingPartIndex >= 0) parts[thinkingPartIndex] = thinkingPart;
		else parts.push(thinkingPart);
		return {
			...msg,
			parts
		};
	});
}
//#endregion
export { appendStructuredOutputDelta, completeStructuredOutputPart, errorStructuredOutputPart, updateTextPart, updateThinkingPart, updateToolCallApproval, updateToolCallApprovalResponse, updateToolCallPart, updateToolCallWithOutput, updateToolResultPart };

//# sourceMappingURL=message-updaters.js.map