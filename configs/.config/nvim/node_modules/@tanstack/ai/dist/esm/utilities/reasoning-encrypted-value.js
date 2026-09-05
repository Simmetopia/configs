import { EventType } from "../types.js";
//#region src/utilities/reasoning-encrypted-value.ts
/** Spec event that carries a provider thinking / tool-call signature blob. */
function reasoningEncryptedValue(opts) {
	return {
		type: EventType.REASONING_ENCRYPTED_VALUE,
		subtype: opts.subtype,
		entityId: opts.entityId,
		encryptedValue: opts.encryptedValue,
		...opts.timestamp !== void 0 ? { timestamp: opts.timestamp } : {}
	};
}
//#endregion
export { reasoningEncryptedValue };

//# sourceMappingURL=reasoning-encrypted-value.js.map