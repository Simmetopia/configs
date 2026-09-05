//#region src/id.ts
function generateId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2)}`;
}
//#endregion
export { generateId };

//# sourceMappingURL=id.js.map