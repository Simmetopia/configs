import { CapabilityHandle } from './capabilities.js';
import { AnyChatMiddleware } from './types.js';
/** Minimal adapter shape needed for capability validation. */
interface CapabilityRequiringAdapter {
    name: string;
    requires?: ReadonlyArray<CapabilityHandle>;
}
/**
 * Runtime validation: every required capability (from middleware `requires` and
 * the adapter's `requires`) must be provided by some middleware's `provides`.
 * `optionalRequires` is never gating. Throws a clear error otherwise.
 *
 * Presence only — ORDER is not validated here (a provider may appear after its
 * consumer in the array and still pass). Use the `createChatMiddleware()`
 * builder for compile-time order enforcement; at runtime, a consumer that reads
 * a not-yet-provided capability during `setup` fails loud via its getter.
 */
export declare function validateCapabilities(middlewares: ReadonlyArray<AnyChatMiddleware>, adapter: CapabilityRequiringAdapter): void;
export {};
