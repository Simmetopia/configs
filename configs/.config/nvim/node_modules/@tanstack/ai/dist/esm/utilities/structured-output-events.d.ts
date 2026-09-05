import { AdapterYieldChunk } from './adapter-yield-chunk.js';
export declare function structuredOutputStartChunk(args: {
    messageId: string;
    model: string;
    threadId: string;
    runId: string;
    timestamp?: number;
}): AdapterYieldChunk;
export declare function structuredOutputCompleteChunk(args: {
    messageId: string;
    model: string;
    threadId: string;
    runId: string;
    object: unknown;
    raw: string;
    timestamp?: number;
}): AdapterYieldChunk;
