import { convertSchemaToJsonSchema } from "./schema-converter.js";
import { renderLazyCatalogEntry } from "./lazy-tools.js";
//#region src/activities/chat/tools/lazy-tool-manager.ts
/**
* Name of the synthetic tool the LLM calls to discover lazy tools.
*
* Exported so callers building custom message-compaction / history-trimming
* logic can reference the discovery tool by constant instead of hard-coding
* the string (which is an internal contract that could change).
*/
var DISCOVERY_TOOL_NAME = "__lazy__tool__discovery__";
/**
* Manages lazy tool discovery for the chat agent loop.
*
* Lazy tools are not sent to the LLM initially. Instead, a synthetic
* "discovery tool" is provided that lets the LLM discover lazy tools
* by name, receiving their full descriptions and schemas on demand.
*/
var LazyToolManager = class {
	eagerTools;
	lazyToolMap;
	discoveredTools;
	hasNewDiscoveries;
	discoveryTool;
	lazyToolsConfig;
	constructor(tools, messages, lazyToolsConfig = {}) {
		this.lazyToolsConfig = lazyToolsConfig;
		const eager = [];
		this.lazyToolMap = /* @__PURE__ */ new Map();
		this.discoveredTools = /* @__PURE__ */ new Set();
		this.hasNewDiscoveries = false;
		for (const tool of tools) if (tool.lazy) this.lazyToolMap.set(tool.name, tool);
		else eager.push(tool);
		this.eagerTools = eager;
		if (this.lazyToolMap.size === 0) {
			this.discoveryTool = null;
			return;
		}
		this.scanMessageHistory(messages);
		this.discoveryTool = this.createDiscoveryTool();
	}
	/**
	* Returns the set of tools that should be sent to the LLM:
	* eager tools + discovered lazy tools + discovery tool (if undiscovered tools remain).
	* Resets the hasNewDiscoveries flag.
	*/
	getActiveTools() {
		this.hasNewDiscoveries = false;
		const active = [...this.eagerTools];
		for (const name of this.discoveredTools) {
			const tool = this.lazyToolMap.get(name);
			if (tool) active.push(tool);
		}
		if (this.discoveryTool && this.discoveredTools.size < this.lazyToolMap.size) active.push(this.discoveryTool);
		return active;
	}
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
	getExecutableTools(activeTools, pendingToolCallNames) {
		if (this.discoveryTool && pendingToolCallNames.includes("__lazy__tool__discovery__") && !activeTools.some((t) => t.name === "__lazy__tool__discovery__")) return [...activeTools, this.discoveryTool];
		return activeTools;
	}
	/**
	* Returns whether new tools have been discovered since the last getActiveTools() call.
	*/
	hasNewlyDiscoveredTools() {
		return this.hasNewDiscoveries;
	}
	/**
	* Returns true if the given name is a lazy tool that has not yet been discovered.
	*/
	isUndiscoveredLazyTool(name) {
		return this.lazyToolMap.has(name) && !this.discoveredTools.has(name);
	}
	/**
	* Returns a helpful error message for when an undiscovered lazy tool is called.
	*/
	getUndiscoveredToolError(name) {
		return `Error: Tool '${name}' must be discovered first. Call ${DISCOVERY_TOOL_NAME} with toolNames: ['${name}'] to discover it.`;
	}
	/**
	* Scans message history to find previously discovered lazy tools.
	* Looks for assistant messages with discovery tool calls and their
	* corresponding tool result messages.
	*/
	scanMessageHistory(messages) {
		const discoveryCallIds = /* @__PURE__ */ new Set();
		for (const msg of messages) if (msg.role === "assistant" && msg.toolCalls) {
			for (const tc of msg.toolCalls) if (tc.function.name === "__lazy__tool__discovery__") discoveryCallIds.add(tc.id);
		}
		if (discoveryCallIds.size === 0) return;
		for (const msg of messages) if (msg.role === "tool" && msg.toolCallId && discoveryCallIds.has(msg.toolCallId)) try {
			const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
			const parsed = JSON.parse(content);
			if (parsed && Array.isArray(parsed.tools)) {
				for (const tool of parsed.tools) if (tool && typeof tool.name === "string" && this.lazyToolMap.has(tool.name)) this.discoveredTools.add(tool.name);
			}
		} catch {}
	}
	/**
	* Creates the synthetic discovery tool that the LLM can call
	* to discover lazy tools' descriptions and schemas.
	*/
	createDiscoveryTool() {
		const undiscoveredNames = () => {
			const names = [];
			for (const [name] of this.lazyToolMap) if (!this.discoveredTools.has(name)) names.push(name);
			return names;
		};
		const lazyToolMap = this.lazyToolMap;
		const include = this.lazyToolsConfig.includeDescription ?? "none";
		const description = `You have access to additional tools that can be discovered. Available tools: [${Array.from(this.lazyToolMap.values()).map((t) => renderLazyCatalogEntry(t.name, t.description, include)).join(", ")}]. Call this tool with a list of tool names to discover their full descriptions and argument schemas before using them.`;
		const manager = this;
		return {
			name: DISCOVERY_TOOL_NAME,
			description,
			inputSchema: {
				type: "object",
				properties: { toolNames: {
					type: "array",
					items: { type: "string" },
					description: "List of tool names to discover. Each name must match one of the available tools."
				} },
				required: ["toolNames"]
			},
			execute: (args) => {
				const tools = [];
				const errors = [];
				for (const name of args.toolNames) {
					const tool = lazyToolMap.get(name);
					if (tool) {
						if (!manager.discoveredTools.has(name)) {
							manager.discoveredTools.add(name);
							manager.hasNewDiscoveries = true;
						}
						const jsonSchema = tool.inputSchema ? convertSchemaToJsonSchema(tool.inputSchema) : void 0;
						tools.push({
							name: tool.name,
							description: tool.description,
							...jsonSchema ? { inputSchema: jsonSchema } : {}
						});
					} else errors.push(`Unknown tool: '${name}'. Available tools: [${undiscoveredNames().join(", ")}]`);
				}
				const result = { tools };
				if (errors.length > 0) result.errors = errors;
				return result;
			}
		};
	}
};
//#endregion
export { DISCOVERY_TOOL_NAME, LazyToolManager };

//# sourceMappingURL=lazy-tool-manager.js.map