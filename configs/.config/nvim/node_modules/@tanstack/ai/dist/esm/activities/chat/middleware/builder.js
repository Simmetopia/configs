//#region src/activities/chat/middleware/builder.ts
/** Create an order-aware middleware builder. */
function createChatMiddleware() {
	const list = [];
	const builder = {
		use(middleware) {
			list.push(middleware);
			return builder;
		},
		build() {
			return list;
		}
	};
	return builder;
}
//#endregion
export { createChatMiddleware };

//# sourceMappingURL=builder.js.map