import { aiEventClient } from "./index.js";
//#region src/devtools-middleware.ts
var KNOWN_CHUNK_TYPES = /* @__PURE__ */ new Set([
	"TEXT_MESSAGE_CONTENT",
	"TOOL_CALL_START",
	"TOOL_CALL_ARGS",
	"TOOL_CALL_END",
	"TOOL_CALL_RESULT",
	"RUN_FINISHED",
	"RUN_ERROR",
	"REASONING_MESSAGE_CONTENT"
]);
function isTypedChunk(chunk) {
	return typeof chunk === "object" && chunk !== null && "type" in chunk && typeof chunk.type === "string";
}
function isKnownChunk(chunk) {
	return isTypedChunk(chunk) && KNOWN_CHUNK_TYPES.has(chunk.type);
}
function chunkTanstack(chunk) {
	const tanstack = chunk.metadata?.tanstack;
	if (tanstack == null || typeof tanstack !== "object") return void 0;
	return tanstack;
}
function definedDetails(value) {
	return Object.keys(value).length > 0 ? value : void 0;
}
function fromSpecTokenUsage(usage, leftover) {
	const spec = usage?.[0];
	if (spec == null && leftover == null) return;
	const { promptTokensDetails: leftoverPromptDetails, completionTokensDetails: leftoverCompletionDetails, ...leftoverRest } = leftover ?? {};
	const promptTokensDetails = definedDetails({
		...spec?.cachedInputTokens !== void 0 ? { cachedTokens: spec.cachedInputTokens } : {},
		...leftoverPromptDetails
	});
	const completionTokensDetails = definedDetails({
		...spec?.reasoningTokens !== void 0 ? { reasoningTokens: spec.reasoningTokens } : {},
		...leftoverCompletionDetails
	});
	return {
		promptTokens: spec?.inputTokens ?? 0,
		completionTokens: spec?.outputTokens ?? 0,
		totalTokens: spec?.totalTokens ?? 0,
		...leftoverRest,
		...promptTokensDetails !== void 0 ? { promptTokensDetails } : {},
		...completionTokensDetails !== void 0 ? { completionTokensDetails } : {}
	};
}
var safeEmit = (...args) => {
	try {
		aiEventClient.emit(...args);
	} catch (error) {
		console.error(`[ai-devtools] subscriber threw while handling "${String(args[0])}" event`, error);
	}
};
function buildEventContext(ctx) {
	return {
		requestId: ctx.requestId,
		streamId: ctx.streamId,
		runId: ctx.runId,
		threadId: ctx.threadId,
		provider: ctx.provider,
		model: ctx.model,
		clientId: ctx.conversationId,
		source: ctx.source,
		systemPrompts: ctx.systemPrompts.length > 0 ? ctx.systemPrompts.map((p) => typeof p === "string" ? p : p.content) : void 0,
		toolNames: ctx.toolNames,
		options: ctx.options,
		modelOptions: ctx.modelOptions,
		messageCount: ctx.messageCount,
		hasTools: ctx.hasTools,
		streaming: ctx.streaming
	};
}
/**
* Extract text content from a ModelMessage content field.
*/
function getContentString(content) {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content.map((part) => part && typeof part === "object" && part.type === "text" ? String(part.content ?? "") : "").join("") || "";
}
/**
* Internal devtools middleware that emits all DevTools events.
* Auto-injected as the FIRST middleware in the TextEngine.
*
* All hooks are observation-only — `onChunk` returns void to pass through
* without transforming chunks.
*/
function devtoolsMiddleware() {
	let localMessageId = null;
	let localAccumulatedContent = "";
	let localAccumulatedThinking = "";
	let currentIteration = -1;
	let iterationStartTime = 0;
	const activeToolCalls = /* @__PURE__ */ new Map();
	return {
		name: "devtools",
		onStart(ctx) {
			safeEmit("text:request:started", {
				...buildEventContext(ctx),
				timestamp: Date.now()
			});
			const messages = ctx.messages;
			(ctx.conversationId ? messages.slice(-1).filter((m) => m.role === "user") : messages).forEach((message, index) => {
				const messageIndex = ctx.conversationId ? messages.length - 1 : index;
				const messageId = ctx.createId("msg");
				const base = buildEventContext(ctx);
				const content = getContentString(message.content);
				safeEmit("text:message:created", {
					...base,
					messageId,
					role: message.role,
					content,
					toolCalls: message.toolCalls,
					messageIndex,
					timestamp: Date.now()
				});
				if (message.role === "user") safeEmit("text:message:user", {
					...base,
					messageId,
					role: "user",
					content,
					messageIndex,
					timestamp: Date.now()
				});
			});
		},
		onIteration(ctx, info) {
			const now = Date.now();
			if (currentIteration >= 0) safeEmit("text:iteration:completed", {
				...buildEventContext(ctx),
				iteration: currentIteration,
				messageId: localMessageId || void 0,
				duration: now - iterationStartTime,
				finishReason: "tool_calls",
				timestamp: now
			});
			currentIteration = info.iteration;
			iterationStartTime = now;
			localMessageId = info.messageId;
			localAccumulatedContent = "";
			localAccumulatedThinking = "";
			safeEmit("text:iteration:started", {
				...buildEventContext(ctx),
				iteration: info.iteration,
				messageId: info.messageId,
				timestamp: now
			});
			safeEmit("text:message:created", {
				...buildEventContext(ctx),
				messageId: info.messageId,
				role: "assistant",
				content: "",
				timestamp: now
			});
		},
		onChunk(ctx, rawChunk) {
			if (!isKnownChunk(rawChunk)) return;
			const chunk = rawChunk;
			const base = buildEventContext(ctx);
			switch (chunk.type) {
				case "TEXT_MESSAGE_CONTENT":
					localAccumulatedContent += chunk.delta;
					safeEmit("text:chunk:content", {
						...base,
						messageId: localMessageId || void 0,
						content: localAccumulatedContent,
						delta: chunk.delta,
						timestamp: Date.now()
					});
					break;
				case "TOOL_CALL_START": {
					const toolIndex = chunk.index ?? 0;
					const toolName = chunk.toolCallName;
					activeToolCalls.set(chunk.toolCallId, {
						toolName,
						index: toolIndex
					});
					safeEmit("text:chunk:tool-call", {
						...base,
						messageId: localMessageId || void 0,
						toolCallId: chunk.toolCallId,
						toolName,
						index: toolIndex,
						arguments: "",
						timestamp: Date.now()
					});
					break;
				}
				case "TOOL_CALL_ARGS": {
					const active = activeToolCalls.get(chunk.toolCallId);
					safeEmit("text:chunk:tool-call", {
						...base,
						messageId: localMessageId || void 0,
						toolCallId: chunk.toolCallId,
						toolName: active?.toolName ?? "",
						index: active?.index ?? 0,
						arguments: chunk.delta,
						timestamp: Date.now()
					});
					break;
				}
				case "TOOL_CALL_END":
					activeToolCalls.delete(chunk.toolCallId);
					break;
				case "TOOL_CALL_RESULT":
					safeEmit("text:chunk:tool-result", {
						...base,
						messageId: localMessageId || void 0,
						toolCallId: chunk.toolCallId,
						result: chunk.content || "",
						timestamp: Date.now()
					});
					break;
				case "RUN_FINISHED": {
					const rawUsage = chunk.usage;
					const usage = rawUsage != null && typeof rawUsage === "object" && !Array.isArray(rawUsage) && "promptTokens" in rawUsage ? rawUsage : fromSpecTokenUsage(Array.isArray(rawUsage) ? rawUsage : void 0, chunkTanstack(chunk)?.usage);
					safeEmit("text:chunk:done", {
						...base,
						messageId: localMessageId || void 0,
						finishReason: chunk.finishReason ?? chunkTanstack(chunk)?.finishReason ?? null,
						usage,
						timestamp: Date.now()
					});
					if (usage) safeEmit("text:usage", {
						...base,
						messageId: localMessageId || void 0,
						usage,
						timestamp: Date.now()
					});
					break;
				}
				case "RUN_ERROR": {
					const errorMessage = chunk.message ?? `[ai-devtools] RUN_ERROR chunk had no message; raw chunk: ${JSON.stringify(chunk)}`;
					safeEmit("text:chunk:error", {
						...base,
						messageId: localMessageId || void 0,
						error: errorMessage,
						timestamp: Date.now()
					});
					break;
				}
				case "REASONING_MESSAGE_CONTENT":
					localAccumulatedThinking += chunk.delta;
					safeEmit("text:chunk:thinking", {
						...base,
						messageId: localMessageId || void 0,
						content: localAccumulatedThinking,
						delta: chunk.delta,
						timestamp: Date.now()
					});
			}
		},
		onToolPhaseComplete(ctx, info) {
			const base = buildEventContext(ctx);
			if (info.toolCalls.length > 0) safeEmit("text:message:created", {
				...base,
				messageId: localMessageId ?? ctx.createId("msg"),
				role: "assistant",
				content: localAccumulatedContent || "",
				toolCalls: info.toolCalls,
				timestamp: Date.now()
			});
			for (const approval of info.needsApproval) safeEmit("tools:approval:requested", {
				...base,
				messageId: localMessageId || void 0,
				toolCallId: approval.toolCallId,
				toolName: approval.toolName,
				input: approval.input,
				approvalId: approval.approvalId,
				timestamp: Date.now()
			});
			for (const clientTool of info.needsClientExecution) safeEmit("tools:input:available", {
				...base,
				messageId: localMessageId || void 0,
				toolCallId: clientTool.toolCallId,
				toolName: clientTool.toolName,
				input: clientTool.input,
				timestamp: Date.now()
			});
			for (const result of info.results) {
				safeEmit("tools:call:completed", {
					...base,
					messageId: localMessageId || void 0,
					toolCallId: result.toolCallId,
					toolName: result.toolName,
					result: result.result,
					duration: result.duration ?? 0,
					timestamp: Date.now()
				});
				const content = JSON.stringify(result.result);
				safeEmit("text:message:created", {
					...base,
					messageId: ctx.createId("msg"),
					role: "tool",
					content,
					timestamp: Date.now()
				});
			}
		},
		onFinish(ctx, info) {
			const now = Date.now();
			if (currentIteration >= 0) safeEmit("text:iteration:completed", {
				...buildEventContext(ctx),
				iteration: currentIteration,
				messageId: localMessageId || void 0,
				duration: now - iterationStartTime,
				finishReason: info.finishReason || void 0,
				usage: info.usage,
				timestamp: now
			});
			safeEmit("text:request:completed", {
				...buildEventContext(ctx),
				content: info.content,
				messageId: localMessageId || void 0,
				finishReason: info.finishReason || void 0,
				usage: info.usage,
				duration: info.duration,
				timestamp: now
			});
		}
	};
}
//#endregion
export { devtoolsMiddleware };

//# sourceMappingURL=devtools-middleware.js.map