//#region src/system-prompts.ts
/**
* Normalise the public `systemPrompts` shape (`Array<string | { content, metadata? }>`)
* to a homogenous `Array<{ content, metadata? }>`. Adapters use this so they
* don't have to type-narrow string vs object inline.
*
* Returns an empty array (never `undefined`) so callers can chain `.map` /
* `.join` without an extra null check.
*
* Throws a `TypeError` (naming the offending index) if an object-form entry's
* `content` isn't a string. Public API boundary — callers reaching this
* function through `as any` / external JS would otherwise stream a literal
* `"undefined"` into the model's system prompt with no signal.
*/
function normalizeSystemPrompts(prompts) {
	if (!prompts || prompts.length === 0) return [];
	return prompts.map((p, i) => {
		if (typeof p === "string") return { content: p };
		const candidate = p;
		if (candidate === null || typeof candidate !== "object") throw new TypeError(`systemPrompts[${i}]: expected a string or { content, metadata? }, got ${candidate === null ? "null" : typeof candidate}`);
		const { content } = candidate;
		if (typeof content !== "string") throw new TypeError(`systemPrompts[${i}]: content must be a string, got ${typeof content}`);
		return p;
	});
}
//#endregion
export { normalizeSystemPrompts };

//# sourceMappingURL=system-prompts.js.map