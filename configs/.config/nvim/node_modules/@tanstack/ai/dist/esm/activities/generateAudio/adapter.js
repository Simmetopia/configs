//#region src/activities/generateAudio/adapter.ts
/**
* Abstract base class for audio generation adapters.
* Extend this class to implement an audio adapter for a specific provider.
*
* Generic parameters match AudioAdapter - all pre-resolved by the provider function.
*/
var BaseAudioAdapter = class {
	kind = "audio";
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
export { BaseAudioAdapter };

//# sourceMappingURL=adapter.js.map