import { AnyServerTool } from '../tools/tool-definition.js';
import { ChatMCPOptions } from './types.js';
export declare class MCPDuplicateToolNameError extends Error {
    readonly toolName: string;
    constructor(toolName: string);
}
/**
 * Encapsulates MCP tool discovery + connection lifecycle for chat().
 * Built from chat()'s `mcp` option; runners only call `discover()` then
 * `dispose()`. A manager built from `undefined` is an inert no-op
 * (`discover()` → `[]`, `dispose()` → no-op), so runners need no branching.
 */
export declare class MCPManager {
    #private;
    static from(options: ChatMCPOptions | undefined): MCPManager;
    private constructor();
    /**
     * Discover + merge tools from all sources. Throws on a fatal discovery error
     * (no `onDiscoveryError`, or it re-threw) or a duplicate tool name; in that
     * case it first closes any connected sources when the policy is 'close'.
     */
    discover(): Promise<Array<AnyServerTool>>;
    /** Close sources iff policy is 'close'. Idempotent; never throws. */
    dispose(): Promise<void>;
}
