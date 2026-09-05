import { AnyTool } from './types.js';
/**
 * A registry that holds tools and allows dynamic tool management.
 *
 * The registry can be either mutable (allowing additions/removals during execution)
 * or frozen (static tool list, for backward compatibility with tools arrays).
 */
export interface ToolRegistry<TTool extends AnyTool = AnyTool> {
    /**
     * Get all current tools in the registry.
     * Called each agent loop iteration to get the latest tool list.
     */
    getTools: () => Array<TTool>;
    /**
     * Add a tool to the registry dynamically.
     * For frozen registries, this is a no-op.
     *
     * @param tool - The tool to add
     */
    add: (tool: TTool) => void;
    /**
     * Remove a tool from the registry by name.
     * For frozen registries, this always returns false.
     *
     * @param name - The name of the tool to remove
     * @returns true if the tool was removed, false if not found or frozen
     */
    remove: (name: string) => boolean;
    /**
     * Check if a tool exists in the registry.
     *
     * @param name - The name of the tool to check
     */
    has: (name: string) => boolean;
    /**
     * Get a tool by name.
     *
     * @param name - The name of the tool to get
     * @returns The tool if found, undefined otherwise
     */
    get: (name: string) => TTool | undefined;
    /**
     * Whether this registry is frozen (immutable).
     * Frozen registries don't allow add/remove operations.
     */
    readonly isFrozen: boolean;
}
/**
 * Create a mutable tool registry for dynamic tool scenarios.
 *
 * Tools can be added and removed during chat execution, and the
 * changes will be reflected in subsequent agent loop iterations.
 *
 * @param initialTools - Optional initial set of tools
 * @returns A mutable ToolRegistry
 *
 * @example
 * ```typescript
 * const registry = createToolRegistry([toolA, toolB])
 *
 * const stream = chat({
 *   adapter,
 *   messages,
 *   toolRegistry: registry,
 * })
 *
 * // Later, during tool execution:
 * registry.add(newTool)  // Immediately available to LLM
 * ```
 */
export declare function createToolRegistry<TTool extends AnyTool = AnyTool>(initialTools?: Array<TTool>): ToolRegistry<TTool>;
/**
 * Create a frozen (immutable) tool registry from a tools array.
 *
 * This is used internally to wrap static `tools` arrays for backward compatibility.
 * Add and remove operations are no-ops on frozen registries.
 *
 * @param tools - The static array of tools
 * @returns A frozen ToolRegistry
 */
export declare function createFrozenRegistry<TTool extends AnyTool = AnyTool>(tools?: Array<TTool>): ToolRegistry<TTool>;
