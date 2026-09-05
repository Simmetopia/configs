import { InterruptDefinition } from '../../interrupt-definition.js';
import { AnyTextAdapter } from './adapter.js';
import { AnyTool, ChatStream, ConstrainedModelMessage, InferSchemaType, LazyToolsConfig, ModelMessage, ProviderTool, SchemaInput, StructuredOutputStream, TextOptions, UIMessage } from '../../types.js';
import { AnyChatMiddleware, ChatMiddleware } from './middleware/types.js';
import { CheckCoverage } from './middleware/builder.js';
import { SystemPrompt } from '../../system-prompts.js';
import { DebugOption } from '../../logger/types.js';
import { ContextFromMiddleware, ContextFromTool, DefinedContext, MergeContext, UnionToIntersection } from './runtime-context-types.js';
import { ChatMCPOptions } from './mcp/types.js';
/** The adapter kind this activity handles */
export declare const kind: "text";
type AnyRuntimeTool = AnyTool;
type ContextFromConsumer<T> = ContextFromTool<T> | ContextFromMiddleware<T>;
type RequiredContextFromConsumerUnion<T> = T extends unknown ? undefined extends ContextFromConsumer<T> ? never : ContextFromConsumer<T> : never;
type ContextFromConsumerUnion<T> = [
    UnionToIntersection<DefinedContext<ContextFromConsumer<T>>>
] extends [never] ? never : [RequiredContextFromConsumerUnion<T>] extends [never] ? UnionToIntersection<DefinedContext<ContextFromConsumer<T>>> | undefined : UnionToIntersection<DefinedContext<ContextFromConsumer<T>>>;
type ContextFromArray<T> = T extends readonly [infer THead, ...infer TTail] ? MergeContext<ContextFromConsumer<THead>, ContextFromArray<TTail>> : T extends ReadonlyArray<infer TItem> ? ContextFromConsumerUnion<TItem> : never;
type ContextFromInputs<TTools, TMiddleware> = MergeContext<ContextFromArray<NonNullable<TTools>>, ContextFromArray<NonNullable<TMiddleware>>>;
type InferredContext<TTools, TMiddleware> = [
    ContextFromInputs<TTools, TMiddleware>
] extends [never] ? unknown : ContextFromInputs<TTools, TMiddleware>;
type RegistryInterrupt<TInterrupts extends ReadonlyArray<InterruptDefinition<any, any, any, any>>> = [TInterrupts[number]] extends [never] ? never : TInterrupts[number];
type DuplicateInterruptDefinitionId<TInterrupts extends ReadonlyArray<InterruptDefinition<any, any, any, any>>, TSeenIds extends string = never> = TInterrupts extends readonly [infer THead, ...infer TTail] ? THead extends InterruptDefinition<infer TId, any, any, any> ? string extends TId ? TTail extends ReadonlyArray<InterruptDefinition<any, any, any, any>> ? DuplicateInterruptDefinitionId<TTail, TSeenIds> : never : TId extends TSeenIds ? TId : TTail extends ReadonlyArray<InterruptDefinition<any, any, any, any>> ? DuplicateInterruptDefinitionId<TTail, TSeenIds | TId> : never : never : never;
type CheckUniqueInterruptDefinitions<TInterrupts extends ReadonlyArray<InterruptDefinition<any, any, any, any>>> = [DuplicateInterruptDefinitionId<TInterrupts>] extends [never] ? unknown : {
    readonly '✖ Duplicate interrupt definition id in chat({ interrupts }).': never;
};
type InlineChatContext<TTools, TContext> = MergeContext<ContextFromArray<NonNullable<TTools>>, TContext>;
type RegistryChatMiddleware<TContext, TInterrupts extends ReadonlyArray<InterruptDefinition<any, any, any, any>>> = ChatMiddleware<TContext, RegistryInterrupt<TInterrupts>>;
type MiddlewareInterruptDefinitions<TMiddleware> = TMiddleware extends ReadonlyArray<infer TMiddlewareItem> ? TMiddlewareItem extends ChatMiddleware<any, infer TDefinitions> ? TDefinitions : never : never;
type IsAny<TValue> = 0 extends 1 & TValue ? true : false;
type CheckInterruptRegistry<TInterrupts extends ReadonlyArray<InterruptDefinition<any, any, any, any>>, TMiddleware> = IsAny<MiddlewareInterruptDefinitions<TMiddleware>> extends true ? unknown : [MiddlewareInterruptDefinitions<TMiddleware>] extends [never] ? unknown : [
    Exclude<MiddlewareInterruptDefinitions<TMiddleware>, RegistryInterrupt<TInterrupts>>
] extends [never] ? unknown : {
    readonly '✖ Middleware emits an interrupt definition that is not registered in chat({ interrupts }).': never;
};
type RuntimeContextOption<TTools, TMiddleware, TContext> = [
    MergeContext<ContextFromInputs<TTools, TMiddleware>, TContext>
] extends [never] ? {
    context?: TContext;
} : undefined extends MergeContext<ContextFromInputs<TTools, TMiddleware>, TContext> ? {
    context?: MergeContext<ContextFromInputs<TTools, TMiddleware>, TContext>;
} : {
    context: MergeContext<ContextFromInputs<TTools, TMiddleware>, TContext>;
};
type ExactMiddlewareOption<TTools, TContext, TInterrupts extends ReadonlyArray<InterruptDefinition<any, any, any, any>>, TMiddleware extends Array<unknown> | undefined> = [TMiddleware] extends [undefined] ? Array<RegistryChatMiddleware<InlineChatContext<TTools, TContext>, NoInfer<TInterrupts>>> : TMiddleware & (TMiddleware extends Array<RegistryChatMiddleware<InlineChatContext<TTools, NoInfer<TContext>>, NoInfer<TInterrupts>>> ? Array<RegistryChatMiddleware<InlineChatContext<TTools, TContext>, NoInfer<TInterrupts>>> : CheckInterruptRegistry<TInterrupts, TMiddleware>) & CheckCoverage<Extract<TMiddleware, ReadonlyArray<AnyChatMiddleware>>>;
type TextActivityOptionsWithContext<TAdapter extends AnyTextAdapter, TSchema extends SchemaInput | undefined, TStream extends boolean, TTools extends TextActivityOptions<TAdapter, TSchema, TStream, any>['tools'], TInterrupts extends ReadonlyArray<InterruptDefinition<any, any, any, any>> = [
], TContext = unknown, TMiddleware extends Array<unknown> | undefined = undefined> = Omit<TextActivityOptions<TAdapter, TSchema, TStream, any>, 'tools' | 'middleware' | 'context' | 'interrupts'> & {
    tools?: TTools;
    interrupts?: TInterrupts & CheckUniqueInterruptDefinitions<TInterrupts>;
    middleware?: ExactMiddlewareOption<TTools, TContext, TInterrupts, TMiddleware>;
} & RuntimeContextOption<TTools, TMiddleware, TContext>;
/**
 * Options for the text activity.
 * Types are extracted directly from the adapter (which has pre-resolved generics).
 *
 * @template TAdapter - The text adapter type (created by a provider function)
 * @template TSchema - Optional Standard Schema for structured output
 * @template TStream - Whether to stream the output (default: true)
 * @template TContext - Runtime context value threaded to middleware hooks and server tools
 */
