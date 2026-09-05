//#region src/extend-adapter.ts
function createModel(name, second) {
	if (Array.isArray(second)) return {
		name,
		input: second,
		modelOptions: {}
	};
	const caps = second;
	return {
		name,
		input: caps.input ?? ["text"],
		modelOptions: caps.modelOptions ?? {},
		features: caps.features,
		tools: caps.tools
	};
}
function extendAdapter(factory, _customModels) {
	return factory;
}
//#endregion
export { createModel, extendAdapter };

//# sourceMappingURL=extend-adapter.js.map