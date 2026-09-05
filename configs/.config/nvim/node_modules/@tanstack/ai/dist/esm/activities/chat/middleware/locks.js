import { createCapability } from "./capabilities.js";
import { defineChatMiddleware } from "./define.js";
//#region src/activities/chat/middleware/locks.ts
/**
* Distributed-mutex primitive — the neutral home for the `'locks'` capability.
*
* Capability identity is by object reference (see `createCapability`). Any
* middleware may PROVIDE a {@link LockStore} via {@link withLocks} /
* {@link provideLocks}; consumers (notably `@tanstack/ai-sandbox` `ensure`)
* read it with {@link getLocks}. Coordination, not state persistence.
*/
/**
* Type a {@link LockStore} implementation inline: pass the object and get
* autocomplete + contract checking, with no separate `: LockStore` annotation.
* Hand the result to {@link withLocks}.
*/
function defineLock(lock) {
	return lock;
}
/**
* The lock capability. Provided by {@link withLocks} or any middleware that
* calls {@link provideLocks}.
*/
var LocksCapability = createCapability()("locks");
/** Destructured accessors: `getLocks(ctx)` / `provideLocks(ctx, store)`. */
var [getLocks, provideLocks] = LocksCapability;
/**
* In-memory {@link LockStore} — a per-key promise chain. Correct within a single
* process; multi-instance correctness needs a distributed lock backend.
*/
var InMemoryLockStore = class {
	chains = /* @__PURE__ */ new Map();
	withLock(key, fn) {
		const prior = this.chains.get(key) ?? Promise.resolve();
		const runCriticalSection = () => fn(new AbortController().signal);
		const run = prior.then(runCriticalSection, runCriticalSection);
		const settled = run.then(() => void 0, () => void 0);
		this.chains.set(key, settled);
		settled.then(() => {
			if (this.chains.get(key) === settled) this.chains.delete(key);
		});
		return run;
	}
};
/**
* Provide a {@link LockStore} on the chat middleware capability bus.
*
* Coordination only — independent of chat state persistence. A lock provided
* here reaches any later middleware that reads {@link LocksCapability}
* (including `withSandbox`).
*
* ```ts
* middleware: [
*   withLocks(distributedLocks),
*   withSandbox(sandbox),
* ]
* ```
*/
function withLocks(locks) {
	return defineChatMiddleware({
		name: "locks",
		provides: [LocksCapability],
		setup(ctx) {
			provideLocks(ctx, locks);
		}
	});
}
//#endregion
export { InMemoryLockStore, LocksCapability, defineLock, getLocks, provideLocks, withLocks };

//# sourceMappingURL=locks.js.map