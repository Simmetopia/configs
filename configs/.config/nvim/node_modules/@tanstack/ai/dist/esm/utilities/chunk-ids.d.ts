import { StreamChunk } from '../types.js';
/** Run id on the spec event, or `metadata.tanstack.runId` after normalize. */
export declare function getChunkRunId(chunk: StreamChunk): string | undefined;
/** Thread id on the spec event, or `metadata.tanstack.threadId` after normalize. */
export declare function getChunkThreadId(chunk: StreamChunk): string | undefined;
