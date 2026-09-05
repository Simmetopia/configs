//#region src/byok/errors.ts
var ByokMissingError = class extends Error {
	provider;
	constructor(provider) {
		super(`Missing ${provider} API key`);
		this.name = "ByokMissingError";
		this.provider = provider;
	}
};
var ByokBlockedError = class extends Error {
	provider;
	reason;
	constructor(provider, reason) {
		super(reason === "locked" ? `${provider} key is locked` : `Missing ${provider} API key`);
		this.name = "ByokBlockedError";
		this.provider = provider;
		this.reason = reason;
	}
};
var ByokUnresolvedProviderError = class extends Error {
	constructor() {
		super("BYOK is enabled but no provider slug was resolved. Pass byokProvider or forwardedProps.provider.");
		this.name = "ByokUnresolvedProviderError";
	}
};
//#endregion
export { ByokBlockedError, ByokMissingError, ByokUnresolvedProviderError };

//# sourceMappingURL=errors.js.map