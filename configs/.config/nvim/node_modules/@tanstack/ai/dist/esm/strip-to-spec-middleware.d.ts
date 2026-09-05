import { StreamChunk } from './types.js';
import { AdapterYieldChunk } from './utilities/adapter-yield-chunk.js';
/**
 * Delete unknown top-level keys from a stream chunk.
 * Keep only AG-UI spec keys for this event type.
 * Convert TanStack TokenUsage objects to the spec `usage[]` array.
 */
export declare function stripToSpec(chunk: StreamChunk | AdapterYieldChunk): StreamChunk;
/**
 * Move TanStack extras into `metadata.tanstack`, then keep only spec keys.
 * Custom servers that skip `chat()` still round-trip `finishReason` on SSE/HTTP/WS.
 * Fan-out extras (encrypted-value, TOOL_CALL_RESULT) stay on the `chat()` path;
 * this encoder is 1:1 with the durability log offset.
 */
export declare function toWireChunk(chunk: StreamChunk | AdapterYieldChunk): StreamChunk;
