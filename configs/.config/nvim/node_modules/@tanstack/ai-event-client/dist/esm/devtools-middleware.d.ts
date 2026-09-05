interface DevtoolsModelMessage {
    role: string;
    content: unknown;
    toolCalls?: unknown;
}
type DevtoolsSystemPrompt = string | {
    content: string;
    metadata?: unknown;
};
interface DevtoolsMiddlewareContext {
    requestId: string;
    streamId: string;
    runId: string;
    threadId: string;
    conversationId?: string;
    provider: string;
    model: string;
    source: 'client' | 'server';
    systemPrompts: ReadonlyArray<DevtoolsSystemPrompt>;
    toolNames?: Array<string>;
    options?: Record<string, unknown>;
    modelOptions?: Record<string, unknown>;
    messageCount: number;
    hasTools: boolean;
    streaming: boolean;
    messages: ReadonlyArray<DevtoolsModelMessage>;
    createId: (prefix: string) => string;
}
interface DevtoolsIterationInfo {
    iteration: number;
    messageId: string;
}
interface DevtoolsToolPhaseCompleteInfo {
    toolCalls: Array<unknown>;
    needsApproval: Array<{
        toolCallId: string;
        toolName: string;
        input: unknown;
        approvalId: string;
    }>;
    needsClientExecution: Array<{
        toolCallId: string;
        toolName: string;
        input: unknown;
    }>;
    results: Array<{
        toolCallId: string;
        toolName: string;
        result: unknown;
        duration?: number;
    }>;
}
interface DevtoolsFinishInfo {
    content: string;
    finishReason: string | null;
    duration: number;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
export interface DevtoolsChatMiddleware {
    name?: string;
    onStart?: (ctx: DevtoolsMiddlewareContext) => void | Promise<void>;
    onIteration?: (ctx: DevtoolsMiddlewareContext, info: DevtoolsIterationInfo) => void | Promise<void>;
    onChunk?: (ctx: DevtoolsMiddlewareContext, chunk: unknown) => void | Promise<void>;
    onToolPhaseComplete?: (ctx: DevtoolsMiddlewareContext, info: DevtoolsToolPhaseCompleteInfo) => void | Promise<void>;
    onFinish?: (ctx: DevtoolsMiddlewareContext, info: DevtoolsFinishInfo) => void | Promise<void>;
}
/**
 * Internal devtools middleware that emits all DevTools events.
 * Auto-injected as the FIRST middleware in the TextEngine.
 *
 * All hooks are observation-only — `onChunk` returns void to pass through
 * without transforming chunks.
 */
export declare function devtoolsMiddleware(): DevtoolsChatMiddleware;
export {};
