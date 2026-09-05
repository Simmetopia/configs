import { t as EventType } from "./events-BaoNrGbE.mjs";

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
export { AGUIConnectNotImplementedError, AGUIError, EventType };
//# sourceMappingURL=index.mjs.map