//#region src/activities/chat/middleware/define.ts
/**
* Identity helper for authoring middleware with precise capability inference.
* Returns the middleware unchanged at runtime; only sharpens its type so the
* `chat()` array coverage check and `createChatMiddleware` builder can read the
* exact `requires`/`provides`.
*/
function defineChatMiddleware(middleware) {
	return middleware;
}
//#endregion
export { defineChatMiddleware };

//# sourceMappingURL=define.js.map