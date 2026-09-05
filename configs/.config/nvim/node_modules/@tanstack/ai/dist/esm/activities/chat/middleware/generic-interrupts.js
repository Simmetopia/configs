import { createCapability } from "./capabilities.js";
//#region src/activities/chat/middleware/generic-interrupts.ts
var GenericInterruptDefinitionRegistryCapability = createCapability()("generic-interrupt-definition-registry");
var [getGenericInterruptDefinitionRegistry, provideGenericInterruptDefinitionRegistry] = GenericInterruptDefinitionRegistryCapability;
//#endregion
export { GenericInterruptDefinitionRegistryCapability, getGenericInterruptDefinitionRegistry, provideGenericInterruptDefinitionRegistry };

//# sourceMappingURL=generic-interrupts.js.map