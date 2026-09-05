import { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec';
import { NullWideningMap } from '@tanstack/ai-utils';
import { JSONSchema, SchemaInput } from '../../../types.js';
/**
 * Check if a value is a Standard JSON Schema compliant schema.
 * Standard JSON Schema compliant libraries (Zod v4+, ArkType, Valibot with toStandardJsonSchema, etc.)
 * implement the '~standard' property with jsonSchema converter methods.
 */
export declare function isStandardJSONSchema(schema: unknown): schema is StandardJSONSchemaV1;
/**
 * Check if a value is a Standard Schema compliant schema (for validation).
 * Standard Schema compliant libraries implement the '~standard' property with a validate function.
 */
export declare function isStandardSchema(schema: unknown): schema is StandardSchemaV1;
/**
 * Options for schema conversion
 */
export interface ConvertSchemaOptions {
    /**
     * When true, transforms the schema to be compatible with OpenAI's structured output requirements:
     * - All properties are added to the `required` array
     * - Optional fields get null added to their type union
     * - additionalProperties is set to false for all objects
     *
     * @default false
     */
    forStructuredOutput?: boolean;
}
/**
 * Converts a Standard JSON Schema compliant schema or plain JSONSchema to JSON Schema format
 * compatible with LLM providers.
 *
 * Supports any schema library that implements the Standard JSON Schema spec (v1):
 * - Zod v4+ (natively supports StandardJSONSchemaV1)
 * - ArkType (natively supports StandardJSONSchemaV1)
 * - Valibot (via `toStandardJsonSchema()` from `@valibot/to-json-schema`)
 *
 * If the input is already a plain JSONSchema object, it is returned as-is.
 *
 * @param schema - Standard JSON Schema compliant schema or plain JSONSchema object to convert
 * @param options - Conversion options
 * @returns JSON Schema object that can be sent to LLM providers
 *
 * @example
 * ```typescript
 * // Using Zod v4+ (natively supports Standard JSON Schema)
 * import * as z from 'zod';
 *
 * const zodSchema = z.object({
 *   location: z.string().describe('City name'),
 *   unit: z.enum(['celsius', 'fahrenheit']).optional()
 * });
 *
 * const jsonSchema = convertSchemaToJsonSchema(zodSchema);
 *
 * @example
 * // Using ArkType (natively supports Standard JSON Schema)
 * import { type } from 'arktype';
 *
 * const arkSchema = type({
 *   location: 'string',
 *   unit: "'celsius' | 'fahrenheit'"
 * });
 *
 * const jsonSchema = convertSchemaToJsonSchema(arkSchema);
 *
 * @example
 * // Using Valibot (via toStandardJsonSchema)
 * import * as v from 'valibot';
 * import { toStandardJsonSchema } from '@valibot/to-json-schema';
 *
 * const valibotSchema = toStandardJsonSchema(v.object({
 *   location: v.string(),
 *   unit: v.optional(v.picklist(['celsius', 'fahrenheit']))
 * }));
 *
 * const jsonSchema = convertSchemaToJsonSchema(valibotSchema);
 *
 * @example
 * // Using JSONSchema directly (passes through unchanged)
 * const rawSchema = {
 *   type: 'object',
 *   properties: { location: { type: 'string' } },
 *   required: ['location']
 * };
 * const result = convertSchemaToJsonSchema(rawSchema);
 * ```
 */
export declare function convertSchemaToJsonSchema(schema: SchemaInput | undefined, options?: ConvertSchemaOptions): JSONSchema | undefined;
/**
 * Convert a schema for structured output AND capture the {@link NullWideningMap}
 * recording every `null` the strict-mode widening synthesized. The map lets the
 * caller undo that widening on the provider's response (via `undoNullWidening`)
 * before validating against the original schema — optional fields read back as
 * absent while genuine `.nullable()` nulls survive. The map is `undefined` when
 * the schema isn't a widenable object or when no field needed widening.
 */
export declare function convertSchemaForStructuredOutput(schema: SchemaInput | undefined): {
    jsonSchema: JSONSchema | undefined;
    nullWideningMap: NullWideningMap | undefined;
};
/**
 * Validates data against a Standard Schema compliant schema.
 *
 * @param schema - Standard Schema compliant schema
 * @param data - Data to validate
 * @returns Validation result with success status, data or issues
 */
export declare function validateWithStandardSchema<T>(schema: unknown, data: unknown): Promise<{
    success: true;
    data: T;
} | {
    success: false;
    issues: Array<{
        message: string;
        path?: Array<string> | undefined;
    }>;
}>;
/**
 * Error thrown when Standard Schema validation fails. Carries the original
 * `issues` array so consumers (middleware `onError`, callers catching from
 * `chat({ outputSchema })`) can programmatically inspect each failure.
 */
export declare class StandardSchemaValidationError extends Error {
    readonly name = "StandardSchemaValidationError";
    readonly issues: ReadonlyArray<StandardSchemaV1.Issue>;
    constructor(issues: ReadonlyArray<StandardSchemaV1.Issue>);
}
/**
 * Synchronously validates data against a Standard Schema compliant schema.
 * Note: Some Standard Schema implementations may only support async validation.
 * In those cases, this function will throw.
 *
 * @param schema - Standard Schema compliant schema
 * @param data - Data to validate
 * @returns Parsed/validated data
 * @throws StandardSchemaValidationError if validation fails; Error if the
 *         schema only supports async validation.
 */
export declare function parseWithStandardSchema<T>(schema: unknown, data: unknown): T;
