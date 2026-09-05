//#region src/utilities/numbers.ts
/**
* Return the first candidate that is a finite `number`, or `undefined`.
*
* Handy for picking a value from among several possible spellings/sources where
* only some are populated — e.g. the provider-native sampling option names read
* by the OTel middleware, or the optional numeric fields on `TokenUsage`.
*/
function firstNumber(...candidates) {
	for (const candidate of candidates) if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
}
//#endregion
export { firstNumber };

//# sourceMappingURL=numbers.js.map