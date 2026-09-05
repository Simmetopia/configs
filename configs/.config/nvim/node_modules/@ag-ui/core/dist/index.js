const require_events = require('./events-CMtdFXWl.js');

//#region src/types.ts
var AGUIError = class extends Error {
	constructor(message) {
		super(message);
	}
};
var AGUIConnectNotImplementedError = class extends AGUIError {
	constructor() {
		super("Connect not implemented. This method is not supported by the current agent.");
	}
};

//#endregion
exports.AGUIConnectNotImplementedError = AGUIConnectNotImplementedError;
exports.AGUIError = AGUIError;
exports.EventType = require_events.EventType;
//# sourceMappingURL=index.js.map