import { ReasoningEncryptedValueEvent } from '../types.js';
/** Spec event that carries a provider thinking / tool-call signature blob. */
export declare function reasoningEncryptedValue(opts: {
    subtype: 'message' | 'tool-call';
    entityId: string;
    encryptedValue: string;
    timestamp?: number;
}): ReasoningEncryptedValueEvent;
