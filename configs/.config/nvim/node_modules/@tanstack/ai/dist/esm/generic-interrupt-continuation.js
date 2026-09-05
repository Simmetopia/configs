import { readUnopenedInterruptBinding } from "./interrupt-resume.js";
import { INTERRUPT_PAYLOAD_METADATA_KEY } from "./interrupt-definition.js";
//#region src/generic-interrupt-continuation.ts
/**
* `ResumeEntry.metadata` key for a first-party generic request.
*
* AG-UI `resume` only carries the answer (`interruptId`, `status`, `payload`).
* The original request rides here so an ephemeral server can rebuild it.
*/
var INTERRUPT_CONTINUATION_METADATA_KEY = "tanstack:interruptContinuation";
var INTERRUPT_CONTINUATION_VERSION = 1;
function isRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
function invalid(message) {
	return {
		status: "invalid",
		message
	};
}
/**
* Read one generic request from `resume[].metadata`.
*
* Missing key means this resume item is not a first-party generic continuation.
* A present key that fails the shape is a protocol error.
*/
function readGenericInterruptContinuation(metadata) {
	if (metadata === void 0) return { status: "absent" };
	if (!isRecord(metadata)) return invalid("Generic interrupt resume metadata must be an object.");
	if (!Object.prototype.hasOwnProperty.call(metadata, "tanstack:interruptContinuation")) return { status: "absent" };
	const raw = metadata[INTERRUPT_CONTINUATION_METADATA_KEY];
	if (!isRecord(raw)) return invalid("Generic interrupt continuation is invalid.");
	if (raw.v !== 1 || typeof raw.definitionId !== "string" || typeof raw.key !== "string" || typeof raw.reason !== "string" || typeof raw.message !== "string" || typeof raw.batchIndex !== "number" || !Number.isInteger(raw.batchIndex) || raw.batchIndex < 0 || raw.responseSchemaHash !== void 0 && typeof raw.responseSchemaHash !== "string" || raw.expiresAt !== void 0 && typeof raw.expiresAt !== "string" || raw.payloadSchemaHash !== void 0 && typeof raw.payloadSchemaHash !== "string") return invalid("Generic interrupt continuation contains invalid fields.");
	return {
		status: "ok",
		value: {
			v: 1,
			definitionId: raw.definitionId,
			key: raw.key,
			batchIndex: raw.batchIndex,
			reason: raw.reason,
			message: raw.message,
			...typeof raw.expiresAt === "string" ? { expiresAt: raw.expiresAt } : {},
			...typeof raw.responseSchemaHash === "string" ? { responseSchemaHash: raw.responseSchemaHash } : {},
			...typeof raw.payloadSchemaHash === "string" ? { payloadSchemaHash: raw.payloadSchemaHash } : {},
			...Object.prototype.hasOwnProperty.call(raw, "payload") ? { payload: raw.payload } : {}
		}
	};
}
/** Put a parsed continuation on `ResumeEntry.metadata`. */
function wrapGenericInterruptContinuation(continuation) {
	return { [INTERRUPT_CONTINUATION_METADATA_KEY]: continuation };
}
/**
* Build the resume-metadata continuation from an outbound AG-UI interrupt.
*
* Returns `undefined` when the descriptor is not a first-party generic item.
*/
function genericInterruptContinuationFromDescriptor(interrupt) {
	const binding = readUnopenedInterruptBinding(interrupt);
	if (binding?.kind !== "generic" || binding.definitionId === void 0 || binding.key === void 0 || binding.batchIndex === void 0) return;
	const metadata = isRecord(interrupt.metadata) ? interrupt.metadata : void 0;
	const hasPayload = metadata !== void 0 && Object.prototype.hasOwnProperty.call(metadata, "tanstack:interruptPayload");
	return {
		v: 1,
		definitionId: binding.definitionId,
		key: binding.key,
		batchIndex: binding.batchIndex,
		reason: interrupt.reason,
		message: interrupt.message ?? "",
		...interrupt.expiresAt !== void 0 ? { expiresAt: interrupt.expiresAt } : {},
		...binding.responseSchemaHash !== void 0 ? { responseSchemaHash: binding.responseSchemaHash } : {},
		...binding.payloadSchemaHash !== void 0 ? { payloadSchemaHash: binding.payloadSchemaHash } : {},
		...hasPayload ? { payload: metadata[INTERRUPT_PAYLOAD_METADATA_KEY] } : {}
	};
}
//#endregion
export { INTERRUPT_CONTINUATION_METADATA_KEY, INTERRUPT_CONTINUATION_VERSION, genericInterruptContinuationFromDescriptor, readGenericInterruptContinuation, wrapGenericInterruptContinuation };

//# sourceMappingURL=generic-interrupt-continuation.js.map