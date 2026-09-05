import { TanStackMessageMetadata, TanStackRunMetadata } from '../types.js';
export type MetadataRecord = Record<string, any>;
/** `metadata.tanstack` on a message or run event. Internal getter return type. */
export type TanStackMetadata = TanStackMessageMetadata & TanStackRunMetadata;
export declare function mergeMetadata(current: MetadataRecord | undefined, incoming: MetadataRecord | null | undefined): MetadataRecord | undefined;
/** Read `metadata.tanstack`. Not part of the public SDK surface. */
export declare function tanstackMetadata(value: {
    metadata?: MetadataRecord | null;
} | MetadataRecord | undefined): TanStackMetadata | undefined;
export declare function withTanstackMetadata<T>(value: T & {
    metadata?: MetadataRecord | null;
}, tanstack: MetadataRecord): Omit<T, 'metadata'> & {
    metadata: MetadataRecord;
};
