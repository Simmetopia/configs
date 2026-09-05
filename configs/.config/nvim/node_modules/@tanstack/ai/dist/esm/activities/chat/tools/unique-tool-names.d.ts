import { Tool } from '../../../types.js';
/**
 * Thrown when `chat({ tools })` (or a provider converter) receives two tools
 * with the same public `name`.
 *
 * The common case is a provider-native factory (`webSearchTool()`) next to an
 * ordinary function that reused the reserved name (`web_search`). Providers
 * reject that pair, so we fail before the request is built.
 */
export declare class DuplicateToolNameError extends Error {
    readonly toolName: string;
    constructor(toolName: string, message: string);
}
/**
 * Throws {@link DuplicateToolNameError} when two tools share a public name.
 *
 * The native-vs-custom message fires when one of the colliding tools carries
 * adapter `metadata.__kind` (set by a provider factory) and another does not.
 */
export declare function assertUniqueToolNames(tools: ReadonlyArray<Tool>): void;
