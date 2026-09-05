//#region src/events.ts
let EventType = /* @__PURE__ */ function(EventType) {
	EventType["TEXT_MESSAGE_START"] = "TEXT_MESSAGE_START";
	EventType["TEXT_MESSAGE_CONTENT"] = "TEXT_MESSAGE_CONTENT";
	EventType["TEXT_MESSAGE_END"] = "TEXT_MESSAGE_END";
	EventType["TEXT_MESSAGE_CHUNK"] = "TEXT_MESSAGE_CHUNK";
	EventType["TOOL_CALL_START"] = "TOOL_CALL_START";
	EventType["TOOL_CALL_ARGS"] = "TOOL_CALL_ARGS";
	EventType["TOOL_CALL_END"] = "TOOL_CALL_END";
	EventType["TOOL_CALL_CHUNK"] = "TOOL_CALL_CHUNK";
	EventType["TOOL_CALL_RESULT"] = "TOOL_CALL_RESULT";
	/** @deprecated Use REASONING_START instead. Will be removed in 1.0.0. */
	EventType["THINKING_START"] = "THINKING_START";
	/** @deprecated Use REASONING_END instead. Will be removed in 1.0.0. */
	EventType["THINKING_END"] = "THINKING_END";
	/** @deprecated Use REASONING_MESSAGE_START instead. Will be removed in 1.0.0. */
	EventType["THINKING_TEXT_MESSAGE_START"] = "THINKING_TEXT_MESSAGE_START";
	/** @deprecated Use REASONING_MESSAGE_CONTENT instead. Will be removed in 1.0.0. */
	EventType["THINKING_TEXT_MESSAGE_CONTENT"] = "THINKING_TEXT_MESSAGE_CONTENT";
	/** @deprecated Use REASONING_MESSAGE_END instead. Will be removed in 1.0.0. */
	EventType["THINKING_TEXT_MESSAGE_END"] = "THINKING_TEXT_MESSAGE_END";
	EventType["STATE_SNAPSHOT"] = "STATE_SNAPSHOT";
	EventType["STATE_DELTA"] = "STATE_DELTA";
	EventType["MESSAGES_SNAPSHOT"] = "MESSAGES_SNAPSHOT";
	EventType["ACTIVITY_SNAPSHOT"] = "ACTIVITY_SNAPSHOT";
	EventType["ACTIVITY_DELTA"] = "ACTIVITY_DELTA";
	EventType["RAW"] = "RAW";
	EventType["CUSTOM"] = "CUSTOM";
	EventType["RUN_STARTED"] = "RUN_STARTED";
	EventType["RUN_FINISHED"] = "RUN_FINISHED";
	EventType["RUN_ERROR"] = "RUN_ERROR";
	EventType["STEP_STARTED"] = "STEP_STARTED";
	EventType["STEP_FINISHED"] = "STEP_FINISHED";
	EventType["REASONING_START"] = "REASONING_START";
	EventType["REASONING_MESSAGE_START"] = "REASONING_MESSAGE_START";
	EventType["REASONING_MESSAGE_CONTENT"] = "REASONING_MESSAGE_CONTENT";
	EventType["REASONING_MESSAGE_END"] = "REASONING_MESSAGE_END";
	EventType["REASONING_MESSAGE_CHUNK"] = "REASONING_MESSAGE_CHUNK";
	EventType["REASONING_END"] = "REASONING_END";
	EventType["REASONING_ENCRYPTED_VALUE"] = "REASONING_ENCRYPTED_VALUE";
	return EventType;
}({});

//#endregion
export { EventType as t };
//# sourceMappingURL=events-BaoNrGbE.mjs.map