export interface TextActivityOptions<TAdapter extends AnyTextAdapter, TSchema extends SchemaInput | undefined, TStream extends boolean, TContext = unknown> {
    /** The text adapter to use (created by a provider function like openaiText('gpt-5.5')) */
    adapter: TAdapter;
    /**
     * Conversation messages. Accepts:
     * - `ConstrainedModelMessage` — content types constrained by the adapter's input modalities.
     * - `ModelMessage` — unconstrained model message (e.g., forwarded from an AG-UI wire payload).
     * - `UIMessage` — parts-based UI representation; converted internally via `convertMessagesToModelMessages`.
     *
     * The three shapes can be mixed in a single array (e.g., when forwarding a wire payload that includes both anchor UIMessages and AG-UI fan-out ModelMessages).
     */
    messages?: Array<UIMessage | ModelMessage | ConstrainedModelMessage<{
        inputModalities: TAdapter['~types']['inputModalities'];
        messageMetadataByModality: TAdapter['~types']['messageMetadataByModality'];
    }>> | undefined;
    /**
     * System prompts to prepend to the conversation.
     *
     * Accepts plain strings or `{ content, metadata }` objects. The `metadata`
     * field is typed by the adapter — Anthropic narrows it to
     * `AnthropicSystemPromptMetadata` (with `cache_control` for prompt
     * caching), providers without per-prompt metadata reject the field
     * entirely.
     */
    systemPrompts?: Array<SystemPrompt<TAdapter['~types']['systemPromptMetadata']>> | undefined;
    /**
     * Tools for function calling (auto-executed when called).
     *
     * Accepts two shapes:
     *  - User-defined tools via `toolDefinition()` — plain `Tool`, always assignable.
     *  - Provider tools from `@tanstack/ai-<provider>/tools` (e.g. `webSearchTool`)
     *    — branded and type-checked against the selected model's
     *    `supports.tools` list. Passing an unsupported tool produces a
     *    compile-time error on the array element.
     */
    tools?: ReadonlyArray<(AnyRuntimeTool & {
        readonly '~toolKind'?: never;
    }) | ProviderTool<string, TAdapter['~types']['toolCapabilities'][number]>> | undefined;
    /**
     * Hand MCP clients/pools to chat(): their tools are discovered at run start
     * and merged into the run; `connection` controls whether chat() closes them
     * when the run ends. See docs/tools/mcp.md "Managing MCP clients with chat()".
     */
    mcp?: ChatMCPOptions;
    /** Additional metadata to attach to the request. */
    metadata?: TextOptions['metadata'];
    /** Model-specific provider options (type comes from adapter) */
    modelOptions?: TAdapter['~types']['providerOptions'];
    /** AbortController for cancellation */
    abortController?: TextOptions['abortController'];
    /** Strategy for controlling the agent loop */
    agentLoopStrategy?: TextOptions['agentLoopStrategy'];
    /**
     * Optional configuration for lazy-tool discovery (tools marked `lazy: true`).
     * Tunes how much of each lazy tool's description appears in the discovery
     * catalog. Optional — defaults to `{ includeDescription: 'none' }`.
     */
    lazyToolsConfig?: LazyToolsConfig;
    /** Unique conversation identifier for tracking */
    conversationId?: TextOptions['conversationId'];
    /** Thread/conversation ID for AG-UI protocol. Auto-generated if not provided. */
    threadId?: TextOptions['threadId'];
    /** Run ID override for AG-UI protocol. Auto-generated by adapter if not provided. */
    runId?: TextOptions['runId'];
    /** Parent run ID for AG-UI protocol nested run correlation. */
    parentRunId?: TextOptions['parentRunId'];
    /** Application state mirrored in a STATE_SNAPSHOT before an interrupt terminal. */
    state?: TextOptions['state'];
    /**
     * AG-UI interrupt resume responses. Persistence middleware validates these
     * before accepting new input on a thread with pending interrupts.
     */
    resume?: TextOptions['resume'];
    /**
     * Optional Standard Schema for structured output.
     * When provided, the activity will:
     * 1. Run the full agentic loop (executing tools as needed)
     * 2. Once complete, return a Promise with the parsed output matching the schema
     *
     * Supports any Standard Schema compliant library (Zod v4+, ArkType, Valibot, etc.)
     *
     * @example
     * ```ts
     * const result = await chat({
     *   adapter: openaiText('gpt-5.5'),
     *   messages: [{ role: 'user', content: 'Generate a person' }],
     *   outputSchema: z.object({ name: z.string(), age: z.number() })
     * })
     * // result is { name: string, age: number }
     * ```
     */
    outputSchema?: TSchema;
    /**
     * Whether to stream the text result.
     * When true (default), returns a ChatStream for streaming output.
     * When false, returns a Promise<string> with the collected text content.
     *
     * Note: If outputSchema is provided, this option is ignored and the result
     * is always a Promise<InferSchemaType<TSchema>>.
     *
     * @default true
     *
     * @example Non-streaming text
     * ```ts
     * const text = await chat({
     *   adapter: openaiText('gpt-5.5'),
     *   messages: [{ role: 'user', content: 'Hello!' }],
     *   stream: false
     * })
     * // text is a string with the full response
     * ```
     */
    stream?: TStream;
    /**
     * Optional middleware array for observing/transforming chat behavior.
     * Middleware hooks are called in array order. See {@link ChatMiddleware} for available hooks.
     *
     * @example
     * ```ts
     * const stream = chat({
     *   adapter: openaiText('gpt-5.5'),
     *   messages: [...],
     *   middleware: [loggingMiddleware, redactionMiddleware],
     * })
     * ```
     */
    middleware?: Array<ChatMiddleware<TContext>>;
    /**
     * First-party generic interrupt definitions for this chat call.
     * Register the same definitions on the client to type payloads and answers.
     */
    interrupts?: ReadonlyArray<InterruptDefinition<any, any, any, any>>;
    /**
     * Runtime context value passed to middleware hooks and server tools.
     */
    context?: TContext;
    /**
     * Enable debug logging. Pass `true` to enable all categories with the default
     * console logger, `false` to silence everything, or a `DebugConfig` object for
     * granular control and/or a custom `Logger`. Defaults to `undefined`, which
     * means only the `errors` category is active.
     */
    debug?: DebugOption;
}
/**
 * Create typed options for the chat() function without executing.
 * This is useful for pre-defining configurations with full type inference.
 *
 * @example
 * ```ts
 * const chatOptions = createChatOptions({
 *   adapter: anthropicText('claude-sonnet-4-5'),
 * })
 *
 * const stream = chat({ ...chatOptions, messages })
 * ```
 */
