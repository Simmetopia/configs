import { InterruptBinding, InterruptSubmissionError, ItemInterruptErrorCode, UnopenedInterruptBinding } from './interrupts.js';
import { ChatMiddlewareConfig, ChatResumeToolState } from './activities/chat/middleware/types.js';
import { GenericInterruptRequest, InterruptDefinition } from './interrupt-definition.js';
import { Interrupt, RunAgentResumeItem } from './types.js';
/**
 * The `Interrupt.metadata` key under which this package's resume binding
 * travels.
 *
 * Exported so anything that produces an interrupt this package must later
 * resume — an application middleware raising a generic pause, a future
 * workflow-to-AG-UI projection — attaches the binding through
 * {@link withInterruptBinding} rather than copying the string. Everything
 * outside this key is the plain AG-UI envelope and is left untouched.
 */
export declare const INTERRUPT_BINDING_METADATA_KEY = "tanstack:interruptBinding";
/** The persistence-neutral shape required to validate an interrupt resume. */
export interface PendingInterruptResumeRecord {
    interruptId: string;
    payload: unknown;
    binding: InterruptBinding;
    /** Present for a first-party generic interrupt. */
    genericRequest?: GenericInterruptRequest<InterruptDefinition<any, any, any, any>>;
}
export interface ValidateInterruptResumeBatchInput {
    threadId: string;
    interruptedRunId: string;
    generation: number;
    pending: ReadonlyArray<PendingInterruptResumeRecord>;
    resume?: ReadonlyArray<RunAgentResumeItem>;
    tools: ChatMiddlewareConfig['tools'];
    now?: number;
}
export interface ValidatedInterruptResumeBatch {
    errors: ReadonlyArray<InterruptSubmissionError>;
    resolutions?: ReadonlyArray<RunAgentResumeItem>;
    canonicalResolutions?: string;
    fingerprint?: string;
    resumeToolState?: ChatResumeToolState;
}
export declare class InterruptResumeValidationError extends Error {
    readonly errors: ReadonlyArray<InterruptSubmissionError>;
    readonly name = "InterruptResumeValidationError";
    constructor(errors: ReadonlyArray<InterruptSubmissionError>);
}
export declare function interruptItemError(input: Pick<ValidateInterruptResumeBatchInput, 'threadId' | 'interruptedRunId' | 'generation'>, interruptId: string, code: ItemInterruptErrorCode, message: string, options?: {
    path?: ReadonlyArray<string | number>;
    source?: 'client' | 'server';
    retryable?: boolean;
}): InterruptSubmissionError;
/**
 * Validate and translate a complete interrupt batch before any tool executes.
 * Used by ephemeral chat resume; a durable layer may share the same validator.
 */
export declare function validateInterruptResumeBatch(input: ValidateInterruptResumeBatchInput): Promise<ValidatedInterruptResumeBatch>;
export declare function readUnopenedInterruptBinding(descriptor: Interrupt): UnopenedInterruptBinding | undefined;
/**
 * Attach a resume binding to an interrupt descriptor, under
 * {@link INTERRUPT_BINDING_METADATA_KEY}.
 *
 * This is the supported way to make an interrupt resumable by this package.
 * The descriptor keeps its AG-UI shape; only `metadata` gains the namespaced
 * key. Pass the unopened form (no `interruptedRunId` / `generation`) when
 * emitting from inside a run — those fields are stamped as the run finishes.
 */
export declare function withInterruptBinding(descriptor: Interrupt, binding: UnopenedInterruptBinding | InterruptBinding): Interrupt;
/**
 * Read the opened resume binding off a descriptor, or `undefined` when the
 * descriptor carries no binding of a version we understand.
 *
 * `undefined` means "this interrupt is not ours to resume" — it is not a
 * failure to recover from by inventing a binding.
 */
export declare function readInterruptBinding(descriptor: Interrupt): InterruptBinding | undefined;
export declare function withoutInterruptBinding(descriptor: Interrupt): Interrupt;
