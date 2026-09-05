/**
 * Parse JSON from a model/harness assistant string.
 * Strips a wrapping markdown fence when the whole payload is fenced.
 * If the model wrote prose first, take the last JSON object or array.
 */
export declare function parseJsonFromAssistantText(raw: string): unknown;
export declare function appendOutputSchemaInstruction(prompt: string, schema: unknown): string;
