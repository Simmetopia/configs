/**
 * A BYOK provider declared by an adapter. `id` is the `x-byok-<id>` slug and
 * is required — `{ id?: string }` is not a {@link ByokProvider}.
 */
export interface ByokProvider<TId extends string = string> {
    readonly id: TId;
    readonly label: string;
    /**
     * Env var names the relay may read. Names only — never put `process.env`
     * values here. This object is imported on the client.
     */
    readonly env?: ReadonlyArray<string>;
}
/**
 * Input for {@link defineByokProvider}. `id` cannot be optional: if `TId`
 * includes `undefined`, `id` becomes `never` and the object is unassignable.
 */
export type ByokProviderInit<TId extends string> = {
    readonly id: undefined extends TId ? never : TId;
    readonly label: string;
    readonly env?: string | ReadonlyArray<string>;
};
export declare function defineByokProvider<const TId extends string>(provider: ByokProviderInit<TId>): ByokProvider<TId>;
