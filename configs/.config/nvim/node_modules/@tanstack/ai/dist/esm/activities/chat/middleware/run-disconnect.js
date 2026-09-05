import { createCapability } from "./capabilities.js";
//#region src/activities/chat/middleware/run-disconnect.ts
/**
* Internal seam the chat engine PROVIDES so middleware can learn that the
* DELIVERY socket closed while the run is still going — and, crucially, learn it
* WITHOUT the run being cancelled.
*
* WHY THIS EXISTS. Before it, the only way a disconnect reached middleware was for
* the application to mirror `request.signal` into `chat()`'s `abortController`,
* which ABORTS THE RUN. For a durable run that is precisely wrong, and wrong in
* the most expensive direction: `chat()` returns at its `isCancelled()` check
* immediately after middleware `setup`, so the harness adapter's `chatStream` is
* never called and the agent in the sandbox that `setup` just spent minutes
* creating is NEVER LAUNCHED. The user switched away during "starting the
* sandbox", came back, and found an empty log belonging to a run that had done
* nothing — with no takeover able to recover it, because an agent that never
* started wrote no journal to replay. Applications were forced to choose between
* "the middleware learns about the disconnect" and "the run survives it".
*
* So a disconnect is delivered as a NOTIFICATION. `withSandbox` uses it to stamp
* `detachedSince`/`sandboxKey` and publish the detach verdict while the run keeps
* producing into its still-open durable log — which is exactly what a re-attaching
* client tails to catch up.
*
* A SUBSCRIPTION RATHER THAN A MIDDLEWARE HOOK, deliberately. `ChatMiddleware` is
* public API and a new lifecycle hook there is a permanent commitment — including
* the obligation to explain that it is the one hook that is NOT terminal. This
* concern has exactly one consumer in the tree (`withSandbox`) and it reaches it
* through the same internal channel the sandbox layer already uses for its runtime
* (`SandboxRuntimeCapability`), so it ships with no public surface at all.
*
* DISPATCHED FROM THE TRANSPORT, NOT FROM THE RUN'S UNWINDING. That is what makes
* it prompt. A run suspended inside a minutes-wide `setup` cannot dispatch anything
* from its own `finally`, because the `finally` is reached only once the generator
* unwinds — which is what made `detachedSince` land three minutes late.
*/
var RunDisconnectCapability = createCapability()("run-disconnect");
var [getRunDisconnect, provideRunDisconnect] = RunDisconnectCapability;
//#endregion
export { RunDisconnectCapability, getRunDisconnect, provideRunDisconnect };

//# sourceMappingURL=run-disconnect.js.map