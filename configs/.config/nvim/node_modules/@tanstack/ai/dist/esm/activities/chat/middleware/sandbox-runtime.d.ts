import { InternalLogger } from '../../../logger/internal-logger.js';
import { SandboxFileHookEvent } from './types.js';
export interface SandboxRuntime {
    emit: (event: SandboxFileHookEvent) => void;
    /** Emit an opt-in per-file `sandbox.file.diff` CUSTOM chunk. */
    emitFileDiff: (value: {
        path: string;
        diff: string;
    }) => void;
    logger: InternalLogger;
}
export declare const SandboxRuntimeCapability: import('./capabilities.js').Capability<SandboxRuntime, "sandbox-runtime">;
export declare const getSandboxRuntime: import('./capabilities.js').CapabilityGetter<SandboxRuntime>, provideSandboxRuntime: import('./capabilities.js').CapabilityProvider<SandboxRuntime>;
