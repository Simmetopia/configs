import { ProviderId } from './providers.js';
export declare class ByokMissingError extends Error {
    readonly provider: ProviderId;
    constructor(provider: ProviderId);
}
export declare class ByokBlockedError extends Error {
    readonly provider: ProviderId;
    readonly reason: 'missing' | 'locked';
    constructor(provider: ProviderId, reason: 'missing' | 'locked');
}
export declare class ByokUnresolvedProviderError extends Error {
    constructor();
}
