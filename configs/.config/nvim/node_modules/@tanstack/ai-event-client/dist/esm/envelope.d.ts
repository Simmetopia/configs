export type AIDevtoolsEventSource = 'client' | 'server' | 'devtools';
export type AIDevtoolsEventVisibility = 'user-visible' | 'client-state' | 'server-internal' | 'devtools-action';
export interface AIDevtoolsEventEnvelope {
    eventId: string;
    eventType: string;
    timestamp: number;
    source: AIDevtoolsEventSource;
    visibility: AIDevtoolsEventVisibility;
    runtimeId?: string;
    clientId?: string;
    requestId?: string;
    streamId?: string;
    hookId?: string;
    threadId?: string;
    runId?: string;
    messageId?: string;
    toolCallId?: string;
    sequence?: number;
    correlationId?: string;
    relatedEventId?: string;
}
export type AIDevtoolsEventEnvelopeInput = Omit<AIDevtoolsEventEnvelope, 'eventId'> & {
    eventId?: string;
};
declare global {
    var __TANSTACK_AI_DEVTOOLS_RUNTIME_ID__: string | undefined;
}
export declare function createAIDevtoolsEventEnvelope(input: AIDevtoolsEventEnvelopeInput): AIDevtoolsEventEnvelope;
export declare function getAIDevtoolsRuntimeId(): string;
export declare function getAIDevtoolsDedupeKey(event: Partial<AIDevtoolsEventEnvelope> & Pick<AIDevtoolsEventEnvelope, 'eventType' | 'source' | 'visibility' | 'timestamp'>): string;
