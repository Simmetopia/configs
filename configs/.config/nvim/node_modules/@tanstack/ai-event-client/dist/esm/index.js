import { createAIDevtoolsEventEnvelope, getAIDevtoolsDedupeKey, getAIDevtoolsRuntimeId } from "./envelope.js";
import { devtoolsMiddleware } from "./devtools-middleware.js";
import { EventClient } from "@tanstack/devtools-event-client";
//#region src/index.ts
var AiEventClient = class extends EventClient {
	constructor() {
		super({ pluginId: "tanstack-ai-devtools" });
	}
};
var aiEventClientKey = Symbol.for("tanstack.ai.devtools.eventClient");
function getAiEventClient() {
	const global = globalThis;
	const existing = global[aiEventClientKey];
	if (existing) return existing;
	const eventClient = new AiEventClient();
	global[aiEventClientKey] = eventClient;
	return eventClient;
}
var aiEventClient = getAiEventClient();
function emitAIDevtoolsEvent(eventName, payload) {
	aiEventClient.emit(eventName, payload);
}
function dispatchAIDevtoolsEvent(eventName, payload) {
	if (typeof window === "undefined" || typeof window.dispatchEvent !== "function" || typeof CustomEvent === "undefined") return;
	window.dispatchEvent(new CustomEvent("tanstack-dispatch-event", { detail: aiEventClient.createEventPayload(eventName, payload) }));
}
//#endregion
export { aiEventClient, createAIDevtoolsEventEnvelope, devtoolsMiddleware, dispatchAIDevtoolsEvent, emitAIDevtoolsEvent, getAIDevtoolsDedupeKey, getAIDevtoolsRuntimeId };

//# sourceMappingURL=index.js.map