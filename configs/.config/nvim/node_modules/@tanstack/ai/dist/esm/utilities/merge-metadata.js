//#region src/utilities/merge-metadata.ts
function isPlainRecord(value) {
	return value != null && typeof value === "object" && !Array.isArray(value);
}
function mergeMetadata(current, incoming) {
	if (incoming == null) return current;
	if (current == null) return { ...incoming };
	const merged = {
		...current,
		...incoming
	};
	if (isPlainRecord(current.tanstack) && isPlainRecord(incoming.tanstack)) merged.tanstack = {
		...current.tanstack,
		...incoming.tanstack
	};
	return merged;
}
/** Read `metadata.tanstack`. Not part of the public SDK surface. */
function tanstackMetadata(value) {
	if (value == null) return void 0;
	const nested = "metadata" in value ? value.metadata : void 0;
	const tanstack = (nested != null && typeof nested === "object" && !Array.isArray(nested) ? nested : value).tanstack;
	if (tanstack == null || typeof tanstack !== "object" || Array.isArray(tanstack)) return;
	return tanstack;
}
function withTanstackMetadata(value, tanstack) {
	const current = value.metadata;
	const currentTanstack = tanstackMetadata(value) ?? {};
	return {
		...value,
		metadata: {
			...current ?? {},
			tanstack: {
				...currentTanstack,
				...tanstack
			}
		}
	};
}
//#endregion
export { mergeMetadata, tanstackMetadata, withTanstackMetadata };

//# sourceMappingURL=merge-metadata.js.map