import { tanstackMetadata } from "./merge-metadata.js";
//#region src/utilities/chunk-ids.ts
function stringField(value) {
	return typeof value === "string" && value !== "" ? value : void 0;
}
/** Run id on the spec event, or `metadata.tanstack.runId` after normalize. */
function getChunkRunId(chunk) {
	if ("runId" in chunk) {
		const top = stringField(chunk.runId);
		if (top !== void 0) return top;
	}
	return stringField(tanstackMetadata(chunk)?.runId);
}
/** Thread id on the spec event, or `metadata.tanstack.threadId` after normalize. */
function getChunkThreadId(chunk) {
	if ("threadId" in chunk) {
		const top = stringField(chunk.threadId);
		if (top !== void 0) return top;
	}
	return stringField(tanstackMetadata(chunk)?.threadId);
}
//#endregion
export { getChunkRunId, getChunkThreadId };

//# sourceMappingURL=chunk-ids.js.map