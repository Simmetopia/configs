import { tanstackMetadata } from "../../../utilities/merge-metadata.js";
import { isStandardSchema, parseWithStandardSchema } from "./schema-converter.js";
import { normalizeToolResult } from "../../../utilities/tool-result.js";
//#region src/activities/chat/tools/tool-calls.ts
function safeJsonParse(value) {
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}
function readMcpAppMeta(tool) {
	return tool.metadata?.mcp;
}
/**
* Eagerly read a tool's linked `ui://` resource (MCP Apps) and emit a
* `ui-resource` CUSTOM event so the client can render the widget. The model
* still receives the normal text tool-result; the widget rides alongside and
* never enters model input.
*
* Fail-soft: any read error logs a warning and emits nothing — it never throws,
* so the normal tool-result still flows and a broken widget cannot break the run.
*/
async function emitUiResourceIfLinked(tool, context) {
	const mcp = readMcpAppMeta(tool);
	const uiUri = mcp?.uiResourceUri;
	if (!uiUri || !mcp.readResource) return;
	let matched;
	try {
		matched = (await mcp.readResource(uiUri)).contents.find((c) => c.uri === uiUri);
	} catch (err) {
		console.warn(`[mcp-apps] failed to read ui resource ${uiUri}:`, err);
		return;
	}
	if (!matched) {
		console.warn(`[mcp-apps] ui resource ${uiUri} returned no content matching that uri; not emitting`);
		return;
	}
	context.emitCustomEvent("ui-resource", {
		resource: {
			uri: matched.uri,
			mimeType: matched.mimeType ?? "text/html",
			text: matched.text,
			blob: matched.blob
		},
		serverId: mcp.serverId,
		toolName: mcp.serverToolName ?? tool.name,
		meta: void 0
	});
}
/**
* Error thrown when middleware decides to abort the chat run during tool execution.
*/
var MiddlewareAbortError = class extends Error {
	constructor(reason) {
		super(reason);
		this.name = "MiddlewareAbortError";
	}
};
/**
* Manages tool call accumulation and execution for the chat() method's automatic tool execution loop.
*
* Responsibilities:
* - Accumulates streaming tool call events (ID, name, arguments)
* - Validates tool calls (filters out incomplete ones)
* - Executes tool `execute` functions with parsed arguments
* - Emits `TOOL_CALL_END` events for client visibility
* - Returns tool result messages for conversation history
*
* This class is used internally by the AI.chat() method to handle the automatic
* tool execution loop. It can also be used independently for custom tool execution logic.
*
* @example
* ```typescript
* const manager = new ToolCallManager(tools);
*
* // During streaming, accumulate tool calls
* for await (const chunk of stream) {
*   if (chunk.type === 'TOOL_CALL_START') {
*     manager.addToolCallStartEvent(chunk);
*   } else if (chunk.type === 'TOOL_CALL_ARGS') {
*     manager.addToolCallArgsEvent(chunk);
*   }
* }
*
* // After stream completes, execute tools
* if (manager.hasToolCalls()) {
*   const toolResults = yield* manager.executeTools(finishEvent);
*   messages = [...messages, ...toolResults];
*   manager.clear();
* }
* ```
*/
var ToolCallManager = class {
	toolCallsMap = /* @__PURE__ */ new Map();
	tools;
	constructor(tools) {
		this.tools = tools;
	}
	/**
	* Add a TOOL_CALL_START event to begin tracking a tool call (AG-UI)
	*/
	addToolCallStartEvent(event) {
		const index = event.index ?? this.toolCallsMap.size;
		const name = event.toolCallName ?? event.toolName;
		this.toolCallsMap.set(index, {
			id: event.toolCallId,
			type: "function",
			function: {
				name,
				arguments: ""
			},
			...event.metadata !== void 0 && { metadata: event.metadata }
		});
	}
	/**
	* Add a TOOL_CALL_ARGS event to accumulate arguments (AG-UI)
	*/
	addToolCallArgsEvent(event) {
		const extra = event;
		for (const [, toolCall] of this.toolCallsMap.entries()) if (toolCall.id === event.toolCallId) {
			if (typeof extra.args === "string" && extra.args !== "") toolCall.function.arguments = extra.args;
			else toolCall.function.arguments += event.delta;
			break;
		}
	}
	/**
	* Complete a tool call with its final input
	* Called when TOOL_CALL_END is received
	*/
	completeToolCall(event) {
		for (const toolCall of this.toolCallsMap.values()) {
			if (toolCall.id !== event.toolCallId) continue;
			if (event.input === void 0) return;
			const normalized = event.input && typeof event.input === "object" ? event.input : {};
			toolCall.function.arguments = JSON.stringify(normalized);
			return;
		}
	}
	/**
	* Check if there are any complete tool calls to execute
	*/
	hasToolCalls() {
		return this.getToolCalls().length > 0;
	}
	/**
	* Get all complete tool calls (filtered for valid ID and name)
	*/
	getToolCalls() {
		return Array.from(this.toolCallsMap.values()).filter((tc) => tc.id && tc.function.name && tc.function.name.trim().length > 0);
	}
	/**
	* Execute all tool calls and return tool result messages
	* Yields TOOL_CALL_END events for streaming
	* @param finishEvent - RUN_FINISHED event from the stream
	*/
	async *executeTools(finishEvent, ...contextArgs) {
		const toolCallsArray = this.getToolCalls();
		const toolResults = [];
		const hasRuntimeContext = contextArgs.length > 0;
		const userContext = contextArgs[0];
		for (const toolCall of toolCallsArray) {
			const tool = this.tools.find((t) => t.name === toolCall.function.name);
			let toolResultContent;
			let toolResultState;
			let toolOutput;
			if (tool?.execute) try {
				let args;
				try {
					const argsString = toolCall.function.arguments.trim() || "{}";
					const parsed = JSON.parse(argsString);
					args = parsed && typeof parsed === "object" ? parsed : {};
				} catch (parseError) {
					throw new Error(`Failed to parse tool arguments as JSON: ${toolCall.function.arguments}`);
				}
				if (tool.inputSchema && isStandardSchema(tool.inputSchema)) try {
					args = parseWithStandardSchema(tool.inputSchema, args);
				} catch (validationError) {
					const message = validationError instanceof Error ? validationError.message : "Validation failed";
					throw new Error(`Input validation failed for tool ${tool.name}: ${message}`);
				}
				const executionContext = {
					toolCallId: toolCall.id,
					context: userContext,
					emitCustomEvent: () => {}
				};
				let result = hasRuntimeContext ? await tool.execute(args, executionContext) : await tool.execute(args);
				if (tool.outputSchema && isStandardSchema(tool.outputSchema)) try {
					result = parseWithStandardSchema(tool.outputSchema, result);
				} catch (validationError) {
					const message = validationError instanceof Error ? validationError.message : "Validation failed";
					throw new Error(`Output validation failed for tool ${tool.name}: ${message}`);
				}
				toolOutput = result;
				toolResultContent = normalizeToolResult(result);
			} catch (error) {
				toolResultContent = `Error executing tool: ${error instanceof Error ? error.message : "Unknown error"}`;
				toolResultState = "output-error";
			}
			else toolResultContent = `Tool ${toolCall.function.name} does not have an execute function`;
			yield {
				type: "TOOL_CALL_END",
				toolCallId: toolCall.id,
				toolCallName: toolCall.function.name,
				toolName: toolCall.function.name,
				model: (() => {
					const model = tanstackMetadata(finishEvent)?.model;
					return typeof model === "string" ? model : void 0;
				})(),
				timestamp: Date.now(),
				...toolOutput !== void 0 ? { output: toolOutput } : {},
				result: toolResultContent,
				...toolResultState !== void 0 && { state: toolResultState }
			};
			toolResults.push({
				role: "tool",
				content: toolResultContent,
				toolCallId: toolCall.id
			});
		}
		return toolResults;
	}
	/**
	* Clear the tool calls map for the next iteration
	*/
	clear() {
		this.toolCallsMap.clear();
	}
};
function approvalResolution(approvals, toolCallId) {
	return approvals.get(toolCallId) ?? approvals.get(`approval_${toolCallId}`);
}
function isApproved(resolution) {
	return typeof resolution === "boolean" ? resolution : resolution.approved;
}
function editedApprovalArgs(resolution) {
	return typeof resolution === "object" && resolution.approved ? resolution.editedArgs : void 0;
}
function deniedApprovalResult(resolution) {
	return typeof resolution === "object" && !resolution.approved ? resolution.payload ?? { error: "User declined tool execution" } : { error: "User declined tool execution" };
}
/**
* Helper that runs a tool execution promise while polling for pending custom events.
* Yields any custom events that are emitted during execution, then returns the
* execution result.
*/
async function* executeWithEventPolling(executionPromise, pendingEvents) {
	const state = {
		done: false,
		result: void 0
	};
	const executionWithFlag = executionPromise.then((r) => {
		state.done = true;
		state.result = r;
		return r;
	});
	while (!state.done) {
		await Promise.race([executionWithFlag, new Promise((resolve) => setTimeout(resolve, 10))]);
		let event;
		while ((event = pendingEvents.shift()) !== void 0) yield event;
	}
	let event;
	while ((event = pendingEvents.shift()) !== void 0) yield event;
	return state.result;
}
/**
* Apply a middleware onBeforeToolCall decision.
* Returns the (possibly transformed) input if execution should proceed,
* or undefined if the tool call was skipped (result already pushed).
* Throws MiddlewareAbortError if the decision is 'abort'.
*/
async function applyBeforeToolCallDecision(toolCall, tool, input, toolName, middlewareHooks, results) {
	if (!middlewareHooks.onBeforeToolCall) return {
		proceed: true,
		input
	};
	const decision = await middlewareHooks.onBeforeToolCall(toolCall, tool, input);
	if (!decision) return {
		proceed: true,
		input
	};
	if (decision.type === "abort") throw new MiddlewareAbortError(decision.reason || "Aborted by middleware");
	if (decision.type === "skip") {
		const skipResult = decision.result;
		results.push({
			toolCallId: toolCall.id,
			toolName,
			result: typeof skipResult === "string" ? safeJsonParse(skipResult) : skipResult ?? null,
			duration: 0
		});
		if (middlewareHooks.onAfterToolCall) await middlewareHooks.onAfterToolCall({
			toolCall,
			tool,
			toolName,
			toolCallId: toolCall.id,
			ok: true,
			duration: 0,
			result: skipResult
		});
		return { proceed: false };
	}
	return {
		proceed: true,
		input: decision.args
	};
}
/**
* Execute a server-side tool with event polling, output validation, and middleware hooks.
* Yields CustomEvent chunks during execution and pushes the result to the results array.
*/
async function* executeServerTool(toolCall, tool, toolName, input, context, pendingEvents, results, middlewareHooks) {
	const startTime = Date.now();
	try {
		if (!tool.execute) throw new Error(`Tool ${toolName} has no execute() implementation`);
		let result = yield* executeWithEventPolling(Promise.resolve(tool.execute(input, context)), pendingEvents);
		const duration = Date.now() - startTime;
		await emitUiResourceIfLinked(tool, context);
		let pendingEvent;
		while ((pendingEvent = pendingEvents.shift()) !== void 0) yield pendingEvent;
		if (tool.outputSchema && isStandardSchema(tool.outputSchema)) result = parseWithStandardSchema(tool.outputSchema, result);
		const finalResult = typeof result === "string" ? safeJsonParse(result) : result ?? null;
		results.push({
			toolCallId: toolCall.id,
			toolName,
			result: finalResult,
			input,
			output: finalResult,
			duration
		});
		if (middlewareHooks?.onAfterToolCall) await middlewareHooks.onAfterToolCall({
			toolCall,
			tool,
			toolName,
			toolCallId: toolCall.id,
			ok: true,
			duration,
			result: finalResult
		});
	} catch (error) {
		const duration = Date.now() - startTime;
		let pendingEvent;
		while ((pendingEvent = pendingEvents.shift()) !== void 0) yield pendingEvent;
		if (error instanceof MiddlewareAbortError) throw error;
		const message = error instanceof Error ? error.message : "Unknown error";
		results.push({
			toolCallId: toolCall.id,
			toolName,
			result: { error: message },
			input,
			state: "output-error",
			duration
		});
		if (middlewareHooks?.onAfterToolCall) await middlewareHooks.onAfterToolCall({
			toolCall,
			tool,
			toolName,
			toolCallId: toolCall.id,
			ok: false,
			duration,
			error
		});
	}
}
function buildClientToolResult(toolCallId, toolName, tool, rawResult, input) {
	try {
		let result = rawResult;
		if (tool.outputSchema && isStandardSchema(tool.outputSchema)) result = parseWithStandardSchema(tool.outputSchema, result);
		const parsed = typeof result === "string" ? safeJsonParse(result) : result ?? null;
		return {
			toolCallId,
			toolName,
			result: parsed,
			input,
			output: parsed
		};
	} catch (error) {
		return {
			toolCallId,
			toolName,
			result: { error: error instanceof Error ? error.message : "Validation failed" },
			input,
			state: "output-error"
		};
	}
}
/**
* Execute tool calls based on their configuration.
* Yields CustomEvent chunks during tool execution for real-time progress updates.
*
* Handles three cases:
* 1. Client tools (no execute) - request client to execute
* 2. Server tools with approval - check approval before executing
* 3. Normal server tools - execute immediately
*
* @param toolCalls - Tool calls from the LLM
* @param tools - Available tools with their configurations
* @param approvals - Map keyed by toolCallId (or `approval_${toolCallId}`) → ToolApprovalResolution
* @param clientResults - Map of client-side execution results (toolCallId -> result)
* @param createCustomEventChunk - Factory to create CustomEvent chunks (optional)
*/
async function* executeToolCalls(toolCalls, tools, approvals = /* @__PURE__ */ new Map(), clientResults = /* @__PURE__ */ new Map(), createCustomEventChunk, middlewareHooks, userContext, abortSignal, resumeState) {
	const results = [];
	const needsApproval = [];
	const needsClientExecution = [];
	const toolMap = /* @__PURE__ */ new Map();
	for (const tool of tools) toolMap.set(tool.name, tool);
	const hasPendingApprovals = toolCalls.some((tc) => {
		return toolMap.get(tc.function.name)?.needsApproval && approvalResolution(approvals, tc.id) === void 0 && !resumeState?.cancelledToolCallIds?.has(tc.id);
	});
	for (const toolCall of toolCalls) {
		const tool = toolMap.get(toolCall.function.name);
		const toolName = toolCall.function.name;
		if (!tool) {
			results.push({
				toolCallId: toolCall.id,
				toolName,
				result: { error: `Unknown tool: ${toolName}` },
				state: "output-error"
			});
			continue;
		}
		if (hasPendingApprovals) {
			const isPendingApproval = tool.needsApproval && approvalResolution(approvals, toolCall.id) === void 0;
			const isPlainClientRequest = !tool.needsApproval && !tool.execute;
			if (!isPendingApproval && !isPlainClientRequest) continue;
		}
		if (resumeState?.cancelledToolCallIds?.has(toolCall.id)) {
			results.push({
				toolCallId: toolCall.id,
				toolName,
				result: { error: "Tool execution cancelled" },
				state: "output-error"
			});
			continue;
		}
		let input = {};
		const argsStr = toolCall.function.arguments.trim() || "{}";
		if (argsStr) try {
			const parsed = JSON.parse(argsStr);
			input = parsed && typeof parsed === "object" ? parsed : {};
		} catch {
			results.push({
				toolCallId: toolCall.id,
				toolName,
				result: { error: `Failed to parse tool arguments as JSON: ${argsStr}` },
				input,
				state: "output-error"
			});
			continue;
		}
		if (tool.inputSchema && isStandardSchema(tool.inputSchema)) try {
			input = parseWithStandardSchema(tool.inputSchema, input);
		} catch (validationError) {
			const message = validationError instanceof Error ? validationError.message : "Validation failed";
			results.push({
				toolCallId: toolCall.id,
				toolName,
				result: { error: `Input validation failed for tool ${tool.name}: ${message}` },
				input,
				state: "output-error"
			});
			continue;
		}
		const pendingEvents = [];
		const context = {
			toolCallId: toolCall.id,
			context: userContext,
			abortSignal,
			emitCustomEvent: (eventName, value) => {
				if (createCustomEventChunk) pendingEvents.push(createCustomEventChunk(eventName, {
					...value,
					toolCallId: toolCall.id
				}));
			}
		};
		if (!tool.execute) {
			if (tool.needsApproval) {
				const approvalId = `approval_${toolCall.id}`;
				const resolution = approvalResolution(approvals, toolCall.id);
				if (resolution !== void 0) {
					if (isApproved(resolution)) {
						input = editedApprovalArgs(resolution) ?? input;
						if (clientResults.has(toolCall.id)) results.push(buildClientToolResult(toolCall.id, toolName, tool, clientResults.get(toolCall.id), input));
						else needsClientExecution.push({
							toolCallId: toolCall.id,
							toolName,
							input
						});
					} else results.push({
						toolCallId: toolCall.id,
						toolName,
						result: resumeState?.deniedToolResults?.get(toolCall.id) ?? deniedApprovalResult(resolution),
						input,
						state: "output-error"
					});
				} else needsApproval.push({
					toolCallId: toolCall.id,
					toolName: toolCall.function.name,
					input,
					approvalId
				});
			} else if (clientResults.has(toolCall.id)) results.push(buildClientToolResult(toolCall.id, toolName, tool, clientResults.get(toolCall.id), input));
			else needsClientExecution.push({
				toolCallId: toolCall.id,
				toolName,
				input
			});
			continue;
		}
		if (tool.needsApproval) {
			const approvalId = `approval_${toolCall.id}`;
			const resolution = approvalResolution(approvals, toolCall.id);
			if (resolution !== void 0) {
				if (isApproved(resolution)) {
					input = editedApprovalArgs(resolution) ?? input;
					if (middlewareHooks) {
						const decision = await applyBeforeToolCallDecision(toolCall, tool, input, toolName, middlewareHooks, results);
						if (!decision.proceed) continue;
						input = decision.input;
					}
					yield* executeServerTool(toolCall, tool, toolName, input, context, pendingEvents, results, middlewareHooks);
				} else results.push({
					toolCallId: toolCall.id,
					toolName,
					result: resumeState?.deniedToolResults?.get(toolCall.id) ?? deniedApprovalResult(resolution),
					input,
					state: "output-error"
				});
			} else needsApproval.push({
				toolCallId: toolCall.id,
				toolName,
				input,
				approvalId
			});
			continue;
		}
		if (middlewareHooks) {
			const decision = await applyBeforeToolCallDecision(toolCall, tool, input, toolName, middlewareHooks, results);
			if (!decision.proceed) continue;
			input = decision.input;
		}
		yield* executeServerTool(toolCall, tool, toolName, input, context, pendingEvents, results, middlewareHooks);
	}
	return {
		results,
		needsApproval,
		needsClientExecution
	};
}
//#endregion
export { MiddlewareAbortError, ToolCallManager, executeServerTool, executeToolCalls };

//# sourceMappingURL=tool-calls.js.map