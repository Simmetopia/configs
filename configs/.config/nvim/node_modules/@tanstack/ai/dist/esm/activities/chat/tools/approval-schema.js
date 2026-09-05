import { canonicalInterruptJson, digestInterruptJson } from "../../../interrupt-serialization.js";
import { isStandardJSONSchema, isStandardSchema } from "./schema-converter.js";
//#region src/activities/chat/tools/approval-schema.ts
var jsonSchemaKeywords = /* @__PURE__ */ new Set([
	"$schema",
	"$id",
	"$ref",
	"$defs",
	"type",
	"properties",
	"required",
	"additionalProperties",
	"items",
	"oneOf",
	"anyOf",
	"allOf",
	"enum",
	"const",
	"format",
	"minimum",
	"maximum",
	"minLength",
	"maxLength",
	"pattern"
]);
function isPlainRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
function isRawJsonSchema(value) {
	return isPlainRecord(value) && Object.keys(value).some((key) => jsonSchemaKeywords.has(key));
}
function isSchemaInput(value) {
	return isStandardSchema(value) || isStandardJSONSchema(value) || isRawJsonSchema(value);
}
function isApprovalBranchMap(value) {
	if (!isPlainRecord(value)) return false;
	const keys = Object.keys(value);
	return keys.length > 0 && keys.every((key) => key === "approve" || key === "reject") && keys.every((key) => isSchemaInput(value[key]));
}
function toJsonSchema(value) {
	const result = {};
	for (const [key, item] of Object.entries(value)) result[key] = item;
	return result;
}
function schemaToWire(schema) {
	if (isStandardSchema(schema)) {
		const jsonSchema = isStandardJSONSchema(schema) ? toJsonSchema(schema["~standard"].jsonSchema.input({ target: "draft-2020-12" })) : void 0;
		return {
			source: schema,
			validator: schema,
			...jsonSchema !== void 0 && { jsonSchema }
		};
	}
	if (isRawJsonSchema(schema)) return {
		source: schema,
		jsonSchema: schema
	};
	throw new TypeError("Expected a supported SchemaInput.");
}
function decisionEnvelope(input) {
	const properties = { approved: { const: input.approved } };
	const required = ["approved"];
	if (input.approved && input.inputSchema) properties["editedArgs"] = input.inputSchema.jsonSchema ?? {};
	if (input.payload) {
		properties["payload"] = input.payload.jsonSchema ?? {};
		required.push("payload");
	}
	return {
		type: "object",
		properties,
		required,
		additionalProperties: false
	};
}
function normalizeApprovalSchema(approvalSchema, inputSchema) {
	const normalizedInput = inputSchema === void 0 ? null : schemaToWire(inputSchema);
	let approve = null;
	let reject = null;
	if (approvalSchema !== void 0) {
		if (isStandardSchema(approvalSchema) || isRawJsonSchema(approvalSchema)) {
			approve = schemaToWire(approvalSchema);
			reject = approve;
		} else if (isApprovalBranchMap(approvalSchema)) {
			approve = approvalSchema.approve === void 0 ? null : schemaToWire(approvalSchema.approve);
			reject = approvalSchema.reject === void 0 ? null : schemaToWire(approvalSchema.reject);
		} else throw new TypeError("approvalSchema must be a SchemaInput or a nonempty map containing approve or reject.");
	}
	const responseSchema = { oneOf: [decisionEnvelope({
		approved: true,
		payload: approve,
		inputSchema: normalizedInput
	}), decisionEnvelope({
		approved: false,
		payload: reject,
		inputSchema: null
	})] };
	const responseCanonical = canonicalInterruptJson(responseSchema);
	const approvalCanonical = canonicalInterruptJson({
		approve: approve?.jsonSchema ?? null,
		reject: reject?.jsonSchema ?? null
	});
	return {
		branches: {
			approve,
			reject
		},
		responseSchema,
		responseSchemaHash: digestInterruptJson(responseCanonical),
		approvalSchemaHash: digestInterruptJson(approvalCanonical)
	};
}
function hashSchemaInput(schema) {
	if (schema === void 0) return digestInterruptJson("undefined");
	const identity = schemaToWire(schema).jsonSchema ?? { standardValidator: "unserialized" };
	return digestInterruptJson(canonicalInterruptJson(identity));
}
//#endregion
export { hashSchemaInput, normalizeApprovalSchema };

//# sourceMappingURL=approval-schema.js.map