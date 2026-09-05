import { EventType } from "../types.js";
//#region src/utilities/structured-output-events.ts
function structuredOutputStartChunk(args) {
	return {
		type: EventType.CUSTOM,
		name: "structured-output.start",
		value: { messageId: args.messageId },
		model: args.model,
		timestamp: args.timestamp ?? Date.now(),
		threadId: args.threadId,
		runId: args.runId
	};
}
function structuredOutputCompleteChunk(args) {
	return {
		type: EventType.CUSTOM,
		name: "structured-output.complete",
		value: {
			object: args.object,
			raw: args.raw,
			messageId: args.messageId
		},
		model: args.model,
		timestamp: args.timestamp ?? Date.now(),
		threadId: args.threadId,
		runId: args.runId
	};
}
//#endregion
export { structuredOutputCompleteChunk, structuredOutputStartChunk };

//# sourceMappingURL=structured-output-events.js.map