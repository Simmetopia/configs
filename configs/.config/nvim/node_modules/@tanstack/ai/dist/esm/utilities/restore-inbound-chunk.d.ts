import { StreamChunk } from '../types.js';
import { AdapterYieldChunk } from './adapter-yield-chunk.js';
/**
 * Rebuild TanStack `TokenUsage` (`promptTokens`) from spec `usage[]` plus
 * leftover fields in `metadata.tanstack.usage`. Restore in-process aliases
 * that the wire does not keep (`toolName`, `TOOL_CALL_END.input`). Mutates
 * in place so WeakMap run-id stamps stay attached.
 */
export declare function restorePublicUsage(chunk: StreamChunk): StreamChunk;
/**
 * Rebuild the pre-wire chunk shape after SSE/HTTP/WS ingest.
 * Copies `metadata.tanstack` extras back to top-level fields and rebuilds
 * TanStack `TokenUsage` from spec `usage[]` when present.
 */
export declare function restoreInboundChunk(chunk: StreamChunk): AdapterYieldChunk;
