import { createCapability } from "./capabilities.js";
//#region src/activities/chat/middleware/metadata.ts
var MetadataCapability = createCapability()("metadata");
var [getMetadata, provideMetadata] = MetadataCapability;
//#endregion
export { MetadataCapability, getMetadata, provideMetadata };

//# sourceMappingURL=metadata.js.map