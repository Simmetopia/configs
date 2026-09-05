import { byokHeaderName, resolveProviderId } from "./providers.js";
//#region src/byok/get-key.ts
/**
* Read a key on the relay. Import from `@tanstack/ai/byok/server` so this
* `process.env` access is not in the client graph.
*
* The header wins. A {@link ByokProvider} then tries `provider.env` in order.
* A slug is header-only.
*/
function getByokKey(request, provider) {
	const value = request.headers.get(byokHeaderName(resolveProviderId(provider)));
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (trimmed.length > 0) return trimmed;
	}
	if (typeof provider === "string") return null;
	for (const name of provider.env ?? []) {
		const envValue = process.env[name];
		if (typeof envValue === "string" && envValue.length > 0) return envValue;
	}
	return null;
}
//#endregion
export { getByokKey };

//# sourceMappingURL=get-key.js.map