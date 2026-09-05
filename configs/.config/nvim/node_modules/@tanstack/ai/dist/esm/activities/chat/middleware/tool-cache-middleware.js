//#region src/activities/chat/middleware/tool-cache-middleware.ts
function defaultKeyFn(toolName, args) {
	return JSON.stringify([toolName, args]);
}
function createDefaultStorage(maxSize) {
	const cache = /* @__PURE__ */ new Map();
	return {
		getItem: (key) => {
			const entry = cache.get(key);
			if (entry !== void 0) {
				cache.delete(key);
				cache.set(key, entry);
			}
			return entry;
		},
		setItem: (key, value) => {
			if (cache.has(key)) cache.delete(key);
			else if (cache.size >= maxSize) {
				const firstKey = cache.keys().next().value;
				if (firstKey !== void 0) cache.delete(firstKey);
			}
			cache.set(key, value);
		},
		deleteItem: (key) => {
			cache.delete(key);
		}
	};
}
/**
* Creates a middleware that caches tool call results based on tool name + arguments.
*
* When a tool is called with the same name and arguments as a previous call,
* the cached result is returned immediately without executing the tool.
*
* @example
* ```ts
* import { chat, toolCacheMiddleware } from '@tanstack/ai'
*
* const stream = chat({
*   adapter,
*   messages,
*   tools: [weatherTool, stockTool],
*   middleware: [
*     toolCacheMiddleware({ ttl: 60_000, toolNames: ['getWeather'] }),
*   ],
* })
* ```
*/
function toolCacheMiddleware(options = {}) {
	const { maxSize = 100, ttl = Infinity, toolNames, keyFn = defaultKeyFn, storage = createDefaultStorage(maxSize) } = options;
	return {
		name: "tool-cache-middleware",
		onBeforeToolCall: async (_ctx, hookCtx) => {
			if (toolNames && !toolNames.includes(hookCtx.toolName)) return;
			const key = keyFn(hookCtx.toolName, hookCtx.args);
			const entry = await storage.getItem(key);
			if (entry) {
				if (Date.now() - entry.timestamp < ttl) return {
					type: "skip",
					result: entry.result
				};
				await storage.deleteItem(key);
			}
		},
		onAfterToolCall: async (_ctx, info) => {
			if (!info.ok) return;
			if (toolNames && !toolNames.includes(info.toolName)) return;
			let parsedArgs;
			try {
				parsedArgs = JSON.parse(info.toolCall.function.arguments.trim() || "{}");
			} catch {
				return;
			}
			const key = keyFn(info.toolName, parsedArgs);
			await storage.setItem(key, {
				result: info.result,
				timestamp: Date.now()
			});
		}
	};
}
//#endregion
export { toolCacheMiddleware };

//# sourceMappingURL=tool-cache-middleware.js.map