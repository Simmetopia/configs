//#region src/realtime/event-emitter.ts
function createRealtimeEventEmitter() {
	const eventHandlers = /* @__PURE__ */ new Map();
	return {
		emit(event, payload) {
			const handlers = eventHandlers.get(event);
			if (!handlers) return;
			for (const handler of handlers) handler(payload);
		},
		on(event, handler) {
			let handlers = eventHandlers.get(event);
			if (!handlers) {
				handlers = /* @__PURE__ */ new Set();
				eventHandlers.set(event, handlers);
			}
			handlers.add(handler);
			return () => {
				handlers.delete(handler);
			};
		}
	};
}
//#endregion
export { createRealtimeEventEmitter };

//# sourceMappingURL=event-emitter.js.map