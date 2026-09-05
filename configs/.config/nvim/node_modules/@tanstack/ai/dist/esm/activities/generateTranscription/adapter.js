//#region src/activities/generateTranscription/adapter.ts
/**
* Abstract base class for audio transcription adapters.
* Extend this class to implement a transcription adapter for a specific provider.
*
* Generic parameters match TranscriptionAdapter - all pre-resolved by the provider function.
*/
var BaseTranscriptionAdapter = class {
	kind = "transcription";
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
export { BaseTranscriptionAdapter };

//# sourceMappingURL=adapter.js.map