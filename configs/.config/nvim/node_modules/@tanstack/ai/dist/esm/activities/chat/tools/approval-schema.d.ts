import { StandardSchemaV1 } from '@standard-schema/spec';
import { JSONSchema, SchemaInput } from '../../../types.js';
import { ApprovalSchemaConfig } from './tool-definition.js';
export interface NormalizedSchemaInput {
    source: SchemaInput;
    validator?: StandardSchemaV1;
    jsonSchema?: JSONSchema;
}
export interface NormalizedApprovalSchema {
    branches: {
        approve: NormalizedSchemaInput | null;
        reject: NormalizedSchemaInput | null;
    };
    responseSchema: JSONSchema;
    responseSchemaHash: string;
    approvalSchemaHash: string;
}
export declare function normalizeApprovalSchema(approvalSchema: ApprovalSchemaConfig | undefined, inputSchema?: SchemaInput): NormalizedApprovalSchema;
export declare function hashSchemaInput(schema: SchemaInput | undefined): string;
