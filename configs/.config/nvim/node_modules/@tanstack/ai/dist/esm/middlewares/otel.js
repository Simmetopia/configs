import { rebuildTokenUsage } from "../utilities/ag-ui-usage.js";
import { tanstackMetadata } from "../utilities/merge-metadata.js";
import { errorMessage, errorTypeName } from "../utilities/errors.js";
import { MAX_TOKENS_KEYS, NESTED_MAX_TOKENS_KEY } from "../utilities/sampling-keys.js";
import { firstNumber } from "../utilities/numbers.js";
import { usageAttributes } from "./usage-attributes.js";
import { SpanKind, SpanStatusCode, context, trace } from "@opentelemetry/api";
//#region src/middlewares/otel.ts
/**
* `gen_ai.operation.name` per activity. Chat uses the GenAI semconv value;
* media operations have no semconv entry yet, so these are the de-facto names
* consumed by GenAI backends (PostHog, Langfuse, …). Documented in
* `docs/advanced/otel.md`.
*/
var OPERATION_NAME = {
	chat: "chat",
	image: "image_generation",
	video: "video_generation",
	audio: "audio_generation",
	tts: "text_to_speech",
	transcription: "transcription",
	embedding: "embeddings",
	rerank: "rerank",
	summarize: "summarize"
};
var stateByCtx = /* @__PURE__ */ new WeakMap();
var DEFAULT_MAX_CONTENT_LENGTH = 1e5;
var REDACTION_FAILED_SENTINEL = "[redaction_failed]";
function accumulateUsageAttributes(current, usage) {
	const accumulated = current ?? {};
	for (const [key, value] of Object.entries(usageAttributes(usage))) if (typeof value === "number") accumulated[key] = (accumulated[key] ?? 0) + value;
	return accumulated;
}
function applyRootUsage(state, fallbackUsage) {
	if (state.rootUsageApplied) return;
	const attributes = state.rootUsageAttributes ?? (fallbackUsage ? usageAttributes(fallbackUsage) : null);
	if (attributes) state.rootSpan.setAttributes(attributes);
	state.rootUsageApplied = true;
}
function serializeContent(content) {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	const parts = [];
	for (const part of content) {
		if (!part || typeof part !== "object") continue;
		const type = part.type;
		switch (type) {
			case "text":
				parts.push((part.text ?? part.content ?? "").toString());
				break;
			case "image":
				parts.push("[image]");
				break;
			case "audio":
				parts.push("[audio]");
				break;
			case "video":
				parts.push("[video]");
				break;
			case "document":
				parts.push("[document]");
				break;
			case void 0:
				parts.push("[unknown]");
				break;
			default: parts.push(`[${type}]`);
		}
	}
	return parts.join(" ");
}
function messageEventName(role) {
	switch (role) {
		case "user": return "gen_ai.user.message";
		case "assistant": return "gen_ai.assistant.message";
		case "tool": return "gen_ai.tool.message";
		case "system": return "gen_ai.system.message";
		default: return `gen_ai.${role}.message`;
	}
}
function safeCall(label, fn) {
	try {
		return fn();
	} catch (err) {
		console.warn(`[otelMiddleware] ${label} failed`, err);
		return;
	}
}
function otelMiddleware(options) {
	const { tracer, meter, captureContent = false, redact = (s) => s, maxContentLength = DEFAULT_MAX_CONTENT_LENGTH, spanNameFormatter, attributeEnricher, onBeforeSpanStart, onSpanEnd } = options;
	const durationHistogram = meter?.createHistogram("gen_ai.client.operation.duration", {
		description: "GenAI client operation duration",
		unit: "s"
	});
	const tokenHistogram = meter?.createHistogram("gen_ai.client.token.usage", {
		description: "GenAI client token usage",
		unit: "{token}"
	});
	const redactContent = (text) => {
		try {
			return redact(text);
		} catch (err) {
			console.warn("[otelMiddleware] otel.redact failed", err);
			return REDACTION_FAILED_SENTINEL;
		}
	};
	const appendAssistantText = (state, delta) => {
		if (maxContentLength > 0) {
			if (state.assistantTextBufferTruncated) return;
			const remaining = maxContentLength - state.assistantTextBuffer.length;
			if (remaining <= 0) {
				state.assistantTextBufferTruncated = true;
				state.assistantTextBuffer += "…";
				return;
			}
			if (delta.length > remaining) {
				state.assistantTextBuffer += delta.slice(0, remaining) + "…";
				state.assistantTextBufferTruncated = true;
				return;
			}
		}
		state.assistantTextBuffer += delta;
	};
	const closeIterationSpan = (state, ctx) => {
		if (!state.currentIterationSpan) return;
		const span = state.currentIterationSpan;
		const iteration = state.iterationCount - 1;
		safeCall("otel.onSpanEnd", () => onSpanEnd?.({
			kind: "iteration",
			ctx,
			iteration
		}, span));
		span.end();
		state.currentIterationSpan = null;
	};
	const mediaSpans = /* @__PURE__ */ new WeakMap();
	const recordMediaDuration = (ctx, durationMs, errorType) => {
		if (!durationHistogram) return;
		durationHistogram.record(durationMs / 1e3, {
			"gen_ai.system": ctx.provider,
			"gen_ai.operation.name": OPERATION_NAME[ctx.activity],
			"gen_ai.request.model": ctx.model,
			...errorType ? { "error.type": errorType } : {}
		});
	};
	const startMediaSpan = (ctx) => {
		safeCall("otel.onStart", () => {
			const operationName = OPERATION_NAME[ctx.activity];
			const info = {
				kind: "generation",
				ctx
			};
			const name = safeCall("otel.spanNameFormatter", () => spanNameFormatter?.(info)) ?? `${operationName} ${ctx.model}`;
			const baseOptions = {
				kind: SpanKind.CLIENT,
				attributes: {
					"gen_ai.system": ctx.provider,
					"gen_ai.operation.name": operationName,
					"gen_ai.request.model": ctx.model
				}
			};
			const spanOptions = safeCall("otel.onBeforeSpanStart", () => onBeforeSpanStart?.(info, baseOptions)) ?? baseOptions;
			const span = tracer.startSpan(name, spanOptions);
			const enriched = safeCall("otel.attributeEnricher", () => attributeEnricher?.(info));
			if (enriched) span.setAttributes(enriched);
			mediaSpans.set(ctx, span);
		});
	};
	const endMediaSpan = (ctx, finalize) => {
		const span = mediaSpans.get(ctx);
		mediaSpans.delete(ctx);
		if (!span) return;
		finalize(span);
		safeCall("otel.onSpanEnd", () => onSpanEnd?.({
			kind: "generation",
			ctx
		}, span));
		span.end();
	};
	return {
		name: "otel",
		onStart(ctx) {
			if (ctx.activity !== "chat") {
				startMediaSpan(ctx);
				return;
			}
			const chatCtx = ctx;
			safeCall("otel.onStart", () => {
				const info = {
					kind: "chat",
					ctx: chatCtx
				};
				const name = safeCall("otel.spanNameFormatter", () => spanNameFormatter?.(info)) ?? `chat ${chatCtx.model}`;
				const baseOptions = {
					kind: SpanKind.INTERNAL,
					attributes: {
						"gen_ai.system": chatCtx.provider,
						"gen_ai.request.model": chatCtx.model
					}
				};
				const spanOptions = safeCall("otel.onBeforeSpanStart", () => onBeforeSpanStart?.(info, baseOptions)) ?? baseOptions;
				const rootSpan = tracer.startSpan(name, spanOptions);
				const enriched = safeCall("otel.attributeEnricher", () => attributeEnricher?.(info));
				if (enriched) rootSpan.setAttributes(enriched);
				stateByCtx.set(chatCtx, {
					rootSpan,
					currentIterationSpan: null,
					toolSpans: /* @__PURE__ */ new Map(),
					iterationCount: 0,
					assistantTextBuffer: "",
					assistantTextBufferTruncated: false,
					startTime: Date.now(),
					lastFinishReason: null,
					rootUsageAttributes: null,
					rootUsageApplied: false
				});
			});
		},
		onConfig(ctx, config) {
			if (ctx.phase !== "beforeModel" && ctx.phase !== "structuredOutput") return;
			safeCall("otel.onConfig", () => {
				const state = stateByCtx.get(ctx);
				if (!state) return;
				closeIterationSpan(state, ctx);
				const iteration = state.iterationCount;
				const info = {
					kind: "iteration",
					ctx,
					iteration
				};
				const name = safeCall("otel.spanNameFormatter", () => spanNameFormatter?.(info)) ?? `chat ${ctx.model} #${iteration}`;
				const baseAttrs = {
					"gen_ai.system": ctx.provider,
					"gen_ai.operation.name": "chat",
					"gen_ai.request.model": ctx.model,
					"tanstack.ai.iteration": iteration
				};
				const sampling = config.modelOptions ?? {};
				const nestedOptions = sampling["options"] && typeof sampling["options"] === "object" ? sampling["options"] : void 0;
				const samplingTemperature = firstNumber(sampling["temperature"], nestedOptions?.["temperature"]);
				const samplingTopP = firstNumber(sampling["top_p"], sampling["topP"], nestedOptions?.["top_p"]);
				const samplingMaxTokens = firstNumber(...MAX_TOKENS_KEYS.map((k) => sampling[k]), nestedOptions?.[NESTED_MAX_TOKENS_KEY]);
				if (samplingTemperature !== void 0) baseAttrs["gen_ai.request.temperature"] = samplingTemperature;
				if (samplingTopP !== void 0) baseAttrs["gen_ai.request.top_p"] = samplingTopP;
				if (samplingMaxTokens !== void 0) baseAttrs["gen_ai.request.max_tokens"] = samplingMaxTokens;
				const baseOptions = {
					kind: SpanKind.CLIENT,
					attributes: baseAttrs
				};
				const spanOptions = safeCall("otel.onBeforeSpanStart", () => onBeforeSpanStart?.(info, baseOptions)) ?? baseOptions;
				const parentCtx = trace.setSpan(context.active(), state.rootSpan);
				let iterSpan;
				context.with(parentCtx, () => {
					iterSpan = tracer.startSpan(name, spanOptions, parentCtx);
				});
				const enriched = safeCall("otel.attributeEnricher", () => attributeEnricher?.(info));
				if (enriched) iterSpan.setAttributes(enriched);
				state.currentIterationSpan = iterSpan;
				state.assistantTextBuffer = "";
				state.assistantTextBufferTruncated = false;
				if (captureContent) {
					const systemPromptContents = config.systemPrompts.map((p) => typeof p === "string" ? p : p.content);
					const systemPromptMetadata = config.systemPrompts.map((p) => typeof p === "string" || p.metadata === void 0 ? null : p.metadata);
					if (systemPromptMetadata.some((m) => m !== null)) iterSpan.setAttribute("tanstack.ai.system_prompt.metadata", JSON.stringify(systemPromptMetadata));
					for (const sys of systemPromptContents) iterSpan.addEvent("gen_ai.system.message", { content: redactContent(sys) });
					for (const m of config.messages) {
						const body = serializeContent(m.content);
						if (body.length === 0) continue;
						iterSpan.addEvent(messageEventName(m.role), { content: redactContent(body) });
					}
					const inputMessages = [];
					for (const sys of systemPromptContents) inputMessages.push({
						role: "system",
						content: redactContent(sys)
					});
					for (const m of config.messages) {
						const body = serializeContent(m.content);
						if (body.length === 0) continue;
						inputMessages.push({
							role: m.role,
							content: redactContent(body)
						});
					}
					if (inputMessages.length > 0) {
						const inputJson = JSON.stringify(inputMessages);
						iterSpan.setAttribute("gen_ai.input.messages", inputJson);
						iterSpan.setAttribute("langfuse.observation.input", inputJson);
						if (state.iterationCount === 0) {
							state.rootSpan.setAttribute("langfuse.observation.input", inputJson);
							state.rootSpan.setAttribute("langfuse.trace.input", inputJson);
						}
					}
				}
				state.iterationCount += 1;
			});
		},
		onChunk(ctx, chunk) {
			safeCall("otel.onChunk", () => {
				const state = stateByCtx.get(ctx);
				if (!state) return;
				if (captureContent && chunk.type === "TEXT_MESSAGE_CONTENT") appendAssistantText(state, chunk.delta);
				if (chunk.type !== "RUN_FINISHED") return;
				const tanstack = tanstackMetadata(chunk);
				const extra = chunk;
				const finishReason = extra.finishReason ?? tanstack?.finishReason;
				const model = extra.model ?? tanstack?.model;
				if (finishReason) state.lastFinishReason = finishReason;
				const span = state.currentIterationSpan;
				if (!span) return;
				if (finishReason) span.setAttribute("gen_ai.response.finish_reasons", [finishReason]);
				if (model) span.setAttribute("gen_ai.response.model", model);
				const tokenUsage = rebuildTokenUsage(chunk.usage, tanstack?.usage);
				if (tokenUsage) span.setAttributes(usageAttributes(tokenUsage));
				if (captureContent && state.assistantTextBuffer.length > 0) {
					const completion = redactContent(state.assistantTextBuffer);
					const outputJson = JSON.stringify([{
						role: "assistant",
						content: completion
					}]);
					span.addEvent("gen_ai.choice", { content: completion });
					span.setAttribute("gen_ai.output.messages", outputJson);
					span.setAttribute("langfuse.observation.output", outputJson);
					state.rootSpan.setAttribute("langfuse.observation.output", outputJson);
					state.rootSpan.setAttribute("langfuse.trace.output", outputJson);
					state.assistantTextBuffer = "";
					state.assistantTextBufferTruncated = false;
				}
			});
		},
		onUsage(ctx, usage) {
			if (ctx.activity !== "chat") {
				safeCall("otel.onUsage", () => {
					const span = mediaSpans.get(ctx);
					if (span) span.setAttributes(usageAttributes(usage));
				});
				return;
			}
			const chatCtx = ctx;
			safeCall("otel.onUsage", () => {
				const state = stateByCtx.get(chatCtx);
				if (!state) return;
				state.rootUsageAttributes = accumulateUsageAttributes(state.rootUsageAttributes, usage);
				if (tokenHistogram) {
					const metricAttrs = {
						"gen_ai.system": chatCtx.provider,
						"gen_ai.operation.name": "chat",
						"gen_ai.request.model": chatCtx.model
					};
					tokenHistogram.record(usage.promptTokens, {
						...metricAttrs,
						"gen_ai.token.type": "input"
					});
					tokenHistogram.record(usage.completionTokens, {
						...metricAttrs,
						"gen_ai.token.type": "output"
					});
				}
				(state.currentIterationSpan ?? state.rootSpan).setAttributes(usageAttributes(usage));
			});
		},
		onBeforeToolCall(ctx, hookCtx) {
			safeCall("otel.onBeforeToolCall", () => {
				const state = stateByCtx.get(ctx);
				if (!state) return;
				const parent = state.currentIterationSpan ?? state.rootSpan;
				const info = {
					kind: "tool",
					ctx,
					toolName: hookCtx.toolName,
					toolCallId: hookCtx.toolCallId,
					iteration: state.iterationCount - 1
				};
				const name = safeCall("otel.spanNameFormatter", () => spanNameFormatter?.(info)) ?? `execute_tool ${hookCtx.toolName}`;
				const baseAttrs = {
					"gen_ai.tool.name": hookCtx.toolName,
					"gen_ai.tool.call.id": hookCtx.toolCallId,
					"gen_ai.tool.type": "function"
				};
				const baseOptions = {
					kind: SpanKind.INTERNAL,
					attributes: baseAttrs
				};
				const spanOptions = safeCall("otel.onBeforeSpanStart", () => onBeforeSpanStart?.(info, baseOptions)) ?? baseOptions;
				const parentCtx = trace.setSpan(context.active(), parent);
				let toolSpan;
				context.with(parentCtx, () => {
					toolSpan = tracer.startSpan(name, spanOptions, parentCtx);
				});
				const enriched = safeCall("otel.attributeEnricher", () => attributeEnricher?.(info));
				if (enriched) toolSpan.setAttributes(enriched);
				if (captureContent) {
					const argsBody = typeof hookCtx.args === "string" ? hookCtx.args : safeCall("otel.serializeToolArgs", () => JSON.stringify(hookCtx.args ?? null)) ?? "[unserializable_tool_args]";
					const redactedArgs = redactContent(argsBody);
					const toolInputJson = JSON.stringify([{
						role: "tool",
						content: redactedArgs
					}]);
					toolSpan.setAttribute("gen_ai.input.messages", toolInputJson);
					toolSpan.setAttribute("langfuse.observation.input", toolInputJson);
				}
				state.toolSpans.set(hookCtx.toolCallId, {
					span: toolSpan,
					toolName: hookCtx.toolName
				});
			});
		},
		onAfterToolCall(ctx, info) {
			safeCall("otel.onAfterToolCall", () => {
				const state = stateByCtx.get(ctx);
				if (!state) return;
				const entry = state.toolSpans.get(info.toolCallId);
				if (!entry) return;
				const { span: toolSpan } = entry;
				const outcome = info.ok ? "success" : "error";
				toolSpan.setAttribute("tanstack.ai.tool.outcome", outcome);
				if (!info.ok && info.error !== void 0) {
					toolSpan.recordException(info.error);
					const msg = errorMessage(info.error);
					toolSpan.setStatus({
						code: SpanStatusCode.ERROR,
						...msg !== void 0 && { message: msg }
					});
				}
				if (captureContent) {
					const body = typeof info.result === "string" ? info.result : safeCall("otel.serializeToolResult", () => JSON.stringify(info.result ?? null)) ?? "[unserializable_tool_result]";
					const redactedBody = redactContent(body);
					if (state.currentIterationSpan) state.currentIterationSpan.addEvent("gen_ai.tool.message", {
						content: redactedBody,
						tool_call_id: info.toolCallId
					});
					const toolOutputJson = JSON.stringify([{
						role: "tool",
						content: redactedBody
					}]);
					toolSpan.setAttribute("gen_ai.output.messages", toolOutputJson);
					toolSpan.setAttribute("langfuse.observation.output", toolOutputJson);
				}
				safeCall("otel.onSpanEnd", () => onSpanEnd?.({
					kind: "tool",
					ctx,
					toolName: info.toolName,
					toolCallId: info.toolCallId,
					iteration: state.iterationCount - 1
				}, toolSpan));
				toolSpan.end();
				state.toolSpans.delete(info.toolCallId);
			});
		},
		onError(ctx, info) {
			if (ctx.activity !== "chat") {
				safeCall("otel.onError", () => {
					const message = errorMessage(info.error);
					endMediaSpan(ctx, (span) => {
						span.recordException(info.error);
						span.setStatus({
							code: SpanStatusCode.ERROR,
							...message !== void 0 ? { message } : {}
						});
					});
					recordMediaDuration(ctx, info.duration, errorTypeName(info.error));
				});
				return;
			}
			const chatCtx = ctx;
			safeCall("otel.onError", () => {
				const state = stateByCtx.get(chatCtx);
				if (!state) return;
				const errType = errorTypeName(info.error);
				const message = errorMessage(info.error);
				const statusMessage = message !== void 0 ? { message } : {};
				const exception = info.error;
				const iterationSpan = state.currentIterationSpan;
				if (iterationSpan) {
					iterationSpan.recordException(exception);
					iterationSpan.setStatus({
						code: SpanStatusCode.ERROR,
						...statusMessage
					});
					safeCall("otel.onSpanEnd", () => onSpanEnd?.({
						kind: "iteration",
						ctx: chatCtx,
						iteration: state.iterationCount - 1
					}, iterationSpan));
					iterationSpan.end();
					state.currentIterationSpan = null;
				}
				for (const [id, entry] of state.toolSpans) {
					const { span, toolName } = entry;
					span.recordException(exception);
					span.setStatus({
						code: SpanStatusCode.ERROR,
						...statusMessage
					});
					safeCall("otel.onSpanEnd", () => onSpanEnd?.({
						kind: "tool",
						ctx: chatCtx,
						toolCallId: id,
						toolName,
						iteration: state.iterationCount - 1
					}, span));
					span.end();
					state.toolSpans.delete(id);
				}
				state.rootSpan.recordException(exception);
				state.rootSpan.setStatus({
					code: SpanStatusCode.ERROR,
					...statusMessage
				});
				if (durationHistogram) durationHistogram.record(info.duration / 1e3, {
					"gen_ai.system": chatCtx.provider,
					"gen_ai.operation.name": "chat",
					"gen_ai.request.model": chatCtx.model,
					"error.type": errType
				});
				applyRootUsage(state);
				safeCall("otel.onSpanEnd", () => onSpanEnd?.({
					kind: "chat",
					ctx: chatCtx
				}, state.rootSpan));
				state.rootSpan.end();
				stateByCtx.delete(chatCtx);
			});
		},
		onAbort(ctx, info) {
			if (ctx.activity !== "chat") {
				safeCall("otel.onAbort", () => {
					endMediaSpan(ctx, (span) => {
						span.setAttribute("tanstack.ai.completion.reason", "cancelled");
						span.setStatus({
							code: SpanStatusCode.ERROR,
							message: info.reason ?? "cancelled"
						});
					});
					recordMediaDuration(ctx, info.duration, "cancelled");
				});
				return;
			}
			const chatCtx = ctx;
			safeCall("otel.onAbort", () => {
				const state = stateByCtx.get(chatCtx);
				if (!state) return;
				const closeCancelled = (span) => {
					span.setAttribute("tanstack.ai.completion.reason", "cancelled");
					span.setStatus({
						code: SpanStatusCode.ERROR,
						message: "cancelled"
					});
				};
				const iterationSpan = state.currentIterationSpan;
				if (iterationSpan) {
					closeCancelled(iterationSpan);
					safeCall("otel.onSpanEnd", () => onSpanEnd?.({
						kind: "iteration",
						ctx: chatCtx,
						iteration: state.iterationCount - 1
					}, iterationSpan));
					iterationSpan.end();
					state.currentIterationSpan = null;
				}
				for (const [id, entry] of state.toolSpans) {
					const { span, toolName } = entry;
					closeCancelled(span);
					safeCall("otel.onSpanEnd", () => onSpanEnd?.({
						kind: "tool",
						ctx: chatCtx,
						toolCallId: id,
						toolName,
						iteration: state.iterationCount - 1
					}, span));
					span.end();
					state.toolSpans.delete(id);
				}
				closeCancelled(state.rootSpan);
				if (durationHistogram) durationHistogram.record(info.duration / 1e3, {
					"gen_ai.system": chatCtx.provider,
					"gen_ai.operation.name": "chat",
					"gen_ai.request.model": chatCtx.model,
					"error.type": "cancelled"
				});
				applyRootUsage(state);
				safeCall("otel.onSpanEnd", () => onSpanEnd?.({
					kind: "chat",
					ctx: chatCtx
				}, state.rootSpan));
				state.rootSpan.end();
				stateByCtx.delete(chatCtx);
			});
		},
		onFinish(ctx, info) {
			if (ctx.activity !== "chat") {
				safeCall("otel.onFinish", () => {
					endMediaSpan(ctx, (span) => {
						if (info.usage) span.setAttributes(usageAttributes(info.usage));
					});
					recordMediaDuration(ctx, info.duration);
				});
				return;
			}
			const chatCtx = ctx;
			safeCall("otel.onFinish", () => {
				const state = stateByCtx.get(chatCtx);
				if (!state) return;
				for (const [id, entry] of state.toolSpans) {
					const { span, toolName } = entry;
					span.setAttribute("tanstack.ai.tool.outcome", "unknown");
					safeCall("otel.onSpanEnd", () => onSpanEnd?.({
						kind: "tool",
						ctx: chatCtx,
						toolCallId: id,
						toolName,
						iteration: state.iterationCount - 1
					}, span));
					span.end();
					state.toolSpans.delete(id);
				}
				closeIterationSpan(state, chatCtx);
				if (durationHistogram) durationHistogram.record(info.duration / 1e3, {
					"gen_ai.system": chatCtx.provider,
					"gen_ai.operation.name": "chat",
					"gen_ai.request.model": chatCtx.model
				});
				if (state.lastFinishReason) state.rootSpan.setAttribute("gen_ai.response.finish_reasons", [state.lastFinishReason]);
				state.rootSpan.setAttribute("tanstack.ai.iterations", state.iterationCount);
				applyRootUsage(state, info.usage);
				safeCall("otel.onSpanEnd", () => onSpanEnd?.({
					kind: "chat",
					ctx: chatCtx
				}, state.rootSpan));
				state.rootSpan.end();
				stateByCtx.delete(chatCtx);
			});
		}
	};
}
//#endregion
export { otelMiddleware };

//# sourceMappingURL=otel.js.map