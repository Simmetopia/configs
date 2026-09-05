import { InterruptDefinition } from '../../../interrupt-definition.js';
/**
 * Internal per-run registry of first-party generic interrupt definitions.
 *
 * Persistence uses this bridge while restoring a durable interrupt. It never
 * receives a definition from the stored record; it can only look up one that
 * the current chat call registered.
 */
export interface GenericInterruptDefinitionRegistry {
    readonly definitions: ReadonlyMap<string, InterruptDefinition<any, any, any, any>>;
}
export declare const GenericInterruptDefinitionRegistryCapability: import('./capabilities.js').Capability<GenericInterruptDefinitionRegistry, "generic-interrupt-definition-registry">;
export declare const getGenericInterruptDefinitionRegistry: import('./capabilities.js').CapabilityGetter<GenericInterruptDefinitionRegistry>, provideGenericInterruptDefinitionRegistry: import('./capabilities.js').CapabilityProvider<GenericInterruptDefinitionRegistry>;