export declare function createChatOptions<TAdapter extends AnyTextAdapter, TSchema extends SchemaInput | undefined = undefined, TStream extends boolean = true, const TTools extends TextActivityOptions<TAdapter, TSchema, TStream, any>['tools'] = TextActivityOptions<TAdapter, TSchema, TStream, any>['tools'], const TInterrupts extends ReadonlyArray<InterruptDefinition<any, any, any, any>> = [], TContext = unknown, const TMiddleware extends Array<unknown> | undefined = undefined>(options: TextActivityOptionsWithContext<TAdapter, TSchema, TStream, TTools, TInterrupts, TContext, TMiddleware>): Omit<TextActivityOptions<TAdapter, TSchema, TStream, InferredContext<TTools, TMiddleware>>, 'tools' | 'middleware' | 'interrupts' | 'context'> & {
    tools?: TTools;
    interrupts?: TInterrupts;
    middleware?: ExactMiddlewareOption<TTools, TContext, TInterrupts, TMiddleware>;
} & RuntimeContextOption<TTools, TMiddleware, TContext>;
/**
 * Result type for the text activity.
 * - If outputSchema is provided AND stream is explicitly true:
 *   StructuredOutputStream<InferSchemaType<TSchema>> — yields raw JSON deltas
 *   via TEXT_MESSAGE_CONTENT plus a terminal StructuredOutputCompleteEvent
 *   carrying the validated object.
 * - If outputSchema is provided without explicit stream:true:
 *   Promise<InferSchemaType<TSchema>>.
 * - If stream is explicitly false (no schema): Promise<string>.
 * - Otherwise (default): ChatStream.
 *
 * `[TStream] extends [true]` is used (not `TStream extends true`) so that the
 * default `boolean` value of `TStream` does *not* match the streaming branch.
 * Without this, plain `chat({ outputSchema })` would type as a stream while
 * the runtime returns a Promise — see issue #526.
 */
