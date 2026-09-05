//#region src/envelope.ts
function createRuntimeId() {
	const cryptoLike = globalThis.crypto;
	if (cryptoLike?.randomUUID) return cryptoLike.randomUUID();
	return Math.random().toString(36).slice(2);
}
var memoizedRuntimeId;
function getRuntimeId() {
	if (memoizedRuntimeId !== void 0) return memoizedRuntimeId;
	if (!globalThis.__TANSTACK_AI_DEVTOOLS_RUNTIME_ID__) globalThis.__TANSTACK_AI_DEVTOOLS_RUNTIME_ID__ = createRuntimeId();
	memoizedRuntimeId = globalThis.__TANSTACK_AI_DEVTOOLS_RUNTIME_ID__;
	return memoizedRuntimeId;
}
var eventCounter = 0;
function idPart(value) {
	if (value === void 0 || value === null || value === "") return "missing";
	return `value-${encodeURIComponent(String(value))}`;
}
function timestampBucket(timestamp) {
	return Math.floor(timestamp / 1e3) * 1e3;
}
function createAIDevtoolsEventEnvelope(input) {
	const resolvedRuntimeId = input.runtimeId ?? getRuntimeId();
	const eventId = input.eventId && input.eventId.length > 0 ? input.eventId : [
		input.source,
		input.eventType,
		idPart(resolvedRuntimeId),
		idPart(input.clientId),
		idPart(input.requestId),
		idPart(input.streamId),
		idPart(input.hookId),
		idPart(input.threadId),
		idPart(input.runId),
		idPart(input.messageId),
		idPart(input.toolCallId),
		idPart(input.sequence),
		input.timestamp,
		getRuntimeId(),
		eventCounter++
	].join(":");
	return {
		...input,
		runtimeId: resolvedRuntimeId,
		eventId
	};
}
function getAIDevtoolsRuntimeId() {
	return getRuntimeId();
}
function getAIDevtoolsDedupeKey(event) {
	if (event.eventId && event.eventId.length > 0) return `event:${event.eventId}`;
	return [
		"fallback",
		event.source,
		event.eventType,
		event.visibility,
		idPart(event.clientId),
		idPart(event.requestId),
		idPart(event.streamId),
		idPart(event.hookId),
		idPart(event.threadId),
		idPart(event.runId),
		idPart(event.messageId),
		idPart(event.toolCallId),
		idPart(event.sequence),
		timestampBucket(event.timestamp)
	].join(":");
}
//#endregion
export { createAIDevtoolsEventEnvelope, getAIDevtoolsDedupeKey, getAIDevtoolsRuntimeId };

//# sourceMappingURL=envelope.js.map