import { EventType } from "./types.js";
import { isTanstackUsage, toSpecTokenUsage } from "./utilities/ag-ui-usage.js";
import { tanstackMetadata, withTanstackMetadata } from "./utilities/merge-metadata.js";
import { isSpecTopLevelKey } from "./utilities/spec-event-keys.js";
import { normalizeStreamChunk } from "./utilities/normalize-stream-chunk.js";
//#region src/strip-to-spec-middleware.ts
/**
* Delete unknown top-level keys from a stream chunk.
* Keep only AG-UI spec keys for this event type.
* Convert TanStack TokenUsage objects to the spec `usage[]` array.
*/
function stripToSpec(chunk) {
	const out = {};
	for (const [key, value] of Object.entries(chunk)) if (isSpecTopLevelKey(chunk.type, key) && value !== void 0) out[key] = value;
	if ((chunk.type === EventType.RUN_FINISHED || chunk.type === EventType.RUN_ERROR) && isTanstackUsage(out.usage)) {
		const model = tanstackMetadata(chunk)?.model;
		const { usage, leftover } = toSpecTokenUsage(out.usage, { model: typeof model === "string" ? model : void 0 });
		out.usage = usage;
		if (leftover !== void 0) return withTanstackMetadata(out, { usage: leftover });
	}
	return out;
}
/**
* Move TanStack extras into `metadata.tanstack`, then keep only spec keys.
* Custom servers that skip `chat()` still round-trip `finishReason` on SSE/HTTP/WS.
* Fan-out extras (encrypted-value, TOOL_CALL_RESULT) stay on the `chat()` path;
* this encoder is 1:1 with the durability log offset.
*/
function toWireChunk(chunk) {
	const [normalized] = normalizeStreamChunk(chunk);
	return stripToSpec(normalized ?? chunk);
}
//#endregion
export { stripToSpec, toWireChunk };

//# sourceMappingURL=strip-to-spec-middleware.js.map