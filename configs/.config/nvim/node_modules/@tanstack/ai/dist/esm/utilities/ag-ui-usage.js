//#region src/utilities/ag-ui-usage.ts
function definedDetails(value) {
	return Object.keys(value).length > 0 ? value : void 0;
}
function withoutKey(value, key) {
	const next = { ...value };
	delete next[key];
	return next;
}
function isTanstackUsage(usage) {
	return typeof usage === "object" && usage != null && !Array.isArray(usage) && "promptTokens" in usage;
}
function toSpecTokenUsage(usage, options) {
	const { promptTokens, completionTokens, totalTokens, promptTokensDetails, completionTokensDetails, ...rest } = usage;
	const spec = {
		...options?.provider !== void 0 ? { provider: options.provider } : {},
		...options?.model !== void 0 ? { model: options.model } : {},
		inputTokens: promptTokens,
		outputTokens: completionTokens,
		totalTokens
	};
	const cachedInputTokens = promptTokensDetails?.cachedTokens;
	if (cachedInputTokens !== void 0) spec.cachedInputTokens = cachedInputTokens;
	const reasoningTokens = completionTokensDetails?.reasoningTokens;
	if (reasoningTokens !== void 0) spec.reasoningTokens = reasoningTokens;
	const leftoverPrompt = promptTokensDetails ? definedDetails(withoutKey(promptTokensDetails, "cachedTokens")) : void 0;
	const leftoverCompletion = completionTokensDetails ? definedDetails(withoutKey(completionTokensDetails, "reasoningTokens")) : void 0;
	return {
		usage: [spec],
		leftover: definedDetails({
			...rest,
			...leftoverPrompt !== void 0 ? { promptTokensDetails: leftoverPrompt } : {},
			...leftoverCompletion !== void 0 ? { completionTokensDetails: leftoverCompletion } : {}
		})
	};
}
function rebuildTokenUsage(usage, leftover) {
	if (isTanstackUsage(usage)) return usage;
	if (Array.isArray(usage)) return fromSpecTokenUsage(usage, leftover);
	return fromSpecTokenUsage(void 0, leftover);
}
function fromSpecTokenUsage(usage, leftover) {
	const spec = usage?.[0];
	if (spec == null && leftover == null) return;
	const { promptTokensDetails: leftoverPromptDetails, completionTokensDetails: leftoverCompletionDetails, ...leftoverRest } = leftover ?? {};
	const promptTokensDetails = definedDetails({
		...spec?.cachedInputTokens !== void 0 ? { cachedTokens: spec.cachedInputTokens } : {},
		...leftoverPromptDetails
	});
	const completionTokensDetails = definedDetails({
		...spec?.reasoningTokens !== void 0 ? { reasoningTokens: spec.reasoningTokens } : {},
		...leftoverCompletionDetails
	});
	return {
		promptTokens: spec?.inputTokens ?? 0,
		completionTokens: spec?.outputTokens ?? 0,
		totalTokens: spec?.totalTokens ?? 0,
		...leftoverRest,
		...promptTokensDetails !== void 0 ? { promptTokensDetails } : {},
		...completionTokensDetails !== void 0 ? { completionTokensDetails } : {}
	};
}
//#endregion
export { fromSpecTokenUsage, isTanstackUsage, rebuildTokenUsage, toSpecTokenUsage };

//# sourceMappingURL=ag-ui-usage.js.map