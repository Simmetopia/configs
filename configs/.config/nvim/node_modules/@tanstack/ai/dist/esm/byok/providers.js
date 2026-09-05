//#region src/byok/providers.ts
/** `[a-z][a-z0-9-]{0,63}` — lowercase, no underscores, max 64 chars. */
var BYOK_PROVIDER_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
var BYOK_HEADER_PREFIX = "x-byok-";
function isProviderId(value) {
	return typeof value === "string" && BYOK_PROVIDER_ID_PATTERN.test(value);
}
function resolveProviderId(provider) {
	return typeof provider === "string" ? provider : provider.id;
}
function byokHeaderName(provider) {
	if (!isProviderId(provider)) throw new Error(`Invalid BYOK provider id: ${provider}`);
	return `${BYOK_HEADER_PREFIX}${provider}`;
}
//#endregion
export { BYOK_HEADER_PREFIX, BYOK_PROVIDER_ID_PATTERN, byokHeaderName, isProviderId, resolveProviderId };

//# sourceMappingURL=providers.js.map