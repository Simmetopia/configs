import { GenerationAbortInfo, GenerationErrorInfo, GenerationFinishInfo, GenerationMiddleware, GenerationMiddlewareContext, GenerationUsageInfo } from './types.js';
/**
 * Build the stable context for a single media-activity call.
 *
 * Media activities are always server-side and carry no user runtime context,
 * so `source` is fixed to `'server'` and `context` to `undefined`.
 */
export declare function createGenerationContext(args: {
    requestId: string;
    activity: GenerationMiddlewareContext['activity'];
    provider: string;
    model: string;
    modelOptions?: unknown;
    threadId?: string;
    runId?: string;
    artifactInputs?: unknown;
    createId: (prefix: string) => string;
}): GenerationMiddlewareContext;
export declare function runGenerationStart(middleware: ReadonlyArray<GenerationMiddleware> | undefined, ctx: GenerationMiddlewareContext): Promise<void>;
export declare function runGenerationUsage(middleware: ReadonlyArray<GenerationMiddleware> | undefined, ctx: GenerationMiddlewareContext, usage: GenerationUsageInfo): Promise<void>;
export declare function runGenerationFinish(middleware: ReadonlyArray<GenerationMiddleware> | undefined, ctx: GenerationMiddlewareContext, info: GenerationFinishInfo): Promise<void>;
export declare function runGenerationAbort(middleware: ReadonlyArray<GenerationMiddleware> | undefined, ctx: GenerationMiddlewareContext, info: GenerationAbortInfo): Promise<void>;
export declare function runGenerationError(middleware: ReadonlyArray<GenerationMiddleware> | undefined, ctx: GenerationMiddlewareContext, info: GenerationErrorInfo): Promise<void>;
/**
 * Apply the result transforms middleware registered on the context, in order,
 * to the raw adapter result. Each transform may return a replacement result or
 * `undefined` to leave it unchanged. Runs after the adapter result exists and
 * before the final result is returned or streamed.
 */
export declare function applyGenerationResultTransforms<TResult>(ctx: GenerationMiddlewareContext, result: TResult): Promise<TResult>;
