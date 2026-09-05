/**
 * Return the first candidate that is a finite `number`, or `undefined`.
 *
 * Handy for picking a value from among several possible spellings/sources where
 * only some are populated — e.g. the provider-native sampling option names read
 * by the OTel middleware, or the optional numeric fields on `TokenUsage`.
 */
export declare function firstNumber(...candidates: Array<unknown>): number | undefined;
