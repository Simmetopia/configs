/**
 * Detect image mime type from base64 data using magic bytes.
 * Returns undefined if the format cannot be detected.
 *
 * This function analyzes the first few bytes of base64-encoded image data
 * to determine the image format based on file signature (magic bytes).
 *
 * @param base64Data - The base64-encoded image data
 * @returns The detected mime type, or undefined if unrecognized
 *
 * @example
 * ```ts
 * const mimeType = detectImageMimeType(imageBase64)
 * // Returns 'image/jpeg', 'image/png', 'image/gif', 'image/webp', or undefined
 * ```
 */
export declare function detectImageMimeType(base64Data: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | undefined;
