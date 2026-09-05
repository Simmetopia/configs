/**
 * Cross-runtime base64 helpers.
 *
 * Both `arrayBufferToBase64` and `base64ToArrayBuffer` prefer the new native
 * `Uint8Array.toBase64()` / `Uint8Array.fromBase64()` methods (TC39 base64
 * proposal, Stage 3) when available — they are significantly faster and more
 * memory-efficient than the byte-walking fallback. The fallbacks use Node's
 * `Buffer` when present, then `atob`/`btoa` for browser / edge runtimes.
 */
/**
 * Encode an `ArrayBuffer` as a base64 string.
 *
 * Note: callers should be cautious about feeding large buffers (more than a
 * few megabytes) on serverless / Workers runtimes — converting big media to
 * base64 multiplies its memory footprint by ~1.33× and frequently OOMs the
 * isolate.
 */
export declare function arrayBufferToBase64(buffer: ArrayBuffer): string;
/**
 * Decode a base64 string into a `Uint8Array`.
 */
export declare function base64ToUint8Array(base64: string): Uint8Array;
/**
 * Decode a base64 string into an `ArrayBuffer`.
 */
export declare function base64ToArrayBuffer(base64: string): ArrayBuffer;
