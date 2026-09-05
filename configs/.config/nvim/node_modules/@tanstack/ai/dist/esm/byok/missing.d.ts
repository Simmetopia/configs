import { ByokProvider } from './define-provider.js';
import { ProviderId } from './providers.js';
export interface ByokMissingBody {
    error: {
        type: 'byok_missing';
        provider: ProviderId;
        message: string;
    };
}
export declare function isByokMissingBody(value: unknown): value is ByokMissingBody;
export declare function byokMissing(provider: ProviderId | ByokProvider): Response;
