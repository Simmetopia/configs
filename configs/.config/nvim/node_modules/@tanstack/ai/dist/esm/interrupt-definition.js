import { canonicalInterruptJson, cloneAndDeepFreezeJson, digestInterruptJson } from "./interrupt-serialization.js";
import "./interrupts.js";
import { isStandardJSONSchema, isStandardSchema } from "./activities/chat/tools/schema-converter.js";
//#region src/interrupt-definition.ts
var INTERRUPT_PAYLOAD_METADATA_KEY = "tanstack:interruptPayload";
var INTERRUPT_BINDING_KIND = "generic";
var definitionSchemaState = /* @__PURE__ */ new WeakMap();
function createInterruptBinding(request, fields = {}) {
	const schemaState = definitionSchemaState.get(request.definition);
	if (!schemaState) throw new TypeError("Interrupt definition schema state is unavailable.");
	const { threadId, interruptedRunId, generation, batchIndex } = fields;
	return {
		descriptor: {
			v: 1,
			kind: INTERRUPT_BINDING_KIND,
			definitionId: request.definition.id,
			key: request.key,
			...threadId !== void 0 ? { threadId } : {},
			...interruptedRunId !== void 0 ? { interruptedRunId } : {},
			...generation !== void 0 ? { generation } : {},
			...batchIndex !== void 0 ? { batchIndex } : {},
			...schemaState.responseSchemaCanonicalJson ? { responseSchemaCanonicalJson: schemaState.responseSchemaCanonicalJson } : {},
			...schemaState.payloadSchemaCanonicalJson ? { payloadSchemaCanonicalJson: schemaState.payloadSchemaCanonicalJson } : {},
			...schemaState.payloadSchemaHash ? { payloadSchemaHash: schemaState.payloadSchemaHash } : {},
			...schemaState.responseSchemaHash ? { responseSchemaHash: schemaState.responseSchemaHash } : {}
		},
		..."payload" in request && request.payload !== void 0 ? { payload: request.payload } : {}
	};
}
var interruptRequestFactories = /* @__PURE__ */ new WeakMap();
var interruptRequestInputs = /* @__PURE__ */ new WeakMap();
/**
* Returns the schema input captured for a newly emitted request. This is
* internal because continuation state can cross a client boundary and must be
* parsed again when it returns to the server.
*/
function getInterruptRequestInput(request) {
	const input = interruptRequestInputs.get(request);
	if (!input) throw new TypeError("Interrupt request input is unavailable.");
	return input;
}
/**
* Rebuild a request from a persisted display payload that has already passed
* the definition's payload schema. This is internal because callers must not
* bypass public input validation for new requests.
*/
function rehydrateInterruptRequest(definition, input) {
	const factory = interruptRequestFactories.get(definition);
	if (!factory) throw new TypeError("Interrupt definition request factory is unavailable.");
	return factory(input, true);
}
function schemaJson(schema, name) {
	if (!isStandardJSONSchema(schema)) throw new TypeError(`${name} must be a Standard Schema with a JSON Schema converter.`);
	try {
		const exported = schema["~standard"].jsonSchema.input({ target: "draft-07" });
		if (exported === void 0) throw new TypeError("The exported schema is undefined.");
		if (typeof exported === "function") throw new TypeError("The exported schema must not be a function.");
		if (Array.isArray(exported)) throw new TypeError("The exported schema must be a plain JSON object.");
		if (!exported || typeof exported !== "object" || ![Object.prototype, null].includes(Object.getPrototypeOf(exported))) throw new TypeError("The exported schema must be a plain JSON object.");
		const converted = {};
		for (const [key, value] of Object.entries(exported)) if (key !== "$schema") converted[key] = value;
		return {
			json: converted,
			canonicalJson: canonicalInterruptJson(converted)
		};
	} catch (error) {
		throw new TypeError(`${name} could not export compatible JSON Schema: ${error instanceof Error ? error.message : String(error)}`);
	}
}
/** Same hash the producer stamps on a first-party generic binding. */
function hashInterruptDefinitionSchema(schema) {
	return digestInterruptJson(schemaJson(schema, "Interrupt schema").canonicalJson);
}
function validateJson(value, label) {
	try {
		canonicalInterruptJson(value);
	} catch (error) {
		throw new TypeError(`${label} must be JSON-compatible: ${error instanceof Error ? error.message : String(error)}`);
	}
}
function validateNonEmptyString(value, label) {
	if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} must be a non-empty string.`);
	return value;
}
function validateExpiresAt(value) {
	if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new TypeError("Interrupt expiresAt must be a valid date string.");
	return value;
}
function isPromiseLike(value) {
	return value !== null && (typeof value === "object" || typeof value === "function") && "then" in value && typeof value.then === "function";
}
function parseInterruptPayload(schema, value) {
	if (!isStandardSchema(schema)) return value;
	const result = schema["~standard"].validate(value);
	if (isPromiseLike(result)) throw new TypeError("Interrupt payloadSchema validation must be synchronous.");
	if (result.issues !== void 0) throw new TypeError(`Interrupt payload is invalid: ${result.issues.map((issue) => issue.message).join(" ")}`);
	return result.value;
}
function defineInterrupt(options) {
	validateNonEmptyString(options.id, "Interrupt definition id");
	const responseJson = options.responseSchema !== void 0 ? schemaJson(options.responseSchema, "responseSchema") : void 0;
	const hasPayloadSchema = Object.prototype.hasOwnProperty.call(options, "payloadSchema");
	const payloadJson = hasPayloadSchema ? schemaJson(options.payloadSchema, "payloadSchema") : void 0;
	const schemaState = {
		...responseJson ? {
			responseSchemaCanonicalJson: responseJson.canonicalJson,
			responseSchemaHash: digestInterruptJson(responseJson.canonicalJson)
		} : {},
		...payloadJson ? {
			payloadSchemaCanonicalJson: payloadJson.canonicalJson,
			payloadSchemaHash: digestInterruptJson(payloadJson.canonicalJson)
		} : {}
	};
	const definition = {
		id: options.id,
		payloadSchema: options.payloadSchema,
		responseSchema: options.responseSchema,
		interrupt(input) {
			return createRequest(input, false);
		}
	};
	const parsePayload = (payload) => {
		const payloadSchema = options.payloadSchema;
		if (payloadSchema === void 0) throw new TypeError("This interrupt definition does not accept a payload.");
		return parseInterruptPayload(payloadSchema, payload);
	};
	const createRequest = (input, payloadIsParsed) => {
		for (const key of Object.keys(input)) if (![
			"key",
			"payload",
			"reason",
			"message",
			"expiresAt"
		].includes(key)) throw new TypeError(`Interrupt input field ${key} is not allowed.`);
		const key = validateNonEmptyString(input.key, "Interrupt key");
		const reason = validateNonEmptyString(input.reason, "Interrupt reason");
		const message = validateNonEmptyString(input.message, "Interrupt message");
		if ("payload" in input) {
			if (!hasPayloadSchema) throw new TypeError("This interrupt definition does not accept a payload.");
			if (input.payload !== void 0) validateJson(input.payload, "Interrupt payload");
		}
		const parsedPayload = "payload" in input ? payloadIsParsed ? input.payload : parsePayload(input.payload) : void 0;
		const payload = parsedPayload === void 0 ? void 0 : cloneAndDeepFreezeJson(parsedPayload);
		const expiresAt = input.expiresAt === void 0 ? void 0 : validateExpiresAt(input.expiresAt);
		const request = Object.freeze({
			definition,
			key,
			...hasPayloadSchema && payload !== void 0 ? { payload } : {},
			reason,
			message,
			...expiresAt !== void 0 ? { expiresAt } : {}
		});
		if (!payloadIsParsed) interruptRequestInputs.set(request, cloneAndDeepFreezeJson({
			key,
			reason,
			message,
			...expiresAt !== void 0 ? { expiresAt } : {},
			...parsedPayload !== void 0 ? { payload: parsedPayload } : {}
		}));
		return request;
	};
	definitionSchemaState.set(definition, schemaState);
	interruptRequestFactories.set(definition, createRequest);
	return Object.freeze(definition);
}
//#endregion
export { INTERRUPT_BINDING_KIND, INTERRUPT_PAYLOAD_METADATA_KEY, createInterruptBinding, defineInterrupt, getInterruptRequestInput, hashInterruptDefinitionSchema, rehydrateInterruptRequest };

//# sourceMappingURL=interrupt-definition.js.map