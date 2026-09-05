import { Interrupt } from './types.js';
/**
 * `ResumeEntry.metadata` key for a first-party generic request.
 *
 * AG-UI `resume` only carries the answer (`interruptId`, `status`, `payload`).
 * The original request rides here so an ephemeral server can rebuild it.
 */
export declare const INTERRUPT_CONTINUATION_METADATA_KEY: "tanstack:interruptContinuation";
export declare const INTERRUPT_CONTINUATION_VERSION: 1;
export interface GenericInterruptContinuation {
    v: typeof INTERRUPT_CONTINUATION_VERSION;
    definitionId: string;
    key: string;
    batchIndex: number;
    reason: string;
    message: string;
    expiresAt?: string;
    responseSchemaHash?: string;
    payloadSchemaHash?: string;
    payload?: unknown;
}
export type GenericInterruptContinuationReadResult = {
    status: 'absent';
} | {
    status: 'invalid';
    message: string;
} | {
    status: 'ok';
    value: GenericInterruptContinuation;
};
/**
 * Read one generic request from `resume[].metadata`.
 *
 * Missing key means this resume item is not a first-party generic continuation.
 * A present key that fails the shape is a protocol error.
 */
export declare function readGenericInterruptContinuation(metadata: unknown): GenericInterruptContinuationReadResult;
/** Put a parsed continuation on `ResumeEntry.metadata`. */
export declare function wrapGenericInterruptContinuation(continuation: GenericInterruptContinuation): Record<string, unknown>;
/**
 * Build the resume-metadata continuation from an outbound AG-UI interrupt.
 *
 * Returns `undefined` when the descriptor is not a first-party generic item.
 */
export declare function genericInterruptContinuationFromDescriptor(interrupt: Interrupt): GenericInterruptContinuation | undefined;
