import { AgentLoopState, StreamChunk } from '../../../types.js';
import { InternalLogger } from '../../../logger/internal-logger.js';
import { AbortInfo, AfterToolCallInfo, BeforeToolCallDecision, ChatMiddleware, ChatMiddlewareConfig, ChatMiddlewareContext, ErrorInfo, FinishInfo, InterruptBoundaryPhase, InterruptResolutionCollection, InterruptToolResume, IterationInfo, SandboxFileHookEvent, StructuredOutputMiddlewareConfig, ToolCallHookContext, ToolPhaseCompleteInfo, UsageInfo } from './types.js';
import { GenericInterruptRequest, InterruptDefinition } from '../../../interrupt-definition.js';
/**
 * Internal middleware runner that manages composed execution of middleware hooks.
 * Created once per chat() invocation.
 */
export declare class MiddlewareRunner<TContext = unknown, TInterruptDefinitions extends InterruptDefinition<any, any, any, any> = InterruptDefinition<any, any, any, any>> {
    private readonly middlewares;
    private readonly logger;
    constructor(middlewares: ReadonlyArray<ChatMiddleware<TContext, TInterruptDefinitions>>, logger: InternalLogger);
    get hasMiddleware(): boolean;
    runOnInterruptBoundary(ctx: ChatMiddlewareContext<TContext> & {
        phase: InterruptBoundaryPhase;
    }): Promise<ReadonlyArray<GenericInterruptRequest<TInterruptDefinitions>>>;
    runOnInterruptResolution(ctx: ChatMiddlewareContext<TContext>, resolutions: InterruptResolutionCollection<TInterruptDefinitions>): Promise<{
        toolResume?: InterruptToolResume;
    }>;
    /**
     * Pipe config through all middleware onConfig hooks in order.
     * Each middleware receives the merged config from previous middleware.
     * Partial returns are shallow-merged with the current config.
     */
    runOnConfig(ctx: ChatMiddlewareContext<TContext>, config: ChatMiddlewareConfig): Promise<ChatMiddlewareConfig>;
    /**
     * Pipe config through all middleware onStructuredOutputConfig hooks in order.
     * Each middleware receives the merged config from previous middleware.
     * Partial returns are shallow-merged with the current config.
     *
     * Called once at the structured-output boundary, before runOnConfig at the
     * same boundary (which receives a ChatMiddlewareConfig view, no outputSchema).
     */
    runOnStructuredOutputConfig(ctx: ChatMiddlewareContext<TContext>, config: StructuredOutputMiddlewareConfig): Promise<StructuredOutputMiddlewareConfig>;
    /**
     * Run all `setup` hooks in array order, then assert every declared `provides`
     * capability was actually provided. Wires the last-wins duplicate-provide
     * warning into the registry. Runs before init `onConfig`.
     *
     * Takes the full `ChatMiddlewareContext` — the same stable context the engine
     * threads through every other hook — because it both forwards `ctx` to each
     * `setup` hook and emits instrumentation events from it.
     */
    runSetup(ctx: ChatMiddlewareContext<TContext>): Promise<void>;
    /**
     * Call onStart on all middleware in order.
     */
    runOnStart(ctx: ChatMiddlewareContext<TContext>): Promise<void>;
    /**
     * Pipe a single chunk through all middleware onChunk hooks in order.
     * Returns the resulting chunks (0..N) to yield to the consumer.
     *
     * - void: pass through unchanged
     * - chunk: replace with this chunk
     * - chunk[]: expand to multiple chunks
     * - null: drop the chunk entirely
     */
    runOnChunk(ctx: ChatMiddlewareContext<TContext>, chunk: StreamChunk): Promise<Array<StreamChunk>>;
    /**
     * Dispatch a sandbox file event to every middleware's `sandbox` hooks, in
     * array order: the catch-all `onFile` then the type-specific hook. Errors are
     * logged and swallowed so one bad hook can't break the run.
     */
    runSandboxFile(ctx: ChatMiddlewareContext<TContext>, event: SandboxFileHookEvent): Promise<void>;
    /**
     * Run onBeforeToolCall through middleware in order.
     * Returns the first non-void decision, or undefined to continue normally.
     */
    runOnBeforeToolCall(ctx: ChatMiddlewareContext<TContext>, hookCtx: ToolCallHookContext): Promise<BeforeToolCallDecision>;
    /**
     * Run onAfterToolCall on all middleware in order.
     */
    runOnAfterToolCall(ctx: ChatMiddlewareContext<TContext>, info: AfterToolCallInfo): Promise<void>;
    /**
     * Run onUsage on all middleware in order.
     */
    runOnUsage(ctx: ChatMiddlewareContext<TContext>, usage: UsageInfo): Promise<void>;
    /**
     * Await ONE terminal hook and RETURN its throw instead of letting it escape
     * the caller's loop, logging it on the `errors` channel first so the failure
     * is never invisible. `undefined` means the hook completed.
     *
     * Capturing (rather than swallowing at this level) is what lets isolation and
     * reporting coexist: every caller gives every middleware its turn, and then
     * each decides on its own whether the collected failures are worth telling the
     * caller about. See {@link runOnFinish} vs {@link runOnAbort} /
     * {@link runOnError}.
     */
    private captureTerminalHook;
    /**
     * Run onFinish on all middleware in order.
     *
     * ISOLATED **and** REPORTED. `onFinish` is the only terminal fan-out on the
     * SUCCESS path, and it is where `withPersistence.onFinish` writes the
     * assistant turn through the store. So the two properties are needed together
     * and neither may be traded for the other:
     *
     * - ISOLATION: every middleware's hook runs even if an earlier one threw, so a
     *   transient store error cannot skip a later middleware's own bookkeeping.
     *   Each failure is captured by {@link captureTerminalHook}, not propagated
     *   mid-loop.
     * - REPORTING: after the loop, the failures are rethrown. `chat()`'s catch
     *   treats what we throw as a genuine error (it is not a
     *   `MiddlewareAbortError`, and `structuralInterruptFailure` does not match
     *   it) and rethrows it out of the generator.
     *
     * What that rethrow can and cannot achieve depends on the transport, because
     * this fan-out is awaited AFTER the adapter's `RUN_FINISHED` has already been
     * yielded (`chat()` yields terminal chunks while streaming, then awaits this
     * hook on its way out). The success terminal is therefore already gone; the
     * rethrow can only append to what the consumer saw, never retract it:
     *
     * - NON-DURABLE transport: the throw escapes the generator mid-response, and
     *   the SSE / HTTP-stream encoder turns it into a TRAILING `RUN_ERROR` on the
     *   wire carrying the store's own message and `code`. `ai-client` surfaces
     *   that as an error status, so the user is not told the turn was saved when
     *   it was not.
     * - DURABLE transport: the throw reaches the durability sink instead. The
     *   terminal was already persisted AND forwarded, so the sink deliberately
     *   does NOT append a second, contradictory terminal, and `terminalForwarded`
     *   (see `stream-to-response.ts`) suppresses the rethrow to the live consumer.
     *   The `RUN_FINISHED` stands and the failure is RECORDED SERVER-SIDE on the
     *   sink's `errors` channel. That is the intended outcome, not a gap: the save
     *   failed, not the run — the consumer did receive the complete stream, so
     *   telling it the run errored would be the lie. What the rethrow buys here is
     *   that the sink sees the failure at all; while this loop swallowed, the only
     *   trace anywhere was {@link captureTerminalHook}'s log line.
     *
     * Either way, swallowing is the one option ruled out: a failed
     * `messages.append` would otherwise leave a `completed` run record with the
     * assistant turn missing from storage and nothing beyond a middleware log
     * line, and the client would go on to send a history the server has no record
     * of.
     *
     * A single failure is rethrown AS-IS so the store's own error — its message,
     * `cause`, `code` and `instanceof` identity — is what reaches the caller and
     * the wire; wrapping the common case would bury it. Two or more become an
     * `AggregateError` (never a `MiddlewareAbortError`, so it cannot be mistaken
     * for an abort) rather than picking a winner and dropping the rest.
     */
    runOnFinish(ctx: ChatMiddlewareContext<TContext>, info: FinishInfo): Promise<void>;
    /**
     * Run onAbort on all middleware in order.
     *
     * ISOLATED and DELIBERATELY SWALLOWED. `onAbort` is a pure teardown fan-out
     * released from `chat()`'s `finally`, on a path where the outcome is already
     * decided: the run stopped, and the caller is being told why. A throw here has
     * nothing better to report than the abort reason it would DISPLACE — the
     * `finally` would surface a flaky store's error in place of "client
     * disconnected" — so failures are logged on the `errors` channel and go no
     * further. That is not a silent failure; it is refusing to let teardown
     * rewrite an outcome it did not produce.
     *
     * Isolation matters independently: these hooks release PER-MIDDLEWARE
     * resources (`withSandbox.onAbort` detaches or destroys the sandbox and stamps
     * `detachedSince`; `withPersistence.onAbort` records the run status through the
     * store), so an unguarded loop turns one transient store error into a
     * permanently leaked sandbox for every middleware ordered after it.
     */
    runOnAbort(ctx: ChatMiddlewareContext<TContext>, info: AbortInfo): Promise<void>;
    /**
     * Run onError on all middleware in order.
     *
     * ISOLATED and DELIBERATELY SWALLOWED, for the same reason as
     * {@link runOnAbort} and NOT merely because it is teardown: the run has
     * already failed, `info.error` IS that failure, and `chat()` rethrows it to the
     * caller the moment this fan-out returns. A propagated hook throw could only
     * REPLACE the run's real error with a teardown artifact — strictly less
     * information for the caller, who is already learning the run failed. Reporting
     * would buy nothing and cost the diagnosis, so failures are logged on the
     * `errors` channel and stop there.
     *
     * Contrast {@link runOnFinish}, where nothing else is telling the caller
     * anything is wrong — which is why that one reports.
     */
    runOnError(ctx: ChatMiddlewareContext<TContext>, info: ErrorInfo): Promise<void>;
    /**
     * Run onIteration on all middleware in order.
     * Called at the start of each agent loop iteration.
     */
    runOnIteration(ctx: ChatMiddlewareContext<TContext>, info: IterationInfo): Promise<void>;
    /**
     * Run onShouldContinue through middleware in order (AND semantics).
     * Any explicit `false` stops further iterations; `true` / void / undefined pass.
     * Called after `agentLoopStrategy` has already approved continuation.
     */
    runOnShouldContinue(ctx: ChatMiddlewareContext<TContext>, state: AgentLoopState): Promise<boolean>;
    /**
     * Run onToolPhaseComplete on all middleware in order.
     * Called after all tool calls in an iteration have been processed.
     */
    runOnToolPhaseComplete(ctx: ChatMiddlewareContext<TContext>, info: ToolPhaseCompleteInfo): Promise<void>;
}
