//#region src/transforms.ts
/**
* Recursively strip `null` values from a JSON-shaped value so optional fields
* present as `null` in OpenAI-compatible structured output round-trip cleanly
* through Zod schemas that expect `undefined` (or absence) instead of `null`.
*
* Behaviour:
* - Top-level `null` becomes `undefined`.
* - Object properties whose value is `null` are removed entirely (so
*   `'key' in result` is `false`). Zod's `.optional()` treats absent keys
*   the same as `undefined`, which is the round-trip we want; setting the
*   key to `undefined` would still register the property in `Object.keys`
*   and break some `.strict()`/`Object.keys`-based callers.
* - Array elements recurse via this same function; a `null` element therefore
*   becomes `undefined` (top-level rule), preserving array length so
*   positional indices stay stable. Don't rely on element-`null` round-trip.
*
* Scope: designed for `JSON.parse` output (plain objects, arrays, strings,
* numbers, booleans, null). Class instances, `Date`, `Map`, `Set`, etc. are
* NOT preserved — they're walked via `Object.entries`, which sees only own
* enumerable string-keyed properties. Native built-ins like `Date`/`Map`/`Set`
* therefore become `{}`; arbitrary class instances become a plain-object
* snapshot of just their own enumerable string properties. Don't pass
* non-JSON values.
*
* Schema-blind: strips EVERY null, including ones a `.nullable()` field
* legitimately allows. When the original schema is available, prefer
* {@link undoNullWidening}, which only strips the nulls strict-mode widening
* synthesized.
*/
function transformNullsToUndefined(obj) {
	if (obj === null) return;
	if (typeof obj !== "object") return obj;
	if (Array.isArray(obj)) return obj.map((item) => transformNullsToUndefined(item));
	const result = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value === null) continue;
		result[key] = transformNullsToUndefined(value);
	}
	return result;
}
function walk(value, map) {
	if (value === null) return map?.widened ? void 0 : null;
	if (typeof value !== "object" || !map) return value;
	if (Array.isArray(value)) {
		const { items } = map;
		if (!items) return value;
		return Array.isArray(items) ? value.map((item, index) => walk(item, items[index])) : value.map((item) => walk(item, items));
	}
	const { properties } = map;
	if (!properties) return value;
	const result = {};
	for (const [key, child] of Object.entries(value)) {
		const next = walk(child, properties[key]);
		if (next === void 0) continue;
		result[key] = next;
	}
	return result;
}
/**
* Inverse of strict-mode null-widening for structured output.
*
* To satisfy OpenAI-style strict schemas, optional fields are widened to
* `required` with `null` added to their type, so the provider returns `null`
* for an absent optional. Validating that `null` against the ORIGINAL schema
* fails, because `.optional()` means `T | undefined`, not `T | null`.
*
* Unlike {@link transformNullsToUndefined}, this consults a {@link
* NullWideningMap} recorded by the widening pass and drops ONLY the nulls that
* pass actually synthesized. Nulls a `.nullable()`/`.nullish()` field genuinely
* allows are preserved, so both `optional` and `nullable` fields round-trip
* correctly. With no map, the value is returned untouched.
*/
function undoNullWidening(value, map) {
	if (!map) return value;
	return walk(value, map);
}
//#endregion
export { transformNullsToUndefined, undoNullWidening };

//# sourceMappingURL=transforms.js.map