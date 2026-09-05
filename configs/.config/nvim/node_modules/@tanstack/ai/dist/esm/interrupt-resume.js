import { canonicalInterruptJson, digestInterruptJson } from "./interrupt-serialization.js";
import { canonicalizeInterruptResolutions } from "./interrupts.js";
import { isStandardSchema, validateWithStandardSchema } from "./activities/chat/tools/schema-converter.js";
import { hashSchemaInput, normalizeApprovalSchema } from "./activities/chat/tools/approval-schema.js";
//#region src/interrupt-resume.ts
/**
* The `Interrupt.metadata` key under which this package's resume binding
* travels.
*
* Exported so anything that produces an interrupt this package must later
* resume — an application middleware raising a generic pause, a future
* workflow-to-AG-UI projection — attaches the binding through
* {@link withInterruptBinding} rather than copying the string. Everything
* outside this key is the plain AG-UI envelope and is left untouched.
*/
var INTERRUPT_BINDING_METADATA_KEY = "tanstack:interruptBinding";
var interruptBindingMetadataKey = INTERRUPT_BINDING_METADATA_KEY;
var InterruptResumeValidationError = class extends Error {
	errors;
	name = "InterruptResumeValidationError";
	constructor(errors) {
		super(errors.map((error) => error.message).join(" "));
		this.errors = errors;
	}
};
function objectValue(value) {
	return value && typeof value === "object" ? value : null;
}
function stringField(value, key) {
	return typeof value[key] === "string" ? value[key] : void 0;
}
function normalizeIssuePath(path) {
	if (!path) return void 0;
	return path.map((segment) => {
		if (typeof segment === "string" || typeof segment === "number") return segment;
		const key = objectValue(segment)?.key;
		return typeof key === "number" ? key : String(key ?? segment);
	});
}
function interruptItemError(input, interruptId, code, message, options) {
	return {
		scope: "item",
		threadId: input.threadId,
		interruptedRunId: input.interruptedRunId,
		generation: input.generation,
		interruptId,
		code,
		message,
		source: options?.source ?? "client",
		retryable: options?.retryable ?? false,
		...options?.path ? { path: options.path } : {}
	};
}
async function validateSchemaValue(input) {
	if (isStandardSchema(input.schema)) {
		const result = await validateWithStandardSchema(input.schema, input.value);
		if (!result.success) for (const issue of result.issues) input.onIssue(issue.message, normalizeIssuePath(issue.path));
		return;
	}
}
function runtimeTool(tools, name) {
	return tools.find((tool) => tool.name === name);
}
async function parseSchemaValue(schema, value) {
	if (!isStandardSchema(schema)) return {
		success: true,
		data: value
	};
	const result = await validateWithStandardSchema(schema, value);
	return result.success ? {
		success: true,
		data: result.data
	} : { success: false };
}
function descriptorResponseSchema(record) {
	return objectValue(record.payload)?.responseSchema;
}
function schemaHash(schema) {
	return digestInterruptJson(canonicalInterruptJson(schema));
}
async function pushSchemaIssues(input) {
	try {
		await validateSchemaValue({
			schema: input.schema,
			value: input.value,
			onIssue: (message, path) => {
				input.errors.push(interruptItemError(input.request, input.interruptId, input.code, `${input.label}: ${message}`, { path }));
			}
		});
	} catch (error) {
		input.errors.push(interruptItemError(input.request, input.interruptId, "invalid-response-schema", `${input.label} could not be validated: ${error instanceof Error ? error.message : String(error)}`, { source: "server" }));
	}
}
function validateDescriptorSchema(input, record, binding, errors) {
	const schema = descriptorResponseSchema(record);
	const responseSchemaHash = binding.responseSchemaHash;
	if (schema === void 0 && responseSchemaHash === void 0) return;
	if (schema === void 0 || responseSchemaHash === void 0 || schemaHash(schema) !== responseSchemaHash) errors.push(interruptItemError(input, record.interruptId, "invalid-response-schema", `Interrupt ${record.interruptId} response schema no longer matches its binding.`, { source: "server" }));
	return schema;
}
/**
* Validate and translate a complete interrupt batch before any tool executes.
* Used by ephemeral chat resume; a durable layer may share the same validator.
*/
async function validateInterruptResumeBatch(input) {
	const grouped = /* @__PURE__ */ new Map();
	const batchErrors = [];
	const group = (interruptId) => {
		const existing = grouped.get(interruptId);
		if (existing) return existing;
		const created = [];
		grouped.set(interruptId, created);
		return created;
	};
	const pendingById = new Map(input.pending.map((record) => [record.interruptId, record]));
	const resumeById = /* @__PURE__ */ new Map();
	const counts = /* @__PURE__ */ new Map();
	for (const entry of input.resume ?? []) {
		counts.set(entry.interruptId, (counts.get(entry.interruptId) ?? 0) + 1);
		if (!resumeById.has(entry.interruptId)) resumeById.set(entry.interruptId, entry);
	}
	for (const [interruptId, count] of counts) if (count > 1) group(interruptId).push(interruptItemError(input, interruptId, "conflict", `Interrupt ${interruptId} has duplicate resume entries.`));
	const pendingGenerics = input.pending.filter((record) => record.binding.kind === "generic");
	const genericBatchSatisfied = pendingGenerics.length > 0 && pendingGenerics.every((record) => resumeById.has(record.interruptId));
	let incomplete = false;
	for (const record of input.pending) {
		const errors = group(record.interruptId);
		const entry = resumeById.get(record.interruptId);
		const binding = record.binding;
		if (!entry) {
			if (genericBatchSatisfied && binding.kind === "client-tool-execution") continue;
			incomplete = true;
			errors.push(interruptItemError(input, record.interruptId, "unknown-interrupt", `Missing resume entry for interrupt ${record.interruptId}.`));
		}
		if (binding.interruptedRunId !== input.interruptedRunId || binding.generation !== input.generation || binding.interruptId !== record.interruptId) errors.push(interruptItemError(input, record.interruptId, "stale", `Interrupt ${record.interruptId} has stale correlation metadata.`, { source: "server" }));
		if (binding.expiresAt !== void 0) {
			const expiresAt = Date.parse(binding.expiresAt);
			if (!Number.isFinite(expiresAt)) errors.push(interruptItemError(input, record.interruptId, "invalid-payload", `Interrupt ${record.interruptId} has an invalid expiresAt.`, { source: "server" }));
			else if (expiresAt <= (input.now ?? Date.now())) errors.push(interruptItemError(input, record.interruptId, "expired", `Interrupt ${record.interruptId} has expired.`, { source: "server" }));
		}
		const responseSchema = validateDescriptorSchema(input, record, binding, errors);
		if (!entry) continue;
		const entryStatus = entry.status;
		if (entryStatus !== "resolved" && entryStatus !== "cancelled") {
			errors.push(interruptItemError(input, record.interruptId, "invalid-payload", `Interrupt ${record.interruptId} has invalid status ${String(entryStatus)}.`));
			continue;
		}
		if (binding.kind === "generic") {
			const genericRequest = record.genericRequest;
			if (genericRequest !== void 0) {
				const batchIndex = binding.batchIndex;
				if (binding.definitionId !== genericRequest.definition.id || binding.key !== genericRequest.key || binding.interruptId !== record.interruptId || batchIndex === void 0 || !Number.isInteger(batchIndex) || batchIndex < 0) errors.push(interruptItemError(input, record.interruptId, "stale", `Generic interrupt ${record.interruptId} has stale definition metadata.`, { source: "server" }));
			}
			if (entry.status === "cancelled") {
				if (entry.payload !== void 0) errors.push(interruptItemError(input, record.interruptId, "invalid-payload", `Cancelled interrupt ${record.interruptId} must not include a payload.`));
			} else if (genericRequest !== void 0) await pushSchemaIssues({
				request: input,
				errors,
				interruptId: record.interruptId,
				schema: genericRequest.definition.responseSchema,
				value: entry.payload,
				code: "invalid-payload",
				label: `Interrupt ${record.interruptId} payload is invalid`
			});
			else if (responseSchema !== void 0) await pushSchemaIssues({
				request: input,
				errors,
				interruptId: record.interruptId,
				schema: responseSchema,
				value: entry.payload,
				code: "invalid-payload",
				label: `Interrupt ${record.interruptId} payload is invalid`
			});
			continue;
		}
		if (entry.status === "cancelled") {
			if (entry.payload !== void 0) errors.push(interruptItemError(input, record.interruptId, "invalid-payload", `Cancelled interrupt ${record.interruptId} must not include a payload.`));
			continue;
		}
		const tool = runtimeTool(input.tools, binding.toolName);
		if (!tool) {
			errors.push(interruptItemError(input, record.interruptId, "stale", `Tool ${binding.toolName} is unavailable for interrupt ${record.interruptId}.`, { source: "server" }));
			continue;
		}
		let approval;
		let schemaDrifted = false;
		if (binding.kind === "client-tool-execution") {
			if (hashSchemaInput(tool.outputSchema) !== binding.outputSchemaHash) {
				errors.push(interruptItemError(input, record.interruptId, "stale", `Tool ${binding.toolName} output schema has changed.`, { source: "server" }));
				schemaDrifted = true;
			}
		} else {
			try {
				approval = normalizeApprovalSchema(tool.approvalSchema, tool.inputSchema);
			} catch {
				errors.push(interruptItemError(input, record.interruptId, "stale", `Tool ${binding.toolName} approval schema is unavailable.`, { source: "server" }));
				schemaDrifted = true;
			}
			if (approval !== void 0 && (hashSchemaInput(tool.inputSchema) !== binding.inputSchemaHash || approval.approvalSchemaHash !== binding.approvalSchemaHash || approval.responseSchemaHash !== binding.responseSchemaHash)) {
				errors.push(interruptItemError(input, record.interruptId, "stale", `Tool ${binding.toolName} approval schema has changed.`, { source: "server" }));
				schemaDrifted = true;
			}
		}
		if (schemaDrifted) continue;
		if (binding.kind === "client-tool-execution") {
			if (responseSchema !== void 0) await pushSchemaIssues({
				request: input,
				errors,
				interruptId: record.interruptId,
				schema: responseSchema,
				value: entry.payload,
				code: "invalid-tool-output",
				label: `Tool ${binding.toolName} output is invalid`
			});
			if (tool.outputSchema !== void 0) await pushSchemaIssues({
				request: input,
				errors,
				interruptId: record.interruptId,
				schema: tool.outputSchema,
				value: entry.payload,
				code: "invalid-tool-output",
				label: `Tool ${binding.toolName} output is invalid`
			});
			continue;
		}
		if (approval === void 0) continue;
		const envelope = objectValue(entry.payload);
		const approved = typeof entry.payload === "boolean" ? entry.payload : typeof envelope?.approved === "boolean" ? envelope.approved : void 0;
		if (approved === void 0) {
			errors.push(interruptItemError(input, record.interruptId, "invalid-payload", `Approval ${record.interruptId} must be a boolean or decision envelope.`));
			continue;
		}
		if (envelope) await pushSchemaIssues({
			request: input,
			errors,
			interruptId: record.interruptId,
			schema: approval.responseSchema,
			value: entry.payload,
			code: "invalid-payload",
			label: `Approval ${record.interruptId} envelope is invalid`
		});
		if (approved && envelope?.editedArgs !== void 0) {
			if (tool.inputSchema === void 0) errors.push(interruptItemError(input, record.interruptId, "invalid-edited-args", `Approval ${record.interruptId} cannot edit arguments without an input schema.`));
			else await pushSchemaIssues({
				request: input,
				errors,
				interruptId: record.interruptId,
				schema: tool.inputSchema,
				value: envelope.editedArgs,
				code: "invalid-edited-args",
				label: `Approval ${record.interruptId} edited arguments are invalid`
			});
		}
		const branch = approved ? approval.branches.approve : approval.branches.reject;
		if (branch) {
			if (!envelope) errors.push(interruptItemError(input, record.interruptId, "invalid-payload", `Approval ${record.interruptId} requires a payload for the ${approved ? "approve" : "reject"} decision.`));
			else await pushSchemaIssues({
				request: input,
				errors,
				interruptId: record.interruptId,
				schema: branch.source,
				value: envelope.payload,
				code: "invalid-payload",
				label: `Approval ${record.interruptId} payload is invalid`
			});
		}
	}
	for (const entry of input.resume ?? []) if (!pendingById.has(entry.interruptId)) {
		incomplete = true;
		group(entry.interruptId).push(interruptItemError(input, entry.interruptId, "unknown-interrupt", `Resume entry references unknown interrupt ${entry.interruptId}.`));
	}
	if (incomplete) batchErrors.push({
		scope: "batch",
		threadId: input.threadId,
		interruptedRunId: input.interruptedRunId,
		generation: input.generation,
		code: "incomplete-batch",
		message: "Resume entries must resolve or cancel the complete interrupt batch.",
		source: "client",
		retryable: false,
		interruptIds: input.pending.map((record) => record.interruptId)
	});
	const itemErrors = [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).flatMap(([, errors]) => errors);
	if (itemErrors.length > 0) {
		batchErrors.push({
			scope: "batch",
			threadId: input.threadId,
			interruptedRunId: input.interruptedRunId,
			generation: input.generation,
			code: "item-validation-failed",
			message: "One or more interrupt resolutions are invalid.",
			source: "client",
			retryable: false,
			interruptIds: input.pending.map((record) => record.interruptId)
		});
		return { errors: [...itemErrors, ...batchErrors] };
	}
	const canonical = canonicalizeInterruptResolutions(input.resume ?? []);
	const approvals = /* @__PURE__ */ new Map();
	const clientToolResults = /* @__PURE__ */ new Map();
	const genericInterrupts = /* @__PURE__ */ new Map();
	const deniedToolResults = /* @__PURE__ */ new Map();
	const cancelledToolCallIds = /* @__PURE__ */ new Set();
	for (const record of input.pending) {
		const entry = resumeById.get(record.interruptId);
		if (!entry) continue;
		const binding = record.binding;
		if (binding.kind === "generic") {
			if (entry.status !== "resolved") {
				genericInterrupts.set(record.interruptId, {
					interruptId: record.interruptId,
					status: "cancelled"
				});
				continue;
			}
			if (record.genericRequest === void 0) {
				genericInterrupts.set(record.interruptId, {
					interruptId: record.interruptId,
					status: "resolved",
					payload: entry.payload
				});
				continue;
			}
			const parsed = await parseSchemaValue(record.genericRequest.definition.responseSchema, entry.payload);
			if (!parsed.success) return { errors: [interruptItemError(input, record.interruptId, "invalid-payload", `Interrupt ${record.interruptId} payload is invalid.`)] };
			genericInterrupts.set(record.interruptId, {
				interruptId: record.interruptId,
				status: "resolved",
				payload: parsed.data
			});
			continue;
		}
		if (entry.status === "cancelled") {
			cancelledToolCallIds.add(binding.toolCallId);
			continue;
		}
		if (binding.kind === "client-tool-execution") {
			clientToolResults.set(binding.toolCallId, entry.payload);
			continue;
		}
		const envelope = objectValue(entry.payload);
		const resolution = typeof entry.payload === "boolean" ? entry.payload : envelope?.approved === true ? {
			approved: true,
			...envelope.editedArgs !== void 0 ? { editedArgs: envelope.editedArgs } : {},
			...envelope.payload !== void 0 ? { payload: envelope.payload } : {}
		} : {
			approved: false,
			...envelope?.payload !== void 0 ? { payload: envelope.payload } : {}
		};
		approvals.set(binding.toolCallId, resolution);
		if (resolution === false || typeof resolution === "object" && !resolution.approved) deniedToolResults.set(binding.toolCallId, typeof resolution === "object" ? resolution.payload : void 0);
	}
	return {
		errors: [],
		resolutions: canonical.resolutions,
		canonicalResolutions: canonical.canonicalResolutions,
		fingerprint: canonical.fingerprint,
		resumeToolState: {
			approvals,
			clientToolResults,
			genericInterrupts,
			deniedToolResults,
			cancelledToolCallIds
		}
	};
}
/**
* Is this a binding written by a version of the protocol we understand?
*
* A missing `v` is read as {@link INTERRUPT_BINDING_VERSION} so bindings
* written before the field existed still resume. A `v` we don't recognise is
* rejected outright — a newer or foreign producer's binding must not be
* duck-typed into ours.
*/
function isSupportedBindingVersion(raw) {
	const version = raw["v"];
	if (version === void 0) return true;
	return version === 1;
}
function readUnopenedInterruptBinding(descriptor) {
	const metadata = objectValue(descriptor.metadata);
	const raw = metadata ? objectValue(metadata[interruptBindingMetadataKey]) : null;
	if (!raw || stringField(raw, "interruptId") !== descriptor.id) return void 0;
	if (!isSupportedBindingVersion(raw)) return void 0;
	const kind = stringField(raw, "kind");
	const interruptId = stringField(raw, "interruptId");
	const responseSchemaHash = stringField(raw, "responseSchemaHash");
	const expiresAt = stringField(raw, "expiresAt");
	if (!interruptId || responseSchemaHash === "") return void 0;
	if (expiresAt !== void 0 && !Number.isFinite(Date.parse(expiresAt))) return;
	const v = 1;
	if (kind === "generic") {
		const definitionId = stringField(raw, "definitionId");
		const key = stringField(raw, "key");
		const batchIndex = raw["batchIndex"];
		const payloadSchemaHash = stringField(raw, "payloadSchemaHash");
		if ((definitionId !== void 0 || key !== void 0 || batchIndex !== void 0 || payloadSchemaHash !== void 0) && (!definitionId || !key || typeof batchIndex !== "number" || !Number.isInteger(batchIndex) || batchIndex < 0)) return;
		return {
			v,
			kind,
			interruptId,
			...responseSchemaHash ? { responseSchemaHash } : {},
			...expiresAt ? { expiresAt } : {},
			...definitionId ? { definitionId } : {},
			...key ? { key } : {},
			...typeof batchIndex === "number" ? { batchIndex } : {},
			...payloadSchemaHash ? { payloadSchemaHash } : {}
		};
	}
	if (!responseSchemaHash) return void 0;
	const toolName = stringField(raw, "toolName");
	const toolCallId = stringField(raw, "toolCallId");
	if (!toolName || !toolCallId) return void 0;
	if (kind === "client-tool-execution") {
		const outputSchemaHash = stringField(raw, "outputSchemaHash");
		if (!outputSchemaHash) return void 0;
		return {
			v,
			kind,
			interruptId,
			toolName,
			toolCallId,
			outputSchemaHash,
			responseSchemaHash,
			...expiresAt ? { expiresAt } : {}
		};
	}
	if (kind === "tool-approval") {
		const inputSchemaHash = stringField(raw, "inputSchemaHash");
		const approvalSchemaHash = stringField(raw, "approvalSchemaHash");
		if (!inputSchemaHash || !approvalSchemaHash) return void 0;
		return {
			v,
			kind,
			interruptId,
			toolName,
			toolCallId,
			originalArgs: raw.originalArgs,
			inputSchemaHash,
			approvalSchemaHash,
			responseSchemaHash,
			...expiresAt ? { expiresAt } : {}
		};
	}
}
/**
* Attach a resume binding to an interrupt descriptor, under
* {@link INTERRUPT_BINDING_METADATA_KEY}.
*
* This is the supported way to make an interrupt resumable by this package.
* The descriptor keeps its AG-UI shape; only `metadata` gains the namespaced
* key. Pass the unopened form (no `interruptedRunId` / `generation`) when
* emitting from inside a run — those fields are stamped as the run finishes.
*/
function withInterruptBinding(descriptor, binding) {
	return {
		...descriptor,
		metadata: {
			...descriptor.metadata,
			[interruptBindingMetadataKey]: {
				...binding,
				v: 1,
				interruptId: descriptor.id
			}
		}
	};
}
/**
* Read the opened resume binding off a descriptor, or `undefined` when the
* descriptor carries no binding of a version we understand.
*
* `undefined` means "this interrupt is not ours to resume" — it is not a
* failure to recover from by inventing a binding.
*/
function readInterruptBinding(descriptor) {
	const unopened = readUnopenedInterruptBinding(descriptor);
	if (!unopened) return void 0;
	const metadata = objectValue(descriptor.metadata);
	const raw = metadata ? objectValue(metadata[interruptBindingMetadataKey]) : null;
	if (!raw) return void 0;
	const interruptedRunId = stringField(raw, "interruptedRunId");
	const generation = raw["generation"];
	if (!interruptedRunId || typeof generation !== "number" || !Number.isInteger(generation) || generation < 0) return;
	return {
		...unopened,
		interruptedRunId,
		generation
	};
}
function withoutInterruptBinding(descriptor) {
	const metadata = objectValue(descriptor.metadata);
	if (!metadata || !(interruptBindingMetadataKey in metadata)) return descriptor;
	const publicMetadata = { ...metadata };
	delete publicMetadata[interruptBindingMetadataKey];
	return {
		...descriptor,
		metadata: publicMetadata
	};
}
//#endregion
export { INTERRUPT_BINDING_METADATA_KEY, InterruptResumeValidationError, interruptItemError, readInterruptBinding, readUnopenedInterruptBinding, validateInterruptResumeBatch, withInterruptBinding, withoutInterruptBinding };

//# sourceMappingURL=interrupt-resume.js.map