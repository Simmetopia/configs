import { isProviderId } from "./providers.js";
//#region src/byok/define-provider.ts
function normalizeEnv(env) {
	if (env === void 0) return void 0;
	return typeof env === "string" ? [env] : env;
}
function defineByokProvider(provider) {
	if (!isProviderId(provider.id)) throw new Error(`Invalid BYOK provider id: ${String(provider.id)}`);
	const env = normalizeEnv(provider.env);
	return {
		id: provider.id,
		label: provider.label,
		...env ? { env } : {}
	};
}
//#endregion
export { defineByokProvider };

//# sourceMappingURL=define-provider.js.map