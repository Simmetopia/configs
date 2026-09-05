/**
 * A hash function for interrupt bindings and resolution fingerprints. Receives
 * canonical JSON text and returns an opaque string. Must be deterministic; the
 * server compares hashes it computed against the ones in a binding, so the same
 * function has to run wherever a given binding is produced and checked.
 */
export type InterruptHash = (canonicalJson: string) => string;
/** The built-in default: SHA-256, prefixed so the algorithm is self-describing. */
export declare function defaultInterruptHash(canonicalJson: string): string;
export declare function canonicalInterruptJson(value: unknown): string;
export declare function digestInterruptJson(canonicalJson: string, hash?: InterruptHash): string;
export declare function cloneAndDeepFreezeJson<T>(value: T): T;
