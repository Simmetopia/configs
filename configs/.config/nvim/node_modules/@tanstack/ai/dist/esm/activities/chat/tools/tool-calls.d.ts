import { AdapterYieldChunk } from '../../../utilities/adapter-yield-chunk.js';
import { ToolApprovalResolution } from '../../../interrupts.js';
import { AnyTool, CustomEvent, ModelMessage, RunFinishedEvent, Tool, ToolCall, ToolCallArgsEvent, ToolCallEndEvent, ToolCallStartEvent, ToolExecutionContext } from '../../../types.js';
import { AfterToolCallInfo, BeforeToolCallDecision } from '../middleware/types.js';
import { ContextFromTool, DefinedContext, MergeContext, UnionToIntersection } from '../runtime-context-types.js';
/**
 * Optional middleware hooks for tool execution.
 * When provided, these callbacks are invoked before/after each tool execution.
 */
export interface ToolExecutionMiddlewareHooks {
    onBeforeToolCall?: (toolCall: ToolCall, tool: Tool | undefined, args: unknown) => Promise<BeforeToolCallDecision>;
    onAfterToolCall?: (info: AfterToolCallInfo) => Promise<void>;
}
/**
 * Error thrown when middleware decides to abort the chat run during tool execution.
 */
export declare class MiddlewareAbortError extends Error {
    constructor(reason: string);
}
type RequiredContextFromToolUnion<T> = T extends unknown ? undefined extends ContextFromTool<T> ? never : ContextFromTool<T> : never;
type ContextFromToolUnion<T> = [
    UnionToIntersection<DefinedContext<ContextFromTool<T>>>
] extends [never] ? unknown : [RequiredContextFromToolUnion<T>] extends [never] ? UnionToIntersection<DefinedContext<ContextFromTool<T>>> | undefined : UnionToIntersection<DefinedContext<ContextFromTool<T>>>;
type ContextFromTools<TTools> = TTools extends readonly [
    infer THead,
    ...infer TTail
] ? MergeContext<ContextFromTool<THead>, ContextFromTools<TTail>> : TTools extends ReadonlyArray<infer TTool> ? ContextFromToolUnion<TTool> : unknown;
type ExecuteToolsContextArgs<TContext> = undefined extends TContext ? [userContext?: TContext] : [userContext: TContext];
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
export declare class ToolCallManager<TToolsOrContext = ReadonlyArray<AnyTool>, TContext = TToolsOrContext extends ReadonlyArray<AnyTool> ? ContextFromTools<TToolsOrContext> : TToolsOrContext> {
    private readonly toolCallsMap;
    private readonly tools;
    constructor(tools: TToolsOrContext extends ReadonlyArray<AnyTool> ? TToolsOrContext : ReadonlyArray<AnyTool>);
    /**
     * Add a TOOL_CALL_START event to begin tracking a tool call (AG-UI)
     */
    addToolCallStartEvent(event: ToolCallStartEvent): void;
    /**
     * Add a TOOL_CALL_ARGS event to accumulate arguments (AG-UI)
     */
    addToolCallArgsEvent(event: ToolCallArgsEvent): void;
    /**
     * Complete a tool call with its final input
     * Called when TOOL_CALL_END is received
     */
    completeToolCall(event: ToolCallEndEvent): void;
    /**
     * Check if there are any complete tool calls to execute
     */
    hasToolCalls(): boolean;
    /**
     * Get all complete tool calls (filtered for valid ID and name)
     */
    getToolCalls(): Array<ToolCall>;
    /**
     * Execute all tool calls and return tool result messages
     * Yields TOOL_CALL_END events for streaming
     * @param finishEvent - RUN_FINISHED event from the stream
     */
    executeTools(finishEvent: RunFinishedEvent, ...contextArgs: ExecuteToolsContextArgs<TContext>): AsyncGenerator<AdapterYieldChunk, Array<ModelMessage>, void>;
    /**
     * Clear the tool calls map for the next iteration
     */
    clear(): void;
}
export interface ToolResult {
    toolCallId: string;
    toolName: string;
    result: any;
    state?: 'output-available' | 'output-error';
    /** Duration of tool execution in milliseconds (only for server-executed tools) */
    duration?: number;
    /**
     * Parsed tool input (after JSON parse + optional Standard Schema validation).
     * Parsed tool input after JSON parse + optional Standard Schema validation.
     */
    input?: unknown;
    /**
     * Parsed tool output before wire serialization. Surfaced on engine-emitted
     * `TOOL_CALL_END` events so consumers can read typed `output` without
     * re-parsing `result`. Undefined on error paths and when execution is skipped.
     */
    output?: unknown;
}
export interface ApprovalRequest {
    toolCallId: string;
    toolName: string;
    input: any;
    approvalId: string;
}
export interface ClientToolRequest {
    toolCallId: string;
    toolName: string;
    input: any;
}
export interface ToolResumeExecutionState {
    deniedToolResults?: ReadonlyMap<string, unknown>;
    cancelledToolCallIds?: ReadonlySet<string>;
}
interface ExecuteToolCallsResult {
    /** Tool results ready to send to LLM */
    results: Array<ToolResult>;
    /** Tools that need user approval before execution */
    needsApproval: Array<ApprovalRequest>;
    /** Tools that need client-side execution */
    needsClientExecution: Array<ClientToolRequest>;
}
/**
 * Execute a server-side tool with event polling, output validation, and middleware hooks.
 * Yields CustomEvent chunks during execution and pushes the result to the results array.
 */
export declare function executeServerTool<TContext = unknown>(toolCall: ToolCall, tool: AnyTool, toolName: string, input: unknown, context: ToolExecutionContext<TContext>, pendingEvents: Array<CustomEvent>, results: Array<ToolResult>, middlewareHooks?: ToolExecutionMiddlewareHooks): AsyncGenerator<CustomEvent, void, void>;
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
export declare function executeToolCalls<TContext = unknown>(toolCalls: Array<ToolCall>, tools: ReadonlyArray<AnyTool>, approvals?: Map<string, ToolApprovalResolution>, clientResults?: Map<string, any>, createCustomEventChunk?: (eventName: string, value: Record<string, any>) => CustomEvent, middlewareHooks?: ToolExecutionMiddlewareHooks, userContext?: TContext, abortSignal?: AbortSignal, resumeState?: ToolResumeExecutionState): AsyncGenerator<CustomEvent, ExecuteToolCallsResult, void>;
export {};
