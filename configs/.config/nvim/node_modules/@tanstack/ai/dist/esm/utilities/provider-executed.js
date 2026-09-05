//#region src/utilities/provider-executed.ts
/**
* Narrow a tool call's opaque `metadata` to the provider-executed convention.
* Returns the typed metadata when the call is provider-executed, else `null`.
*
* @see ProviderExecutedToolMetadata
*/
function getProviderExecutedMetadata(toolCall) {
	const metadata = toolCall?.metadata;
	if (typeof metadata === "object" && metadata !== null && metadata.providerExecuted === true) return metadata;
	return null;
}
/**
* True when a tool call was executed by the provider (e.g. Anthropic
* `web_search` / `web_fetch` server tools) rather than the agent loop. Such
* calls must not be routed to client-side execution and are already "complete".
*/
function isProviderExecutedToolCall(toolCall) {
	return getProviderExecutedMetadata(toolCall) !== null;
}
//#endregion
export { getProviderExecutedMetadata, isProviderExecutedToolCall };

//# sourceMappingURL=provider-executed.js.map