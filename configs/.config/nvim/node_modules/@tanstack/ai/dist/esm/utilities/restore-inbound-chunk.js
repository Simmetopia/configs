import { EventType } from "../types.js";
import { isTanstackUsage, rebuildTokenUsage } from "./ag-ui-usage.js";
import { tanstackMetadata } from "./merge-metadata.js";
//#region src/utilities/restore-inbound-chunk.ts
/**
* Rebuild TanStack `TokenUsage` (`promptTokens`) from spec `usage[]` plus
* leftover fields in `metadata.tanstack.usage`. Restore in-process aliases
* that the wire does not keep (`toolName`, `TOOL_CALL_END.input`). Mutates
* in place so WeakMap run-id stamps stay attached.
*/
function restorePublicUsage(chunk) {
	if ((chunk.type === EventType.RUN_FINISHED || chunk.type === EventType.RUN_ERROR) && (Array.isArray(chunk.usage) || isTanstackUsage(chunk.usage))) {
		const rebuilt = rebuildTokenUsage(chunk.usage, tanstackMetadata(chunk)?.usage);
		if (rebuilt !== void 0) chunk.usage = rebuilt;
	}
	if (chunk.type === EventType.TOOL_CALL_START && chunk.toolName === void 0 && chunk.toolCallName) chunk.toolName = chunk.toolCallName;
	if (chunk.type === EventType.TOOL_CALL_END && chunk.input === void 0) {
		const input = tanstackMetadata(chunk)?.input;
		if (input !== void 0) chunk.input = input;
	}
	return chunk;
}
/**
* Rebuild the pre-wire chunk shape after SSE/HTTP/WS ingest.
* Copies `metadata.tanstack` extras back to top-level fields and rebuilds
* TanStack `TokenUsage` from spec `usage[]` when present.
*/
function restoreInboundChunk(chunk) {
	restorePublicUsage(chunk);
	const tanstack = tanstackMetadata(chunk);
	const next = chunk;
	if (tanstack == null) return next;
	for (const [key, value] of Object.entries(tanstack)) {
		if (key === "usage" || key === "interruptErrors") continue;
		if (next[key] === void 0 && value !== void 0) next[key] = value;
	}
	if (tanstack.interruptErrors !== void 0) next["tanstack:interruptErrors"] = tanstack.interruptErrors;
	return next;
}
//#endregion
export { restoreInboundChunk, restorePublicUsage };

//# sourceMappingURL=restore-inbound-chunk.js.map