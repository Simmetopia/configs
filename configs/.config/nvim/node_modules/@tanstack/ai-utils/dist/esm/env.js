//#region src/env.ts
function getApiKeyFromEnv(envVarName) {
	const apiKey = (typeof globalThis !== "undefined" && globalThis.window?.env ? globalThis.window.env : typeof process !== "undefined" ? process.env : void 0)?.[envVarName];
	if (!apiKey) throw new Error(`${envVarName} is not set. Please set the ${envVarName} environment variable or pass the API key directly.`);
	return apiKey;
}
//#endregion
export { getApiKeyFromEnv };

//# sourceMappingURL=env.js.map