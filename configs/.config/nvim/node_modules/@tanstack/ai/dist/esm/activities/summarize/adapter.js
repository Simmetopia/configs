//#region src/activities/summarize/adapter.ts
/**
* Abstract base class for summarize adapters.
* Extend this class to implement a summarize adapter for a specific provider.
*
* Generic parameters match SummarizeAdapter - all pre-resolved by the provider function.
*/
var BaseSummarizeAdapter = class {
	kind = "summarize";
	model;
	config;
	constructor(config = {}, model) {
		this.config = config;
		this.model = model;
	}
	generateId() {
		return `${this.name}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
	}
};
//#endregion
export { BaseSummarizeAdapter };

//# sourceMappingURL=adapter.js.map