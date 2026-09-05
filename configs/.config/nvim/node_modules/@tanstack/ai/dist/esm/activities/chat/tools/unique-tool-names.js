//#region src/activities/chat/tools/unique-tool-names.ts
/**
* Thrown when `chat({ tools })` (or a provider converter) receives two tools
* with the same public `name`.
*
* The common case is a provider-native factory (`webSearchTool()`) next to an
* ordinary function that reused the reserved name (`web_search`). Providers
* reject that pair, so we fail before the request is built.
*/
var DuplicateToolNameError = class extends Error {
	toolName;
	constructor(toolName, message) {
		super(message);
		this.name = "DuplicateToolNameError";
		this.toolName = toolName;
	}
};
function isProviderNativeTool(tool) {
	const kind = tool.metadata?.["__kind"];
	return typeof kind === "string" && kind.length > 0;
}
function nativeAndCustomMessage(toolName) {
	return [
		`Cannot pass two tools named "${toolName}" in the same chat() call.`,
		`One is the provider-native tool from a factory (for example webSearchTool()).`,
		`The other is your own function with the same public name.`,
		`Tool names in one tools array must be unique.`,
		`Keep the factory for hosted search, or keep your function and give it a different name.`
	].join(" ");
}
function duplicateNameMessage(toolName) {
	return [`Cannot pass two tools named "${toolName}" in the same chat() call.`, `Tool names in one tools array must be unique.`].join(" ");
}
/**
* Throws {@link DuplicateToolNameError} when two tools share a public name.
*
* The native-vs-custom message fires when one of the colliding tools carries
* adapter `metadata.__kind` (set by a provider factory) and another does not.
*/
function assertUniqueToolNames(tools) {
	const byName = /* @__PURE__ */ new Map();
	for (const tool of tools) {
		const group = byName.get(tool.name);
		if (group) group.push(tool);
		else byName.set(tool.name, [tool]);
	}
	for (const [name, group] of byName) {
		if (group.length < 2) continue;
		const hasNative = group.some(isProviderNativeTool);
		const hasCustom = group.some((tool) => !isProviderNativeTool(tool));
		throw new DuplicateToolNameError(name, hasNative && hasCustom ? nativeAndCustomMessage(name) : duplicateNameMessage(name));
	}
}
//#endregion
export { DuplicateToolNameError, assertUniqueToolNames };

//# sourceMappingURL=unique-tool-names.js.map