export type TextActivityResult<TSchema extends SchemaInput | undefined, TStream extends boolean = boolean, TTools = ReadonlyArray<AnyTool>> = TSchema extends SchemaInput ? [TStream] extends [true] ? StructuredOutputStream<InferSchemaType<TSchema>> : Promise<InferSchemaType<TSchema>> : [TStream] extends [false] ? Promise<string> : TTools extends infer _TTools ? ChatStream : ChatStream;
/**
 * Text activity - handles agentic text generation, one-shot text generation, and agentic structured output.
 *
 * This activity supports four modes:
 * 1. **Streaming agentic text**: Stream responses with automatic tool execution
 * 2. **Streaming one-shot text**: Simple streaming request/response without tools
 * 3. **Non-streaming text**: Returns collected text as a string (stream: false)
 * 4. **Agentic structured output**: Run tools, then return structured data
 *
 * @example Full agentic text (streaming with tools)
 * ```ts
 * import { chat } from '@tanstack/ai'
 * import { openaiText } from '@tanstack/ai-openai'
 *
 * for await (const chunk of chat({
 *   adapter: openaiText('gpt-5.5'),
 *   messages: [{ role: 'user', content: 'What is the weather?' }],
 *   tools: [weatherTool]
 * })) {
 *   if (chunk.type === 'TEXT_MESSAGE_CONTENT') {
 *     console.log(chunk.delta)
 *   }
 * }
 * ```
 *
 * @example One-shot text (streaming without tools)
 * ```ts
 * for await (const chunk of chat({
 *   adapter: openaiText('gpt-5.5'),
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * })) {
 *   console.log(chunk)
 * }
 * ```
 *
 * @example Non-streaming text (stream: false)
 * ```ts
 * const text = await chat({
 *   adapter: openaiText('gpt-5.5'),
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   stream: false
 * })
 * // text is a string with the full response
 * ```
 *
 * @example Agentic structured output (tools + structured response)
 * ```ts
 * import { z } from 'zod'
 *
 * const result = await chat({
 *   adapter: openaiText('gpt-5.5'),
 *   messages: [{ role: 'user', content: 'Research and summarize the topic' }],
 *   tools: [researchTool, analyzeTool],
 *   outputSchema: z.object({
 *     summary: z.string(),
 *     keyPoints: z.array(z.string())
 *   })
 * })
 * // result is { summary: string, keyPoints: string[] }
 * ```
 */
export declare function chat<TAdapter extends AnyTextAdapter, TSchema extends SchemaInput | undefined = undefined, TStream extends boolean = boolean, const TTools extends TextActivityOptions<TAdapter, TSchema, TStream, any>['tools'] = TextActivityOptions<TAdapter, TSchema, TStream, any>['tools'], const TInterrupts extends ReadonlyArray<InterruptDefinition<any, any, any, any>> = [], TContext = unknown, const TMiddleware extends Array<unknown> | undefined = undefined>(options: TextActivityOptionsWithContext<TAdapter, TSchema, TStream, TTools, TInterrupts, TContext, TMiddleware>): TextActivityResult<TSchema, TStream, TTools>;
export type { TextAdapter, TextAdapterConfig, StructuredOutputOptions, StructuredOutputResult, } from './adapter.js';
export { BaseTextAdapter } from './adapter.js';
