//#region src/utils.ts
/**
* Detect image mime type from base64 data using magic bytes.
* Returns undefined if the format cannot be detected.
*
* This function analyzes the first few bytes of base64-encoded image data
* to determine the image format based on file signature (magic bytes).
*
* @param base64Data - The base64-encoded image data
* @returns The detected mime type, or undefined if unrecognized
*
* @example
* ```ts
* const mimeType = detectImageMimeType(imageBase64)
* // Returns 'image/jpeg', 'image/png', 'image/gif', 'image/webp', or undefined
* ```
*/
function detectImageMimeType(base64Data) {
	const prefix = base64Data.substring(0, 20);
	if (prefix.startsWith("/9j/")) return "image/jpeg";
	if (prefix.startsWith("iVBORw0KGgo")) return "image/png";
	if (prefix.startsWith("R0lGOD")) return "image/gif";
	if (prefix.startsWith("UklGR")) return "image/webp";
}
//#endregion
export { detectImageMimeType };

//# sourceMappingURL=utils.js.map