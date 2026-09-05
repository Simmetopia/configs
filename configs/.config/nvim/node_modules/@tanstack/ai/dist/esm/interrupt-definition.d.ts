import { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec';
import { INTERRUPT_BINDING_VERSION } from './interrupts.js';
export declare const INTERRUPT_PAYLOAD_METADATA_KEY: "tanstack:interruptPayload";
export declare const INTERRUPT_BINDING_KIND: "generic";
type PortableSchema = StandardJSONSchemaV1<any, any> | StandardSchemaV1<any, any>;
type InferSchemaOutput<TSchema> = TSchema extends StandardSchemaV1<any, infer TOutput> ? TOutput : TSchema extends StandardJSONSchemaV1<any, infer TOutput> ? TOutput : never;
type InferSchemaInput<TSchema> = TSchema extends StandardSchemaV1<infer TInput, any> ? TInput : TSchema extends StandardJSONSchemaV1<infer TInput, any> ? TInput : never;
export interface InterruptDefinitionOptions<TId extends string, TPayloadSchema extends PortableSchema | undefined, TResponseSchema extends PortableSchema | undefined> {
    id: TId;
    payloadSchema?: TPayloadSchema;
    responseSchema?: TResponseSchema;
}
export interface InterruptBindingDescriptor {
    v: typeof INTERRUPT_BINDING_VERSION;
    kind: typeof INTERRUPT_BINDING_KIND;
    definitionId: string;
    key: string;
    threadId?: string;
    interruptedRunId?: string;
    generation?: number;
    batchIndex?: number;
    responseSchemaCanonicalJson?: string;
    payloadSchemaCanonicalJson?: string;
    payloadSchemaHash?: string;
    responseSchemaHash?: string;
}
export interface InterruptPreEmissionData {
    descriptor: InterruptBindingDescriptor;
    payload?: unknown;
}
type InterruptInput<TPayloadSchema extends PortableSchema | undefined, TPayload = unknown> = {
    key: string;
    reason: string;
    message: string;
    expiresAt?: string;
} & ([TPayloadSchema] extends [undefined] ? {} : {
    payload?: TPayload;
});
type GenericInterruptRequestBase<TDefinition extends InterruptDefinition<any, any, any, any>> = {
    readonly definition: TDefinition;
    readonly key: string;
    readonly reason: string;
    readonly message: string;
    readonly expiresAt?: string;
};
type GenericInterruptRequestFor<TDefinition extends InterruptDefinition<any, any, any, any>, TPayloadSchema extends PortableSchema | undefined, TPayload> = GenericInterruptRequestBase<TDefinition> & ([TPayloadSchema] extends [undefined] ? {} : {
    readonly payload: TPayload | undefined;
});
export type GenericInterruptRequest<TDefinition extends InterruptDefinition<any, any, any, any>> = [TDefinition] extends [never] ? never : TDefinition extends InterruptDefinition<any, infer TPayloadSchema, any, infer TPayload> ? GenericInterruptRequestFor<TDefinition, TPayloadSchema, TPayload> : GenericInterruptRequestBase<TDefinition>;
type InterruptInputKey = 'key' | 'reason' | 'message' | 'expiresAt' | 'payload';
type RejectUnexpectedInputKeys<TInput> = Exclude<keyof TInput, InterruptInputKey> extends never ? unknown : {
    [K in Exclude<keyof TInput, InterruptInputKey>]: never;
};
type RejectUnexpectedPayload<TInput> = 'payload' extends keyof TInput ? {
    payload: never;
} : unknown;
type ValidInterruptInput<TInput, TPayloadSchema extends PortableSchema | undefined, TPayload = unknown> = TInput extends InterruptInput<TPayloadSchema, TPayload> ? RejectUnexpectedInputKeys<TInput> & ([TPayloadSchema] extends [undefined] ? RejectUnexpectedPayload<TInput> : unknown) : never;
/**
 * Extracting a class method preserves the intentional bivariant assignment
 * behavior of the public `interrupt` callback without exposing a method
 * signature in an interface.
 */
declare abstract class InterruptRequestMethodSignature<TId extends string, TPayloadSchema extends PortableSchema | undefined, TResponseSchema extends PortableSchema | undefined, TPayload, TPayloadInput> {
    abstract call<TInput>(input: TInput & ValidInterruptInput<TInput, TPayloadSchema, TPayloadInput>): GenericInterruptRequestFor<InterruptDefinition<TId, TPayloadSchema, TResponseSchema, TPayload, TPayloadInput>, TPayloadSchema, TPayload>;
}
type InterruptRequestMethod<TId extends string, TPayloadSchema extends PortableSchema | undefined, TResponseSchema extends PortableSchema | undefined, TPayload, TPayloadInput> = InterruptRequestMethodSignature<TId, TPayloadSchema, TResponseSchema, TPayload, TPayloadInput>['call'];
type DefinedInterruptDefinition<TId extends string, TPayloadSchema extends PortableSchema | undefined, TResponseSchema extends PortableSchema | undefined, TPayload = unknown, TPayloadInput = TPayload> = Omit<InterruptDefinition<TId, TPayloadSchema, TResponseSchema, TPayload, TPayloadInput>, 'interrupt'> & {
    interrupt: InterruptRequestMethod<TId, TPayloadSchema, TResponseSchema, TPayload, TPayloadInput>;
};
export interface InterruptDefinition<TId extends string, TPayloadSchema extends PortableSchema | undefined, TResponseSchema extends PortableSchema | undefined, TPayload = unknown, TPayloadInput = TPayload> {
    readonly id: TId;
    readonly payloadSchema: TPayloadSchema;
    readonly responseSchema: TResponseSchema;
    interrupt: InterruptRequestMethod<TId, TPayloadSchema, TResponseSchema, TPayload, TPayloadInput>;
}
export declare function createInterruptBinding(request: GenericInterruptRequest<InterruptDefinition<any, any, any, any>>, fields?: Pick<InterruptBindingDescriptor, 'threadId' | 'interruptedRunId' | 'generation' | 'batchIndex'>): InterruptPreEmissionData;
type ParsedInterruptInput = {
    key: string;
    reason: string;
    message: string;
    expiresAt?: string;
    payload?: unknown;
};
/**
 * Returns the schema input captured for a newly emitted request. This is
 * internal because continuation state can cross a client boundary and must be
 * parsed again when it returns to the server.
 */
export declare function getInterruptRequestInput(request: GenericInterruptRequest<InterruptDefinition<any, any, any, any>>): Readonly<ParsedInterruptInput>;
/**
 * Rebuild a request from a persisted display payload that has already passed
 * the definition's payload schema. This is internal because callers must not
 * bypass public input validation for new requests.
 */
export declare function rehydrateInterruptRequest(definition: InterruptDefinition<any, any, any, any>, input: ParsedInterruptInput): GenericInterruptRequest<InterruptDefinition<any, any, any, any>>;
/** Same hash the producer stamps on a first-party generic binding. */
export declare function hashInterruptDefinitionSchema(schema: unknown): string;
export declare function defineInterrupt<const TId extends string, const TPayloadSchema extends PortableSchema, const TResponseSchema extends PortableSchema>(options: {
    id: TId;
    payloadSchema: TPayloadSchema;
    responseSchema: TResponseSchema;
}): DefinedInterruptDefinition<TId, TPayloadSchema, TResponseSchema, InferSchemaOutput<TPayloadSchema>, InferSchemaInput<TPayloadSchema>>;
export declare function defineInterrupt<const TId extends string, const TPayloadSchema extends PortableSchema>(options: {
    id: TId;
    payloadSchema: TPayloadSchema;
    responseSchema?: never;
}): DefinedInterruptDefinition<TId, TPayloadSchema, undefined, InferSchemaOutput<TPayloadSchema>, InferSchemaInput<TPayloadSchema>>;
export declare function defineInterrupt<const TId extends string, const TResponseSchema extends PortableSchema>(options: {
    id: TId;
    responseSchema: TResponseSchema;
    payloadSchema?: never;
}): DefinedInterruptDefinition<TId, undefined, TResponseSchema, undefined, undefined>;
export {};
