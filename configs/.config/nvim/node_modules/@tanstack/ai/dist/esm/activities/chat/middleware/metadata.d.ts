/**
 * Namespaced key/value store for app and middleware metadata.
 *
 * `(namespace, key)` is the composite identity. Keep both values separate;
 * joining them with a delimiter can create collisions.
 */
export interface MetadataStore {
    /** Return the value for `(namespace, key)`, or `null` when it is absent. */
    get: (namespace: string, key: string) => Promise<unknown | null>;
    /** Insert or replace the value for `(namespace, key)`. */
    set: (namespace: string, key: string, value: unknown) => Promise<void>;
    /** Delete `(namespace, key)`. Do nothing when it is absent. */
    delete: (namespace: string, key: string) => Promise<void>;
}
export declare const MetadataCapability: import('./capabilities.js').Capability<MetadataStore, "metadata">;
export declare const getMetadata: import('./capabilities.js').CapabilityGetter<MetadataStore>, provideMetadata: import('./capabilities.js').CapabilityProvider<MetadataStore>;
