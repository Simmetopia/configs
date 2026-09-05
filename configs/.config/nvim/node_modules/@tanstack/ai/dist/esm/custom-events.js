import { EventType } from "./types.js";
//#region src/custom-events.ts
/**
* Catalog of well-known AG-UI `CUSTOM` event names used by the sandbox/agent
* layers, plus their payload shapes.
*
* The persisted run log is the AG-UI `StreamChunk` stream itself — there is no
* separate `RunEvent` type. Agent activity that has no first-class AG-UI event
* (process output, file diffs, ports, approvals, artifacts, sandbox lifecycle)
* rides on `CUSTOM` events carrying one of these names. Centralizing the names +
* payloads here keeps emitters (harness adapters, sandbox) and consumers
* (persistence projections, devtools, diff/terminal panels) in agreement without
* inventing a parallel event union.
*/
/** Well-known CUSTOM event names. */
var CUSTOM_EVENT = {
	FILE_CHANGED: "file.changed",
	PROCESS_STDOUT: "process.stdout",
	PROCESS_STDERR: "process.stderr",
	PORT_OPENED: "port.opened",
	APPROVAL_REQUESTED: "approval.requested",
	APPROVAL_RESOLVED: "approval.resolved",
	ARTIFACT_CREATED: "artifact.created",
	SANDBOX_CREATED: "sandbox.created",
	SANDBOX_RESUMED: "sandbox.resumed"
};
/**
* Type guard: is `chunk` a CUSTOM event with the given well-known `name`?
* Narrows the payload type when true, so consumers read `chunk.value` typed.
*/
function isCustomEvent(chunk, name) {
	return chunk.type === EventType.CUSTOM && chunk.name === name;
}
//#endregion
export { CUSTOM_EVENT, isCustomEvent };

//# sourceMappingURL=custom-events.js.map