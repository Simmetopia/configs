/** Options accepted by a capability getter. */
export interface CapabilityGetOptions {
    /** When true, return undefined instead of throwing if the capability is absent. */
    optional?: boolean;
}
/**
 * The minimal context shape a capability accessor needs. The full
 * `ChatMiddlewareContext` satisfies this (it has `capabilities`), so accessors
 * accept any middleware context without referencing `any`.
 */
export interface CapabilityContext {
    capabilities: CapabilityRegistry;
}
/** Reads a capability value off a context. Overloaded so the flag narrows the return. */
export interface CapabilityGetter<TValue> {
    (ctx: CapabilityContext): TValue;
    (ctx: CapabilityContext, opts: {
        optional: true;
    }): TValue | undefined;
}
/** Writes a capability value onto a context. */
export type CapabilityProvider<TValue> = (ctx: CapabilityContext, value: TValue) => void;
/**
 * A capability handle. It is BOTH a `[get, provide]` tuple (array-destructurable)
 * AND the identity used in middleware `requires`/`provides` declarations.
 *
 * Runtime identity is this object's reference. The `capabilityName` literal is
 * used for diagnostics and COMPILE-TIME tracking only — capability names MUST be
 * unique across an app or the type-level coverage check conflates them.
 */
export type Capability<TValue = unknown, TName extends string = string> = readonly [
    get: CapabilityGetter<TValue>,
    provide: CapabilityProvider<TValue>
] & {
    readonly capabilityName: TName;
    /** @internal Presence check for the post-setup assertion. */
    has: (ctx: CapabilityContext) => boolean;
};
/**
 * A capability handle with permissive value/name — for use as a constraint in
 * `requires`/`provides` arrays. Concentrates `any` in one named alias (same
 * convention as `AnyTextAdapter`/`AnyTool`); needed so `Capability<SpecificT>`
 * is assignable to the handle-array element type.
 */
export type CapabilityHandle = Capability<any, string>;
/**
 * Per-request bookkeeping: which capabilities were provided, plus the
 * duplicate-provide notification. Capability VALUES live in per-capability
 * WeakMaps (see `createCapability`), not here — this only tracks presence.
 */
export declare class CapabilityRegistry {
    private readonly provided;
    private onDuplicate?;
    /** Register a callback fired when a handle is provided more than once. */
    setOnDuplicate(cb: (name: string) => void): void;
    /** Record that `handle` was provided; fire the duplicate callback on repeats. */
    markProvided(handle: CapabilityHandle): void;
    has(handle: CapabilityHandle): boolean;
}
/**
 * Create a capability. Returns a hybrid handle that destructures to
 * `[get, provide]` and is itself the identity for `requires`/`provides`.
 *
 * Curried so the value type is supplied explicitly while the name literal is
 * INFERRED from the argument: `createCapability<T>()('name')`. (A single call
 * `createCapability<T>('name')` cannot work — supplying `T` explicitly stops
 * TypeScript inferring the name, collapsing it to `string` and defeating the
 * compile-time coverage check that keys on the literal name.)
 *
 * @example Provider + consumer middleware
 * ```ts
 * const counterCapability = createCapability<{ value: number }>()('counter')
 * const [getCounter, provideCounter] = counterCapability
 *
 * const withCounter = defineChatMiddleware({
 *   name: 'counter',
 *   provides: [counterCapability],
 *   setup(ctx) { provideCounter(ctx, { value: 0 }) },
 * })
 *
 * const readsCounter = defineChatMiddleware({
 *   name: 'reads-counter',
 *   requires: [counterCapability],
 *   onChunk(ctx) { getCounter(ctx).value++ },
 * })
 *
 * chat({ adapter, messages, middleware: [withCounter, readsCounter] })
 * ```
 *
 * @remarks Capability `name`s must be unique across your app: compile-time
 * coverage tracking keys on the name literal (runtime keys on reference).
 */
export declare function createCapability<TValue = unknown>(): <const TName extends string>(name: TName) => Capability<TValue, TName>;
