import { AGUIError } from "@ag-ui/core";
//#region src/utilities/chat-params.ts
/**
* Keyed by `AGUIRole` so a role added upstream fails to compile here until it
* is handled, rather than silently falling through as an unknown role.
*/
var AGUI_ROLES = {
	developer: true,
	system: true,
	assistant: true,
	user: true,
	tool: true,
	activity: true,
	reasoning: true
};
function isAGUIRole(value) {
	return typeof value === "string" && value in AGUI_ROLES;
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Reject the request body, pointing at the migration guide. Mirrors the
* message the previous `RunAgentInputSchema.safeParse` failure produced.
*/
function invalidBody(reason) {
	throw new AGUIError(`Request body is not a valid AG-UI RunAgentInput. If you're upgrading from a previous @tanstack/ai-client release, see docs/migration/ag-ui-compliance.md. Validation errors: ${reason}`);
}
function requireString(value, at) {
	if (typeof value !== "string") invalidBody(`${at} must be a string`);
	return value;
}
function requireArray(value, at) {
	if (!Array.isArray(value)) invalidBody(`${at} must be an array`);
	return value;
}
/**
* Assert one AG-UI `Message`, discriminating on `role` exactly as the upstream
* `MessageSchema` discriminated union does. The record view is retained on the
* asserted type so callers can still inspect extras like `metadata`.
*/
function assertAGUIMessage(value, at) {
	requireString(value.id, `${at}.id`);
	const role = value.role;
	if (!isAGUIRole(role)) invalidBody(`${at}.role must be one of ${Object.keys(AGUI_ROLES).join(" | ")}`);
	switch (role) {
		case "assistant":
			if (value.content !== void 0) requireString(value.content, `${at}.content`);
			if (value.toolCalls !== void 0) requireArray(value.toolCalls, `${at}.toolCalls`);
			break;
		case "user":
			if (typeof value.content !== "string" && !Array.isArray(value.content)) invalidBody(`${at}.content must be a string or an array of content parts`);
			break;
		case "tool":
			requireString(value.content, `${at}.content`);
			requireString(value.toolCallId, `${at}.toolCallId`);
			break;
		case "activity":
			requireString(value.activityType, `${at}.activityType`);
			if (!isRecord(value.content)) invalidBody(`${at}.content must be an object`);
			break;
		case "developer":
		case "system":
		case "reasoning": requireString(value.content, `${at}.content`);
	}
}
function validateMessage(value, index) {
	const at = `messages[${index}]`;
	if (!isRecord(value)) invalidBody(`${at} must be an object`);
	assertAGUIMessage(value, at);
	if (value.metadata !== void 0) {
		if (!isRecord(value.metadata)) invalidBody(`${at}.metadata must be an object`);
	}
	return dropInboundParts(value);
}
function dropInboundParts(message) {
	if (!("parts" in message)) return message;
	const rest = { ...message };
	delete rest.parts;
	return rest;
}
function validateTool(value, index) {
	const at = `tools[${index}]`;
	if (!isRecord(value)) invalidBody(`${at} must be an object`);
	return {
		name: requireString(value.name, `${at}.name`),
		description: requireString(value.description, `${at}.description`),
		parameters: value.parameters
	};
}
function validateContext(value, index) {
	const at = `context[${index}]`;
	if (!isRecord(value)) invalidBody(`${at} must be an object`);
	return {
		description: requireString(value.description, `${at}.description`),
		value: requireString(value.value, `${at}.value`)
	};
}
function validateResumeEntry(value, index) {
	const at = `resume[${index}]`;
	if (!isRecord(value)) invalidBody(`${at} must be an object`);
	const status = value.status;
	if (status !== "resolved" && status !== "cancelled") invalidBody(`${at}.status must be "resolved" or "cancelled"`);
	const entry = {
		interruptId: requireString(value.interruptId, `${at}.interruptId`),
		status
	};
	if (value.payload !== void 0) entry.payload = value.payload;
	if (value.metadata !== void 0) {
		if (!isRecord(value.metadata)) invalidBody(`${at}.metadata must be an object`);
		entry.metadata = value.metadata;
	}
	return entry;
}
/**
* Parse and validate an HTTP request body as an AG-UI `RunAgentInput`.
*
* Returns a spread-friendly object whose `messages` field is suitable for
* passing directly to `chat({ messages })`. The existing
* `convertMessagesToModelMessages` handles AG-UI fan-out dedup and
* reasoning/activity/developer-role normalization internally.
*
* Validated structurally against the AG-UI `RunAgentInput` contract without a
* schema library, so this package pulls in no validation runtime of its own.
*
* @throws An error with a migration-pointing message when the body does
*   not conform to AG-UI `RunAgentInput`. Surface this as a
*   400 Bad Request to the client.
*/
async function chatParamsFromRequestBody(body) {
	if (!isRecord(body)) invalidBody("body must be a JSON object");
	const threadId = requireString(body.threadId, "threadId");
	const runId = requireString(body.runId, "runId");
	const parentRunId = body.parentRunId === void 0 ? void 0 : requireString(body.parentRunId, "parentRunId");
	const messages = requireArray(body.messages, "messages").map(validateMessage);
	const tools = requireArray(body.tools, "tools").map(validateTool);
	const aguiContext = requireArray(body.context, "context").map(validateContext);
	const resume = body.resume === void 0 ? void 0 : requireArray(body.resume, "resume").map(validateResumeEntry);
	if (body.forwardedProps !== void 0 && !isRecord(body.forwardedProps)) invalidBody("forwardedProps must be an object");
	return {
		messages,
		threadId,
		runId,
		parentRunId,
		tools,
		forwardedProps: body.forwardedProps ?? {},
		state: body.state,
		resume,
		context: aguiContext,
		aguiContext
	};
}
/**
* Read an HTTP `Request`, parse its JSON body, and validate it as an
* AG-UI `RunAgentInput` — collapsing the standard `req.json()` +
* `chatParamsFromRequestBody(...)` pair into a single call.
*
* On a malformed body or invalid AG-UI shape, this **throws a
* `Response`** with status 400 and a migration-pointing message in the
* body. Frameworks that natively handle thrown `Response` objects
* (TanStack Start, SolidStart, Remix, React Router 7) will return the
* 400 to the client automatically, so the handler reduces to:
*
* ```ts
* export async function POST(req: Request) {
*   const params = await chatParamsFromRequest(req)
*   // ...use params
* }
* ```
*
* In frameworks that do not auto-handle thrown `Response` objects
* (Next.js Route Handlers, SvelteKit, Hono, raw Node), wrap the call
* with try/catch and return the caught Response yourself, or use
* `chatParamsFromRequestBody` directly with your own JSON-parsing.
*
* @throws {Response} 400 on malformed JSON or invalid AG-UI shape.
*/
async function chatParamsFromRequest(req) {
	let body;
	try {
		body = await req.json();
	} catch (cause) {
		const res = new Response("Invalid AG-UI request body. See docs/migration/ag-ui-compliance.md.", { status: 400 });
		res.cause = cause;
		throw res;
	}
	try {
		return await chatParamsFromRequestBody(body);
	} catch (cause) {
		const res = new Response("Invalid AG-UI request body. See docs/migration/ag-ui-compliance.md.", { status: 400 });
		res.cause = cause;
		throw res;
	}
}
function mergeAgentTools(serverTools, clientTools) {
	if (clientTools.length === 0) return serverTools;
	const seen = new Set(serverTools.map((t) => t.name));
	const merged = [...serverTools];
	for (const ct of clientTools) {
		if (seen.has(ct.name)) continue;
		seen.add(ct.name);
		merged.push({
			name: ct.name,
			description: ct.description,
			inputSchema: ct.parameters
		});
	}
	return merged;
}
//#endregion
export { chatParamsFromRequest, chatParamsFromRequestBody, mergeAgentTools };

//# sourceMappingURL=chat-params.js.map