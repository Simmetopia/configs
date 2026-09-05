//#region src/activities/chat/middleware/validate.ts
/**
* Runtime validation: every required capability (from middleware `requires` and
* the adapter's `requires`) must be provided by some middleware's `provides`.
* `optionalRequires` is never gating. Throws a clear error otherwise.
*
* Presence only — ORDER is not validated here (a provider may appear after its
* consumer in the array and still pass). Use the `createChatMiddleware()`
* builder for compile-time order enforcement; at runtime, a consumer that reads
* a not-yet-provided capability during `setup` fails loud via its getter.
*/
function validateCapabilities(middlewares, adapter) {
	const provided = /* @__PURE__ */ new Set();
	for (const mw of middlewares) for (const handle of mw.provides ?? []) provided.add(handle);
	const providedNames = () => {
		const names = [...provided].map((h) => h.capabilityName);
		return names.length ? names.join(", ") : "none";
	};
	for (const handle of adapter.requires ?? []) if (!provided.has(handle)) throw new Error(`Adapter "${adapter.name}" requires capability "${handle.capabilityName}". Provided capabilities: ${providedNames()}. Add a middleware that provides "${handle.capabilityName}".`);
	for (const mw of middlewares) for (const handle of mw.requires ?? []) if (!provided.has(handle)) throw new Error(`Middleware "${mw.name ?? "unnamed"}" requires capability "${handle.capabilityName}". Provided capabilities: ${providedNames()}. Add a middleware that provides "${handle.capabilityName}".`);
}
//#endregion
export { validateCapabilities };

//# sourceMappingURL=validate.js.map