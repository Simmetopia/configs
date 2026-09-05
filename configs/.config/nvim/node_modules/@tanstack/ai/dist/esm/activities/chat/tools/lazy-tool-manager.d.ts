import { AnyTool, LazyToolsConfig, Tool } from '../../../types.js';
/**
 * Name of the synthetic tool the LLM calls to discover lazy tools.
 *
 * Exported so callers building custom message-compaction / history-trimming
 * logic can reference the discovery tool by constant instead of hard-coding
 * the string (which is an internal contract that could change).
 */
export declare const DISCOVERY_TOOL_NAME = "__lazy__tool__discovery__";
/**
 * Manages lazy tool discovery for the chat agent loop.
 *
 * Lazy tools are not sent to the LLM initially. Instead, a synthetic
 * "discovery tool" is provided that lets the LLM discover lazy tools
 * by name, receiving their full descriptions and schemas on demand.
 */
export declare class LazyToolManager {
    private readonly eagerTools;
    private readonly lazyToolMap;
    private readonly discoveredTools;
    private hasNewDiscoveries;
    private readonly discoveryTool;
    private readonly lazyToolsConfig;
    constructor(tools: ReadonlyArray<Tool>, messages: ReadonlyArray<{
        role: string;
        content?: any;
        toolCalls?: Array<{
            id: string;
            type: string;
            function: {
                name: string;
                arguments: string;
            };
        }>;
        toolCallId?: string;
    }>, lazyToolsConfig?: LazyToolsConfig);
    /**
     * Returns the set of tools that should be sent to the LLM:
     * eager tools + discovered lazy tools + discovery tool (if undiscovered tools remain).
     * Resets the hasNewDiscoveries flag.
     */
    getActiveTools(): Array<Tool>;
    /**
     * Returns the tools that should be available for *execution* this turn.
     *
     * This is the advertised set (`getActiveTools()`, passed in as `activeTools`)
     * plus the discovery tool when a pending call references it but it is no
     * longer advertised. Once every lazy tool has been discovered the discovery
     * tool is dropped from the advertised set, but a model may still re-request
     * discovery (long context / hallucination); keeping it executable lets that
     * call return the schemas again instead of failing with "Unknown tool".
     *
     * The advertised set is intentionally left unchanged — only execution lookup
     * is widened. Operates on the already-built `activeTools`: it must NOT call
     * `getActiveTools()`, which would reset `hasNewDiscoveries` before the
     * post-execution refresh check in the agent loop.
     */
    getExecutableTools(activeTools: ReadonlyArray<AnyTool>, pendingToolCallNames: ReadonlyArray<string>): ReadonlyArray<AnyTool>;
    /**
     * Returns whether new tools have been discovered since the last getActiveTools() call.
     */
    hasNewlyDiscoveredTools(): boolean;
    /**
     * Returns true if the given name is a lazy tool that has not yet been discovered.
     */
    isUndiscoveredLazyTool(name: string): boolean;
    /**
     * Returns a helpful error message for when an undiscovered lazy tool is called.
     */
    getUndiscoveredToolError(name: string): string;
    /**
     * Scans message history to find previously discovered lazy tools.
     * Looks for assistant messages with discovery tool calls and their
     * corresponding tool result messages.
     */
    private scanMessageHistory;
    /**
     * Creates the synthetic discovery tool that the LLM can call
     * to discover lazy tools' descriptions and schemas.
     */
    private createDiscoveryTool;
}
