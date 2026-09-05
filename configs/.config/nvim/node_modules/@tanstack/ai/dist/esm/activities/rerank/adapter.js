//#region src/activities/rerank/adapter.ts
/**
* Abstract base class for rerank adapters.
* Extend this class to implement a rerank adapter for a specific provider.
*
* Generic parameters match RerankAdapter - all pre-resolved by the provider function.
*/
var BaseRerankAdapter = class {
	kind = "rerank";
	model;
	config;
	constructor(config = {}, model) {
		this.config = config;
		this.model = model;
	}
	generateId() {
		return `${this.name}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
	}
};
//#endregion
export { BaseRerankAdapter };

//# sourceMappingURL=adapter.js.map