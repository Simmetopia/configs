//#region src/activities/generateImage/adapter.ts
/**
* Abstract base class for image generation adapters.
* Extend this class to implement an image adapter for a specific provider.
*
* Generic parameters match ImageAdapter - all pre-resolved by the provider function.
*/
var BaseImageAdapter = class {
	kind = "image";
	model;
	config;
	constructor(model, config = {}) {
		this.config = config;
		this.model = model;
	}
	generateId() {
		return `${this.name}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
	}
};
//#endregion
export { BaseImageAdapter };

//# sourceMappingURL=adapter.js.map