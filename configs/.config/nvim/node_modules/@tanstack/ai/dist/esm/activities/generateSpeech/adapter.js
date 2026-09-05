//#region src/activities/generateSpeech/adapter.ts
/**
* Abstract base class for text-to-speech adapters.
* Extend this class to implement a TTS adapter for a specific provider.
*
* Generic parameters match TTSAdapter - all pre-resolved by the provider function.
*/
var BaseTTSAdapter = class {
	kind = "tts";
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
export { BaseTTSAdapter };

//# sourceMappingURL=adapter.js.map