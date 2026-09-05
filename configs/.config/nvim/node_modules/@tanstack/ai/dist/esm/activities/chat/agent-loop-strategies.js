//#region src/activities/chat/agent-loop-strategies.ts
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
function maxIterations(max) {
	return ({ iterationCount }) => iterationCount < max;
}
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
function untilFinishReason(stopReasons) {
	return ({ finishReason, iterationCount }) => {
		if (iterationCount === 0) return true;
		if (finishReason && stopReasons.includes(finishReason)) return false;
		return true;
	};
}
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
function combineStrategies(strategies) {
	return (state) => {
		return strategies.every((strategy) => strategy(state));
	};
}
//#endregion
export { combineStrategies, maxIterations, untilFinishReason };

//# sourceMappingURL=agent-loop-strategies.js.map