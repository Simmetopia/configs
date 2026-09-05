//#region src/utilities/media-prompt.ts
/**
* Decompose a {@link MediaPrompt} into flattened text and per-modality part
* buckets, preserving prompt order everywhere. This is the single downrev
* point from the canonical interleaved prompt shape to the named-field
* request shapes most providers expose.
*/
function resolveMediaPrompt(prompt) {
	if (typeof prompt === "string") return {
		text: prompt,
		parts: [{
			type: "text",
			content: prompt
		}],
		images: [],
		videos: [],
		audios: []
	};
	const images = [];
	const videos = [];
	const audios = [];
	const textSegments = [];
	for (const part of prompt) switch (part.type) {
		case "text":
			if (part.content) textSegments.push(part.content);
			break;
		case "image":
			images.push(part);
			break;
		case "video":
			videos.push(part);
			break;
		case "audio": audios.push(part);
	}
	return {
		text: textSegments.join("\n\n"),
		parts: prompt,
		images,
		videos,
		audios
	};
}
//#endregion
export { resolveMediaPrompt };

//# sourceMappingURL=media-prompt.js.map