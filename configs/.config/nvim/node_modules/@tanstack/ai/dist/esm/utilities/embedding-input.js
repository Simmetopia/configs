//#region src/utilities/embedding-input.ts
function resolveItem(item) {
	if (typeof item === "string") return {
		texts: [item],
		images: []
	};
	if (Array.isArray(item)) {
		const resolved = {
			texts: [],
			images: []
		};
		for (const part of item) if (part.type === "text") resolved.texts.push(part.content);
		else resolved.images.push(part);
		return resolved;
	}
	if (item.type === "text") return {
		texts: [item.content],
		images: []
	};
	return {
		texts: [],
		images: [item]
	};
}
/**
* Resolve each embedding input item into its text and image constituents,
* preserving input order (result[i] corresponds to input[i] and to the
* vector at index i).
*/
function resolveEmbeddingInput(input) {
	return input.map(resolveItem);
}
/**
* Extract plain text inputs for a text-only embedding model, throwing a
* uniform error if any item carries an image. The per-model modality typing
* rejects these at compile time; this guard covers untyped/dynamic callers.
*/
function requireTextOnlyEmbeddingInput(input, provider, model) {
	return resolveEmbeddingInput(input).map((item, index) => {
		if (item.images.length > 0) throw new Error(`${provider} model "${model}" only supports text embedding inputs; input item at index ${index} contains an image part`);
		return item.texts.join("\n");
	});
}
/**
* Count text-only and image-carrying items for observability events. Never
* exposes input content.
*/
function countEmbeddingInputModalities(input) {
	let textInputCount = 0;
	let imageInputCount = 0;
	for (const item of resolveEmbeddingInput(input)) if (item.images.length > 0) imageInputCount++;
	else textInputCount++;
	return {
		textInputCount,
		imageInputCount
	};
}
//#endregion
export { countEmbeddingInputModalities, requireTextOnlyEmbeddingInput, resolveEmbeddingInput };

//# sourceMappingURL=embedding-input.js.map