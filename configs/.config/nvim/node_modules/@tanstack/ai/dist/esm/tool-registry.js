//#region src/tool-registry.ts
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
function createToolRegistry(initialTools = []) {
	const tools = /* @__PURE__ */ new Map();
	for (const tool of initialTools) tools.set(tool.name, tool);
	return {
		getTools: () => Array.from(tools.values()),
		add: (tool) => {
			tools.set(tool.name, tool);
		},
		remove: (name) => {
			return tools.delete(name);
		},
		has: (name) => {
			return tools.has(name);
		},
		get: (name) => {
			return tools.get(name);
		},
		isFrozen: false
	};
}
/**
* Create a frozen (immutable) tool registry from a tools array.
*
* This is used internally to wrap static `tools` arrays for backward compatibility.
* Add and remove operations are no-ops on frozen registries.
*
* @param tools - The static array of tools
* @returns A frozen ToolRegistry
*/
function createFrozenRegistry(tools = []) {
	const toolMap = /* @__PURE__ */ new Map();
	for (const tool of tools) toolMap.set(tool.name, tool);
	const frozenTools = Object.freeze([...tools]);
	return {
		getTools: () => [...frozenTools],
		add: (_tool) => {},
		remove: (_name) => {
			return false;
		},
		has: (name) => {
			return toolMap.has(name);
		},
		get: (name) => {
			return toolMap.get(name);
		},
		isFrozen: true
	};
}
//#endregion
export { createFrozenRegistry, createToolRegistry };

//# sourceMappingURL=tool-registry.js.map