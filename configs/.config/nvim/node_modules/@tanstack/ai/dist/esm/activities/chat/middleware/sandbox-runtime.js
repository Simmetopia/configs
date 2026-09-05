import { createCapability } from "./capabilities.js";
//#region src/activities/chat/middleware/sandbox-runtime.ts
/**
* Internal runtime seam the chat engine PROVIDES so the sandbox middleware can
* surface file events without a public ctx method. `emit` runs every
* middleware's `sandbox` hooks AND emits a CUSTOM `sandbox.file` chunk into the
* stream; `logger` lets the sandbox layer log under the `sandbox` debug
* category. Consumed (optionally) by `withSandbox` in `@tanstack/ai-sandbox`.
*/
var SandboxRuntimeCapability = createCapability()("sandbox-runtime");
var [getSandboxRuntime, provideSandboxRuntime] = SandboxRuntimeCapability;
//#endregion
export { SandboxRuntimeCapability, getSandboxRuntime, provideSandboxRuntime };

//# sourceMappingURL=sandbox-runtime.js.map