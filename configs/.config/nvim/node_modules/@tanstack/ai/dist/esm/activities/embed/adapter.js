//#region src/activities/embed/adapter.ts
/**
* Abstract base class for embedding adapters.
* Extend this class to implement an embedding adapter for a specific provider.
*
* Generic parameters match EmbeddingAdapter - all pre-resolved by the provider function.
*/
var BaseEmbeddingAdapter = class {
	kind = "embedding";
	model;
	config;
	constructor(model, config = {}) {
		this.config = config;
		this.model = model;
	}
	generateId(prefix) {
		return `${prefix ?? this.name}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
	}
};
//#endregion
export { BaseEmbeddingAdapter };

//# sourceMappingURL=adapter.js.map