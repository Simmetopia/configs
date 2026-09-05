import { canonicalInterruptJson, cloneAndDeepFreezeJson, digestInterruptJson } from "./interrupt-serialization.js";
//#region src/interrupts.ts
/**
* Wire version of {@link InterruptBinding}.
*
* The binding is the only part of an AG-UI `Interrupt` that this package
* claims — it rides in `metadata` under
* {@link INTERRUPT_BINDING_METADATA_KEY} and tells the resume path how to
* correlate an answer back to a paused run. Producers stamp `v`; readers
* reject any version they don't understand rather than duck-typing the fields.
*
* That matters because an AG-UI `Interrupt` is a shared envelope. Another
* producer — a workflow engine projecting a durable approval, a third-party
* agent — can legitimately put its own binding in the same envelope. Versioning
* makes "not mine" a clean rejection instead of a partial match that resumes
* against the wrong owner.
*/
var INTERRUPT_BINDING_VERSION = 1;
function canonicalizeInterruptResolutions(resolutions) {
	const sorted = [...resolutions].sort((left, right) => left.interruptId.localeCompare(right.interruptId));
	const frozen = cloneAndDeepFreezeJson(sorted);
	const canonicalResolutions = canonicalInterruptJson(frozen);
	return Object.freeze({
		resolutions: frozen,
		canonicalResolutions,
		fingerprint: digestInterruptJson(canonicalResolutions)
	});
}
//#endregion
export { INTERRUPT_BINDING_VERSION, canonicalizeInterruptResolutions };

//# sourceMappingURL=interrupts.js.map