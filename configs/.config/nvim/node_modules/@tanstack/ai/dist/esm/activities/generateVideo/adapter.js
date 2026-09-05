//#region src/activities/generateVideo/adapter.ts
/**
* Abstract base class for video generation adapters.
* Extend this class to implement a video adapter for a specific provider.
*
* @experimental Video generation is an experimental feature and may change.
*
* Generic parameters match VideoAdapter - all pre-resolved by the provider function.
*/
var BaseVideoAdapter = class {
	kind = "video";
	model;
	config;
	constructor(config = {}, model) {
		this.config = config;
		this.model = model;
	}
	/**
	* Default implementation returns `{ kind: 'none' }`. Adapters that have
	* declared their per-model duration map should override this.
	*/
	availableDurations() {
		return { kind: "none" };
	}
	/**
	* Default implementation returns `undefined`. Adapters that have declared
	* their per-model duration map should override.
	*/
	snapDuration(_seconds) {}
	generateId() {
		return `${this.name}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
	}
};
//#endregion
export { BaseVideoAdapter };

//# sourceMappingURL=adapter.js.map