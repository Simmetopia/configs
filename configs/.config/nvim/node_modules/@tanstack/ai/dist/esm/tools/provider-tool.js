//#region src/tools/provider-tool.ts
/**
* Attach the `ProviderTool` phantom brand to a plain `Tool`-shaped object.
*
* The brand fields (`'~provider'`, `'~toolKind'`) exist only in the type
* system and are never assigned at runtime, so this is a single audited
* type-only assertion. Use it inside adapter `xxxTool()` factories instead
* of `as unknown as` — the cast collapses to one named site.
*/
function brandProviderTool(tool) {
	return tool;
}
//#endregion
export { brandProviderTool };

//# sourceMappingURL=provider-tool.js.map