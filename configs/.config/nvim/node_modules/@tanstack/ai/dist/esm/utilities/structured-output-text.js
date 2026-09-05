//#region src/utilities/structured-output-text.ts
/**
* Parse JSON from a model/harness assistant string.
* Strips a wrapping markdown fence when the whole payload is fenced.
* If the model wrote prose first, take the last JSON object or array.
*/
function parseJsonFromAssistantText(raw) {
	const trimmed = raw.trim();
	if (trimmed === "") throw new SyntaxError("Assistant text is empty");
	const candidates = [];
	const wholeFence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
	if (wholeFence?.[1]) candidates.push(wholeFence[1].trim());
	candidates.push(trimmed);
	const lastFence = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/g)].at(-1);
	if (lastFence?.[1]) candidates.push(lastFence[1].trim());
	const extracted = extractLastJsonSlice(trimmed);
	if (extracted !== void 0) candidates.push(extracted);
	let lastError;
	for (const candidate of candidates) try {
		return JSON.parse(candidate);
	} catch (error) {
		lastError = error;
	}
	throw lastError instanceof Error ? lastError : /* @__PURE__ */ new SyntaxError("No JSON object found in assistant text");
}
function extractLastJsonSlice(text) {
	for (let end = text.length - 1; end >= 0; end--) {
		if (text[end] !== "}" && text[end] !== "]") continue;
		for (let start = end; start >= 0; start--) {
			const opener = text[start];
			if (opener !== "{" && opener !== "[") continue;
			const slice = text.slice(start, end + 1);
			try {
				JSON.parse(slice);
				return slice;
			} catch {}
		}
	}
}
function appendOutputSchemaInstruction(prompt, schema) {
	return `${prompt}

Respond with a single JSON object that matches this JSON Schema. Do not wrap the object in markdown unless you must.

${JSON.stringify(schema)}`;
}
//#endregion
export { appendOutputSchemaInstruction, parseJsonFromAssistantText };

//# sourceMappingURL=structured-output-text.js.map