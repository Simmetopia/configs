//#region src/activities/chat/tools/schema-converter.ts
/**
* Build a JSONSchema object from any plain key/value source. The `JSONSchema`
* interface's `[key: string]: any` index signature makes every property
* assignable through bracket access without a type cast — copying keys here
* lets us narrow either `Record<string, unknown>` (returned by
* `~standard.jsonSchema.input()`) or a `JSONSchema` (from the SchemaInput
* pass-through arm) into the typed view used by the rest of this module.
*
* Accepts `object` so callers don't need a cast when narrowing from union
* types like `SchemaInput`.
*/
function toJsonSchema(obj) {
	const result = {};
	for (const [key, value] of Object.entries(obj)) {
		if (key === "$schema") continue;
		result[key] = value;
	}
	return result;
}
/**
* Whether a value can carry a `~standard` property. Most schema libraries
* (Zod, Valibot) return plain objects, but ArkType's `type()` returns a
* *callable function* with `~standard` attached — so `typeof` must accept
* both `'object'` and `'function'` or ArkType schemas are missed entirely
* (issue #276).
*/
function isPropertyCarrier(schema) {
	return (typeof schema === "object" || typeof schema === "function") && schema !== null;
}
/**
* Check if a value is a Standard JSON Schema compliant schema.
* Standard JSON Schema compliant libraries (Zod v4+, ArkType, Valibot with toStandardJsonSchema, etc.)
* implement the '~standard' property with jsonSchema converter methods.
*/
function isStandardJSONSchema(schema) {
	if (!isPropertyCarrier(schema) || !("~standard" in schema)) return false;
	const standard = schema["~standard"];
	if (typeof standard !== "object" || standard === null || !("version" in standard) || standard.version !== 1 || !("jsonSchema" in standard) || typeof standard.jsonSchema !== "object" || standard.jsonSchema === null || !("input" in standard.jsonSchema)) return false;
	return typeof standard.jsonSchema.input === "function";
}
/**
* Check if a value is a Standard Schema compliant schema (for validation).
* Standard Schema compliant libraries implement the '~standard' property with a validate function.
*/
function isStandardSchema(schema) {
	return isPropertyCarrier(schema) && "~standard" in schema && typeof schema["~standard"] === "object" && schema["~standard"] !== null && "version" in schema["~standard"] && schema["~standard"].version === 1 && "validate" in schema["~standard"] && typeof schema["~standard"].validate === "function";
}
/** Drop an empty map to `undefined` so leaf/no-op subtrees don't litter it. */
function pruneMap(map) {
	return Object.keys(map).length > 0 ? map : void 0;
}
function coerceArrayItems(items) {
	if (Array.isArray(items)) {
		const nested = items.map((item) => makeStructuredOutputCompatible(item, item.required || []));
		const itemMaps = nested.map((entry) => entry.nullWidening ?? {});
		return {
			schema: nested.map((entry) => entry.schema),
			itemMap: itemMaps.some((entry) => Object.keys(entry).length > 0) ? itemMaps : void 0
		};
	}
	const nested = makeStructuredOutputCompatible(items, items.required || []);
	return {
		schema: nested.schema,
		itemMap: nested.nullWidening
	};
}
/**
* Transform a JSON schema to be compatible with OpenAI's structured output requirements.
* OpenAI requires:
* - All properties must be in the `required` array
* - Optional fields should have null added to their type union
* - additionalProperties must be false for objects
*
* Alongside the transformed schema it returns a {@link NullWideningMap} marking
* exactly the positions where `null` was added, so `undoNullWidening` can strip
* those synthesized nulls (and only those) from the provider's response.
*
* @param schema - JSON schema to transform
* @param originalRequired - Original required array (to know which fields were optional)
* @returns Transformed schema + the null-widening map for the round trip
*/
function makeStructuredOutputCompatible(schema, originalRequired = []) {
	const result = { ...schema };
	const map = {};
	if (result.type === "object" && result.properties) {
		const properties = { ...result.properties };
		const allPropertyNames = Object.keys(properties);
		const propertyMaps = {};
		for (const propName of allPropertyNames) {
			const prop = properties[propName];
			if (!prop) continue;
			const wasOptional = !originalRequired.includes(propName);
			let widenedHere = false;
			let childMap;
			if (prop.type === "object" && prop.properties) {
				const nested = makeStructuredOutputCompatible(prop, prop.required || []);
				properties[propName] = wasOptional ? {
					...nested.schema,
					type: ["object", "null"]
				} : nested.schema;
				widenedHere = wasOptional;
				childMap = nested.nullWidening;
			} else if (prop.type === "array" && prop.items) {
				const nestedItems = coerceArrayItems(prop.items);
				properties[propName] = {
					...prop,
					items: nestedItems.schema,
					...wasOptional ? { type: ["array", "null"] } : {}
				};
				widenedHere = wasOptional;
				childMap = nestedItems.itemMap ? { items: nestedItems.itemMap } : void 0;
			} else if (wasOptional) {
				if (prop.type && !Array.isArray(prop.type)) {
					properties[propName] = {
						...prop,
						type: [prop.type, "null"]
					};
					widenedHere = true;
				} else if (Array.isArray(prop.type) && !prop.type.includes("null")) {
					properties[propName] = {
						...prop,
						type: [...prop.type, "null"]
					};
					widenedHere = true;
				}
			}
			if (widenedHere || childMap) propertyMaps[propName] = {
				...childMap ?? {},
				...widenedHere ? { widened: true } : {}
			};
		}
		result.properties = properties;
		result.required = allPropertyNames;
		result.additionalProperties = false;
		if (Object.keys(propertyMaps).length > 0) map.properties = propertyMaps;
	}
	if (result.type === "array" && result.items) {
		const nestedItems = coerceArrayItems(result.items);
		result.items = nestedItems.schema;
		if (nestedItems.itemMap) map.items = nestedItems.itemMap;
	}
	return {
		schema: result,
		nullWidening: pruneMap(map)
	};
}
/**
* Normalize any supported schema input to a typed, UN-widened `JSONSchema` —
* the shared first half of conversion, before any structured-output widening.
*
* - Standard JSON Schemas are rebuilt structurally (dropping `$schema`, which
*   LLM providers ignore) and given the explicit `type`/`properties`/`required`
*   defaults object shapes need downstream.
* - Plain `JSONSchema` inputs are rebuilt into the typed view; non-object inputs
*   are surfaced untouched (they can't be widened).
* - Standard Schema validators lacking a `~standard.jsonSchema` converter throw
*   with actionable guidance, rather than shipping `{ '~standard': … }` to the
*   provider and producing an opaque downstream error.
*/
function toTypedJsonSchema(schema) {
	if (isStandardJSONSchema(schema)) {
		const result = toJsonSchema(schema["~standard"].jsonSchema.input({ target: "draft-07" }));
		if ("properties" in result && !result.type) result.type = "object";
		if (result.type === "object" && !("properties" in result)) result.properties = {};
		if (result.type === "object" && !("required" in result)) result.required = [];
		return result;
	}
	if (isStandardSchema(schema)) throw new Error("Schema is a Standard Schema validator but does not expose a JSON Schema converter on `~standard.jsonSchema`. Use Zod v4.2+, ArkType v2.1.28+, or wrap a Valibot schema with `toStandardJsonSchema()` from `@valibot/to-json-schema` before passing it as `outputSchema`.");
	if (typeof schema !== "object") return schema;
	return toJsonSchema(schema);
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
function convertSchemaToJsonSchema(schema, options = {}) {
	if (!schema) return void 0;
	const { forStructuredOutput = false } = options;
	if (!forStructuredOutput && !isStandardJSONSchema(schema) && !isStandardSchema(schema)) return schema;
	const base = toTypedJsonSchema(schema);
	if (!base || typeof base !== "object") return base;
	if (!forStructuredOutput) return base;
	return makeStructuredOutputCompatible(base, base.required || []).schema;
}
/**
* Convert a schema for structured output AND capture the {@link NullWideningMap}
* recording every `null` the strict-mode widening synthesized. The map lets the
* caller undo that widening on the provider's response (via `undoNullWidening`)
* before validating against the original schema — optional fields read back as
* absent while genuine `.nullable()` nulls survive. The map is `undefined` when
* the schema isn't a widenable object or when no field needed widening.
*/
function convertSchemaForStructuredOutput(schema) {
	if (!schema) return {
		jsonSchema: void 0,
		nullWideningMap: void 0
	};
	const base = toTypedJsonSchema(schema);
	if (!base || typeof base !== "object") return {
		jsonSchema: base,
		nullWideningMap: void 0
	};
	const { schema: jsonSchema, nullWidening } = makeStructuredOutputCompatible(base, base.required || []);
	return {
		jsonSchema,
		nullWideningMap: nullWidening
	};
}
/**
* Validates data against a Standard Schema compliant schema.
*
* @param schema - Standard Schema compliant schema
* @param data - Data to validate
* @returns Validation result with success status, data or issues
*/
async function validateWithStandardSchema(schema, data) {
	if (!isStandardSchema(schema)) return {
		success: true,
		data
	};
	const result = await schema["~standard"].validate(data);
	if (!result.issues) return {
		success: true,
		data: result.value
	};
	return {
		success: false,
		issues: result.issues.map((issue) => ({
			message: issue.message || "Validation failed",
			path: issue.path?.map(String)
		}))
	};
}
/**
* Error thrown when Standard Schema validation fails. Carries the original
* `issues` array so consumers (middleware `onError`, callers catching from
* `chat({ outputSchema })`) can programmatically inspect each failure.
*/
var StandardSchemaValidationError = class extends Error {
	name = "StandardSchemaValidationError";
	issues;
	constructor(issues) {
		super(`Validation failed: ${issues.map((i) => i.message || "Validation failed").join(", ")}`);
		this.issues = issues;
	}
};
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
function parseWithStandardSchema(schema, data) {
	if (!isStandardSchema(schema)) return data;
	const result = schema["~standard"].validate(data);
	if (result instanceof Promise) throw new Error("Schema validation returned a Promise. Use validateWithStandardSchema for async validation.");
	if (!result.issues) return result.value;
	throw new StandardSchemaValidationError(result.issues);
}
//#endregion
export { StandardSchemaValidationError, convertSchemaForStructuredOutput, convertSchemaToJsonSchema, isStandardJSONSchema, isStandardSchema, parseWithStandardSchema, validateWithStandardSchema };

//# sourceMappingURL=schema-converter.js.map