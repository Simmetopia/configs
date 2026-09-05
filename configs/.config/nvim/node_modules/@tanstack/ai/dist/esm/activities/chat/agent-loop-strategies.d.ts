import { AgentLoopStrategy } from '../../types.js';
/**
 * Creates a strategy that continues for a maximum number of **model turns**
 * (iterations), not tool calls.
 *
 * One iteration can still emit many parallel tool calls. For a tool-call
 * budget, use middleware with `onBeforeToolCall` (per-turn cap) and
 * `onShouldContinue` (cumulative run budget) — see the docs recipe under
 * Agentic Cycle.
 *
 * @param max - Maximum number of model turns to allow
 * @returns AgentLoopStrategy that stops after max iterations
 *
 * @example
 * ```typescript
 * const stream = chat({
 *   adapter: openaiText(),
 *   model: "gpt-4o",
 *   messages: [...],
 *   tools: [weatherTool],
 *   agentLoopStrategy: maxIterations(3), // Max 3 model turns
 * });
 * ```
 */
export declare function maxIterations(max: number): AgentLoopStrategy;
/**
 * Creates a strategy that continues until a specific finish reason is encountered
 *
 * @param stopReasons - Finish reasons that should stop the loop
 * @returns AgentLoopStrategy that stops on specific finish reasons
 *
 * @example
 * ```typescript
 * const stream = chat({
 *   adapter: openaiText(),
 *   model: "gpt-4o",
 *   messages: [...],
 *   tools: [weatherTool],
 *   agentLoopStrategy: untilFinishReason(["stop", "length"]),
 * });
 * ```
 */
export declare function untilFinishReason(stopReasons: Array<string>): AgentLoopStrategy;
/**
 * Creates a strategy that combines multiple strategies with AND logic
 * All strategies must return true to continue
 *
 * @param strategies - Array of strategies to combine
 * @returns AgentLoopStrategy that continues only if all strategies agree
 *
 * @example
 * ```typescript
 * const stream = chat({
 *   adapter: openaiText(),
 *   model: "gpt-4o",
 *   messages: [...],
 *   tools: [weatherTool],
 *   agentLoopStrategy: combineStrategies([
 *     maxIterations(10),
 *     ({ messages }) => messages.length < 100,
 *   ]),
 * });
 * ```
 */
export declare function combineStrategies(strategies: Array<AgentLoopStrategy>): AgentLoopStrategy;
