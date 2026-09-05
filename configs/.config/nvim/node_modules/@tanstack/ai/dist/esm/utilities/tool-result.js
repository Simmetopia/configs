//#region src/utilities/tool-result.ts
var CONTENT_PART_TYPES = /* @__PURE__ */ new Set([
	"text",
	"image",
	"audio",
	"video",
	"document"
]);
/**
* Structural check for a single `ContentPart`. A text part must carry a string
* `content`; every other modality must carry a `source` with `type` of
* `'url' | 'data'` and a string `value`.
*/
function isContentPart(value) {
	if (typeof value !== "object" || value === null) return false;
	const part = value;
	if (typeof part.type !== "string" || !CONTENT_PART_TYPES.has(part.type)) return false;
	if (part.type === "text") return typeof part.content === "string";
	const source = part.source;
	if (typeof source !== "object" || source === null) return false;
	const src = source;
	if (typeof src.value !== "string") return false;
	if (src.type === "data") return typeof src.mimeType === "string";
	return src.type === "url";
}
/**
* True iff `value` is a NON-EMPTY array whose every element is a valid
* `ContentPart`. Empty arrays and mixed arrays return false so they continue
* to be treated as ordinary (stringified) data — this keeps the auto-detection
* footgun narrow.
*/
function isContentPartArray(value) {
	return Array.isArray(value) && value.length > 0 && value.every(isContentPart);
}
/**
* Normalize a tool's return value for transport:
* - string            → unchanged
* - ContentPart array → unchanged (multimodal, passed through to the adapter)
* - anything else     → `JSON.stringify`
*/
function normalizeToolResult(result) {
	if (typeof result === "string") return result;
	if (isContentPartArray(result)) return result;
	return JSON.stringify(result);
}
//#endregion
export { isContentPart, isContentPartArray, normalizeToolResult };

//# sourceMappingURL=tool-result.js.map