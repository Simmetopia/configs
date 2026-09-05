//#region src/activities/chat/middleware/capabilities.ts
/**
* Per-request bookkeeping: which capabilities were provided, plus the
* duplicate-provide notification. Capability VALUES live in per-capability
* WeakMaps (see `createCapability`), not here — this only tracks presence.
*/
var CapabilityRegistry = class {
	provided = /* @__PURE__ */ new Set();
	onDuplicate;
	/** Register a callback fired when a handle is provided more than once. */
	setOnDuplicate(cb) {
		this.onDuplicate = cb;
	}
	/** Record that `handle` was provided; fire the duplicate callback on repeats. */
	markProvided(handle) {
		if (this.provided.has(handle)) this.onDuplicate?.(handle.capabilityName);
		this.provided.add(handle);
	}
	has(handle) {
		return this.provided.has(handle);
	}
};
/**
* Create a capability. Returns a hybrid handle that destructures to
* `[get, provide]` and is itself the identity for `requires`/`provides`.
*
* Curried so the value type is supplied explicitly while the name literal is
* INFERRED from the argument: `createCapability<T>()('name')`. (A single call
* `createCapability<T>('name')` cannot work — supplying `T` explicitly stops
* TypeScript inferring the name, collapsing it to `string` and defeating the
* compile-time coverage check that keys on the literal name.)
*
* @example Provider + consumer middleware
* ```ts
* const counterCapability = createCapability<{ value: number }>()('counter')
* const [getCounter, provideCounter] = counterCapability
*
* const withCounter = defineChatMiddleware({
*   name: 'counter',
*   provides: [counterCapability],
*   setup(ctx) { provideCounter(ctx, { value: 0 }) },
* })
*
* const readsCounter = defineChatMiddleware({
*   name: 'reads-counter',
*   requires: [counterCapability],
*   onChunk(ctx) { getCounter(ctx).value++ },
* })
*
* chat({ adapter, messages, middleware: [withCounter, readsCounter] })
* ```
*
* @remarks Capability `name`s must be unique across your app: compile-time
* coverage tracking keys on the name literal (runtime keys on reference).
*/
function createCapability() {
	return (name) => {
		const values = /* @__PURE__ */ new WeakMap();
		function get(ctx, opts) {
			if (!values.has(ctx)) {
				if (opts?.optional) return void 0;
				throw new Error(`Capability "${name}" was requested but never provided. Ensure a middleware provides it in setup(), ordered before this consumer.`);
			}
			return values.get(ctx);
		}
		const provide = (ctx, value) => {
			values.set(ctx, value);
			ctx.capabilities.markProvided(handle);
		};
		const handle = Object.assign([get, provide], {
			capabilityName: name,
			has: (ctx) => values.has(ctx)
		});
		return handle;
	};
}
//#endregion
export { CapabilityRegistry, createCapability };

//# sourceMappingURL=capabilities.js.map