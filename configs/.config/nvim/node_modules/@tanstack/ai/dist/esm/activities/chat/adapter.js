//#region src/activities/chat/adapter.ts
/**
* Abstract base class for text adapters.
* Extend this class to implement a text adapter for a specific provider.
*
* Generic parameters match TextAdapter - all pre-resolved by the provider function.
*/
var BaseTextAdapter = class {
	kind = "text";
	model;
	requires = void 0;
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
export { BaseTextAdapter };

//# sourceMappingURL=adapter.js.map