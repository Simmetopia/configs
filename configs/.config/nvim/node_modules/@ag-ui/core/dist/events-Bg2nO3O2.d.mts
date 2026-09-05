//#region src/types.d.ts
interface FunctionCall {
  name: string;
  arguments: string;
}
interface ToolCall {
  id: string;
  type: "function";
  function: FunctionCall;
  encryptedValue?: string;
}
interface TextInputContent {
  type: "text";
  text: string;
}
interface InputContentDataSource {
  type: "data";
  value: string;
  mimeType: string;
}
interface InputContentUrlSource {
  type: "url";
  value: string;
  mimeType?: string;
}
type InputContentSource = InputContentDataSource | InputContentUrlSource;
interface ImageInputContent {
  type: "image";
  source: InputContentSource;
  metadata?: unknown;
}
interface AudioInputContent {
  type: "audio";
  source: InputContentSource;
  metadata?: unknown;
}
interface VideoInputContent {
  type: "video";
  source: InputContentSource;
  metadata?: unknown;
}
interface DocumentInputContent {
  type: "document";
  source: InputContentSource;
  metadata?: unknown;
}
type ImageInputPart = ImageInputContent;
type AudioInputPart = AudioInputContent;
type VideoInputPart = VideoInputContent;
type DocumentInputPart = DocumentInputContent;
interface BinaryInputContent {
  type: "binary";
  mimeType: string;
  id?: string;
  url?: string;
  data?: string;
  filename?: string;
}
type InputContent = TextInputContent | ImageInputContent | AudioInputContent | VideoInputContent | DocumentInputContent | BinaryInputContent;
type InputContentPart = InputContent;
interface BaseMessageFields {
  id: string;
  name?: string;
  encryptedValue?: string;
}
interface DeveloperMessage extends BaseMessageFields {
  role: "developer";
  content: string;
}
interface SystemMessage extends BaseMessageFields {
  role: "system";
  content: string;
}
interface AssistantMessage extends BaseMessageFields {
  role: "assistant";
  content?: string;
  toolCalls?: ToolCall[];
}
interface UserMessage extends BaseMessageFields {
  role: "user";
  content: string | InputContent[];
}
interface ToolMessage {
  id: string;
  content: string;
  role: "tool";
  toolCallId: string;
  error?: string;
  encryptedValue?: string;
}
interface ActivityMessage {
  id: string;
  role: "activity";
  activityType: string;
  content: Record<string, any>;
}
interface ReasoningMessage {
  id: string;
  role: "reasoning";
  content: string;
  encryptedValue?: string;
}
type Message = DeveloperMessage | SystemMessage | AssistantMessage | UserMessage | ToolMessage | ActivityMessage | ReasoningMessage;
type Role = "developer" | "system" | "assistant" | "user" | "tool" | "activity" | "reasoning";
interface Context {
  description: string;
  value: string;
}
interface Tool {
  name: string;
  description: string;
  parameters?: any;
  metadata?: Record<string, any>;
}
interface Interrupt {
  id: string;
  reason: string;
  message?: string;
  toolCallId?: string;
  responseSchema?: Record<string, any>;
  expiresAt?: string;
  metadata?: Record<string, any>;
}
type ResumeStatus = "resolved" | "cancelled";
interface ResumeEntry {
  interruptId: string;
  status: ResumeStatus;
  payload?: any;
}
interface RunAgentInput {
  threadId: string;
  runId: string;
  parentRunId?: string;
  state?: any;
  messages: Message[];
  tools: Tool[];
  context: Context[];
  forwardedProps?: any;
  resume?: ResumeEntry[];
}
type State = any;
declare class AGUIError extends Error {
  constructor(message: string);
}
declare class AGUIConnectNotImplementedError extends AGUIError {
  constructor();
}
//#endregion
//#region src/events.d.ts
declare enum EventType {
  TEXT_MESSAGE_START = "TEXT_MESSAGE_START",
  TEXT_MESSAGE_CONTENT = "TEXT_MESSAGE_CONTENT",
  TEXT_MESSAGE_END = "TEXT_MESSAGE_END",
  TEXT_MESSAGE_CHUNK = "TEXT_MESSAGE_CHUNK",
  TOOL_CALL_START = "TOOL_CALL_START",
  TOOL_CALL_ARGS = "TOOL_CALL_ARGS",
  TOOL_CALL_END = "TOOL_CALL_END",
  TOOL_CALL_CHUNK = "TOOL_CALL_CHUNK",
  TOOL_CALL_RESULT = "TOOL_CALL_RESULT",
  /** @deprecated Use REASONING_START instead. Will be removed in 1.0.0. */
  THINKING_START = "THINKING_START",
  /** @deprecated Use REASONING_END instead. Will be removed in 1.0.0. */
  THINKING_END = "THINKING_END",
  /** @deprecated Use REASONING_MESSAGE_START instead. Will be removed in 1.0.0. */
  THINKING_TEXT_MESSAGE_START = "THINKING_TEXT_MESSAGE_START",
  /** @deprecated Use REASONING_MESSAGE_CONTENT instead. Will be removed in 1.0.0. */
  THINKING_TEXT_MESSAGE_CONTENT = "THINKING_TEXT_MESSAGE_CONTENT",
  /** @deprecated Use REASONING_MESSAGE_END instead. Will be removed in 1.0.0. */
  THINKING_TEXT_MESSAGE_END = "THINKING_TEXT_MESSAGE_END",
  STATE_SNAPSHOT = "STATE_SNAPSHOT",
  STATE_DELTA = "STATE_DELTA",
  MESSAGES_SNAPSHOT = "MESSAGES_SNAPSHOT",
  ACTIVITY_SNAPSHOT = "ACTIVITY_SNAPSHOT",
  ACTIVITY_DELTA = "ACTIVITY_DELTA",
  RAW = "RAW",
  CUSTOM = "CUSTOM",
  RUN_STARTED = "RUN_STARTED",
  RUN_FINISHED = "RUN_FINISHED",
  RUN_ERROR = "RUN_ERROR",
  STEP_STARTED = "STEP_STARTED",
  STEP_FINISHED = "STEP_FINISHED",
  REASONING_START = "REASONING_START",
  REASONING_MESSAGE_START = "REASONING_MESSAGE_START",
  REASONING_MESSAGE_CONTENT = "REASONING_MESSAGE_CONTENT",
  REASONING_MESSAGE_END = "REASONING_MESSAGE_END",
  REASONING_MESSAGE_CHUNK = "REASONING_MESSAGE_CHUNK",
  REASONING_END = "REASONING_END",
  REASONING_ENCRYPTED_VALUE = "REASONING_ENCRYPTED_VALUE"
}
type TextMessageRole = "developer" | "system" | "assistant" | "user";
type ReasoningEncryptedValueSubtype = "tool-call" | "message";
interface BaseEvent {
  type: EventType;
  timestamp?: number;
  rawEvent?: any;
  [k: string]: unknown;
}
type BaseEventFields = BaseEvent;
interface TextMessageStartEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_START;
  messageId: string;
  role: TextMessageRole;
  name?: string;
}
interface TextMessageContentEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_CONTENT;
  messageId: string;
  delta: string;
}
interface TextMessageEndEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_END;
  messageId: string;
}
interface TextMessageChunkEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_CHUNK;
  messageId?: string;
  role?: TextMessageRole;
  delta?: string;
  name?: string;
}
/** @deprecated Use ReasoningTextMessageStartEvent instead. Will be removed in 1.0.0. */
interface ThinkingTextMessageStartEvent extends BaseEvent {
  type: EventType.THINKING_TEXT_MESSAGE_START;
}
/** @deprecated Use ReasoningMessageContentEvent instead. Will be removed in 1.0.0. */
interface ThinkingTextMessageContentEvent extends BaseEvent {
  type: EventType.THINKING_TEXT_MESSAGE_CONTENT;
  delta: string;
}
/** @deprecated Use ReasoningMessageEndEvent instead. Will be removed in 1.0.0. */
interface ThinkingTextMessageEndEvent extends BaseEvent {
  type: EventType.THINKING_TEXT_MESSAGE_END;
}
interface ToolCallStartEvent extends BaseEvent {
  type: EventType.TOOL_CALL_START;
  toolCallId: string;
  toolCallName: string;
  parentMessageId?: string;
}
interface ToolCallArgsEvent extends BaseEvent {
  type: EventType.TOOL_CALL_ARGS;
  toolCallId: string;
  delta: string;
}
interface ToolCallEndEvent extends BaseEvent {
  type: EventType.TOOL_CALL_END;
  toolCallId: string;
}
interface ToolCallResultEvent extends BaseEvent {
  messageId: string;
  type: EventType.TOOL_CALL_RESULT;
  toolCallId: string;
  content: string;
  role?: "tool";
}
interface ToolCallChunkEvent extends BaseEvent {
  type: EventType.TOOL_CALL_CHUNK;
  toolCallId?: string;
  toolCallName?: string;
  parentMessageId?: string;
  delta?: string;
}
/** @deprecated Use ReasoningStartEvent instead. Will be removed in 1.0.0. */
interface ThinkingStartEvent extends BaseEvent {
  type: EventType.THINKING_START;
  title?: string;
}
/** @deprecated Use ReasoningEndEvent instead. Will be removed in 1.0.0. */
interface ThinkingEndEvent extends BaseEvent {
  type: EventType.THINKING_END;
}
interface StateSnapshotEvent extends BaseEvent {
  type: EventType.STATE_SNAPSHOT;
  snapshot?: any;
}
interface StateDeltaEvent extends BaseEvent {
  type: EventType.STATE_DELTA;
  delta: any[];
}
interface MessagesSnapshotEvent extends BaseEvent {
  type: EventType.MESSAGES_SNAPSHOT;
  messages: Message[];
}
interface ActivitySnapshotEvent extends BaseEvent {
  type: EventType.ACTIVITY_SNAPSHOT;
  messageId: string;
  activityType: string;
  content: Record<string, any>;
  replace: boolean;
}
interface ActivityDeltaEvent extends BaseEvent {
  type: EventType.ACTIVITY_DELTA;
  messageId: string;
  activityType: string;
  patch: any[];
}
interface RawEvent extends BaseEvent {
  type: EventType.RAW;
  event?: any;
  source?: string;
}
interface CustomEvent extends BaseEvent {
  type: EventType.CUSTOM;
  name: string;
  value?: any;
}
interface RunStartedEvent extends BaseEvent {
  type: EventType.RUN_STARTED;
  threadId: string;
  runId: string;
  parentRunId?: string;
  input?: RunAgentInput;
}
interface RunFinishedSuccessOutcome {
  type: "success";
}
interface RunFinishedInterruptOutcome {
  type: "interrupt";
  interrupts: Interrupt[];
}
type RunFinishedOutcome = RunFinishedSuccessOutcome | RunFinishedInterruptOutcome;
interface RunFinishedEvent extends BaseEvent {
  type: EventType.RUN_FINISHED;
  threadId: string;
  runId: string;
  result?: any;
  outcome?: RunFinishedOutcome;
}
interface RunErrorEvent extends BaseEvent {
  type: EventType.RUN_ERROR;
  message: string;
  code?: string;
}
interface StepStartedEvent extends BaseEvent {
  type: EventType.STEP_STARTED;
  stepName: string;
}
interface StepFinishedEvent extends BaseEvent {
  type: EventType.STEP_FINISHED;
  stepName: string;
}
interface ReasoningStartEvent extends BaseEvent {
  type: EventType.REASONING_START;
  messageId: string;
}
interface ReasoningMessageStartEvent extends BaseEvent {
  type: EventType.REASONING_MESSAGE_START;
  messageId: string;
  role: "reasoning";
}
interface ReasoningMessageContentEvent extends BaseEvent {
  type: EventType.REASONING_MESSAGE_CONTENT;
  messageId: string;
  delta: string;
}
interface ReasoningMessageEndEvent extends BaseEvent {
  type: EventType.REASONING_MESSAGE_END;
  messageId: string;
}
interface ReasoningMessageChunkEvent extends BaseEvent {
  type: EventType.REASONING_MESSAGE_CHUNK;
  messageId?: string;
  delta?: string;
}
interface ReasoningEndEvent extends BaseEvent {
  type: EventType.REASONING_END;
  messageId: string;
}
interface ReasoningEncryptedValueEvent extends BaseEvent {
  type: EventType.REASONING_ENCRYPTED_VALUE;
  subtype: ReasoningEncryptedValueSubtype;
  entityId: string;
  encryptedValue: string;
}
type AGUIEvent = TextMessageStartEvent | TextMessageContentEvent | TextMessageEndEvent | TextMessageChunkEvent | ThinkingStartEvent | ThinkingEndEvent | ThinkingTextMessageStartEvent | ThinkingTextMessageContentEvent | ThinkingTextMessageEndEvent | ToolCallStartEvent | ToolCallArgsEvent | ToolCallEndEvent | ToolCallChunkEvent | ToolCallResultEvent | StateSnapshotEvent | StateDeltaEvent | MessagesSnapshotEvent | ActivitySnapshotEvent | ActivityDeltaEvent | RawEvent | CustomEvent | RunStartedEvent | RunFinishedEvent | RunErrorEvent | StepStartedEvent | StepFinishedEvent | ReasoningStartEvent | ReasoningMessageStartEvent | ReasoningMessageContentEvent | ReasoningMessageEndEvent | ReasoningMessageChunkEvent | ReasoningEndEvent | ReasoningEncryptedValueEvent;
type AGUIEventByType = {
  [EventType.TEXT_MESSAGE_START]: TextMessageStartEvent;
  [EventType.TEXT_MESSAGE_CONTENT]: TextMessageContentEvent;
  [EventType.TEXT_MESSAGE_END]: TextMessageEndEvent;
  [EventType.TEXT_MESSAGE_CHUNK]: TextMessageChunkEvent;
  [EventType.THINKING_TEXT_MESSAGE_START]: ThinkingTextMessageStartEvent;
  [EventType.THINKING_TEXT_MESSAGE_CONTENT]: ThinkingTextMessageContentEvent;
  [EventType.THINKING_TEXT_MESSAGE_END]: ThinkingTextMessageEndEvent;
  [EventType.TOOL_CALL_START]: ToolCallStartEvent;
  [EventType.TOOL_CALL_ARGS]: ToolCallArgsEvent;
  [EventType.TOOL_CALL_END]: ToolCallEndEvent;
  [EventType.TOOL_CALL_CHUNK]: ToolCallChunkEvent;
  [EventType.TOOL_CALL_RESULT]: ToolCallResultEvent;
  [EventType.THINKING_START]: ThinkingStartEvent;
  [EventType.THINKING_END]: ThinkingEndEvent;
  [EventType.STATE_SNAPSHOT]: StateSnapshotEvent;
  [EventType.STATE_DELTA]: StateDeltaEvent;
  [EventType.MESSAGES_SNAPSHOT]: MessagesSnapshotEvent;
  [EventType.ACTIVITY_SNAPSHOT]: ActivitySnapshotEvent;
  [EventType.ACTIVITY_DELTA]: ActivityDeltaEvent;
  [EventType.RAW]: RawEvent;
  [EventType.CUSTOM]: CustomEvent;
  [EventType.RUN_STARTED]: RunStartedEvent;
  [EventType.RUN_FINISHED]: RunFinishedEvent;
  [EventType.RUN_ERROR]: RunErrorEvent;
  [EventType.STEP_STARTED]: StepStartedEvent;
  [EventType.STEP_FINISHED]: StepFinishedEvent;
  [EventType.REASONING_START]: ReasoningStartEvent;
  [EventType.REASONING_MESSAGE_START]: ReasoningMessageStartEvent;
  [EventType.REASONING_MESSAGE_CONTENT]: ReasoningMessageContentEvent;
  [EventType.REASONING_MESSAGE_END]: ReasoningMessageEndEvent;
  [EventType.REASONING_MESSAGE_CHUNK]: ReasoningMessageChunkEvent;
  [EventType.REASONING_END]: ReasoningEndEvent;
  [EventType.REASONING_ENCRYPTED_VALUE]: ReasoningEncryptedValueEvent;
};
type AGUIEventOf<T extends EventType> = AGUIEventByType[T];
type EventPayloadOf<T extends EventType> = Omit<AGUIEventOf<T>, keyof BaseEventFields>;
/**
 * Factory input for event `E`: the event minus its `type` discriminant.
 *
 * The `type?: never` member is load-bearing. `BaseEvent` carries an
 * `[k: string]: unknown` index signature to mirror the wire-level passthrough
 * behavior, and that index signature survives `Omit<E, "type">` — so without an
 * explicit `type` declaration, `{ type: EventType.RUN_ERROR, ... }` would satisfy
 * every event's Props and let a caller silently override the discriminant.
 */
type EventProps<E extends BaseEvent> = Omit<E, "type"> & {
  type?: never;
};
type BaseEventProps = Omit<BaseEvent, "type">;
type TextMessageStartEventProps = Omit<TextMessageStartEvent, "type" | "role"> & {
  role?: TextMessageRole;
  type?: never;
};
type TextMessageContentEventProps = EventProps<TextMessageContentEvent>;
type TextMessageEndEventProps = EventProps<TextMessageEndEvent>;
type TextMessageChunkEventProps = EventProps<TextMessageChunkEvent>;
type ThinkingTextMessageStartEventProps = EventProps<ThinkingTextMessageStartEvent>;
type ThinkingTextMessageContentEventProps = EventProps<ThinkingTextMessageContentEvent>;
type ThinkingTextMessageEndEventProps = EventProps<ThinkingTextMessageEndEvent>;
type ToolCallStartEventProps = EventProps<ToolCallStartEvent>;
type ToolCallArgsEventProps = EventProps<ToolCallArgsEvent>;
type ToolCallEndEventProps = EventProps<ToolCallEndEvent>;
type ToolCallChunkEventProps = EventProps<ToolCallChunkEvent>;
type ToolCallResultEventProps = EventProps<ToolCallResultEvent>;
type ThinkingStartEventProps = EventProps<ThinkingStartEvent>;
type ThinkingEndEventProps = EventProps<ThinkingEndEvent>;
type StateSnapshotEventProps = EventProps<StateSnapshotEvent>;
type StateDeltaEventProps = EventProps<StateDeltaEvent>;
type MessagesSnapshotEventProps = EventProps<MessagesSnapshotEvent>;
type ActivitySnapshotEventProps = Omit<ActivitySnapshotEvent, "type" | "replace"> & {
  replace?: boolean;
  type?: never;
};
type ActivityDeltaEventProps = EventProps<ActivityDeltaEvent>;
type RawEventProps = EventProps<RawEvent>;
type CustomEventProps = EventProps<CustomEvent>;
type RunStartedEventProps = EventProps<RunStartedEvent>;
type RunFinishedEventProps = EventProps<RunFinishedEvent>;
type RunErrorEventProps = EventProps<RunErrorEvent>;
type StepStartedEventProps = EventProps<StepStartedEvent>;
type StepFinishedEventProps = EventProps<StepFinishedEvent>;
type ReasoningStartEventProps = EventProps<ReasoningStartEvent>;
type ReasoningMessageStartEventProps = EventProps<ReasoningMessageStartEvent>;
type ReasoningMessageContentEventProps = EventProps<ReasoningMessageContentEvent>;
type ReasoningMessageEndEventProps = EventProps<ReasoningMessageEndEvent>;
type ReasoningMessageChunkEventProps = EventProps<ReasoningMessageChunkEvent>;
type ReasoningEndEventProps = EventProps<ReasoningEndEvent>;
type ReasoningEncryptedValueEventProps = EventProps<ReasoningEncryptedValueEvent>;
//#endregion
export { TextMessageChunkEventProps as $, State as $t, ReasoningMessageEndEventProps as A, AssistantMessage as At, RunFinishedOutcome as B, ImageInputPart as Bt, ReasoningEndEvent as C, ToolCallResultEvent as Ct, ReasoningMessageContentEvent as D, AGUIConnectNotImplementedError as Dt, ReasoningMessageChunkEventProps as E, ToolCallStartEventProps as Et, RunErrorEvent as F, DeveloperMessage as Ft, StateDeltaEventProps as G, InputContentUrlSource as Gt, RunStartedEvent as H, InputContentDataSource as Ht, RunErrorEventProps as I, DocumentInputContent as It, StepFinishedEvent as J, ReasoningMessage as Jt, StateSnapshotEvent as K, Interrupt as Kt, RunFinishedEvent as L, DocumentInputPart as Lt, ReasoningMessageStartEventProps as M, AudioInputPart as Mt, ReasoningStartEvent as N, BinaryInputContent as Nt, ReasoningMessageContentEventProps as O, AGUIError as Ot, ReasoningStartEventProps as P, Context as Pt, TextMessageChunkEvent as Q, RunAgentInput as Qt, RunFinishedEventProps as R, FunctionCall as Rt, ReasoningEncryptedValueSubtype as S, ToolCallEndEventProps as St, ReasoningMessageChunkEvent as T, ToolCallStartEvent as Tt, RunStartedEventProps as U, InputContentPart as Ut, RunFinishedSuccessOutcome as V, InputContent as Vt, StateDeltaEvent as W, InputContentSource as Wt, StepStartedEvent as X, ResumeStatus as Xt, StepFinishedEventProps as Y, ResumeEntry as Yt, StepStartedEventProps as Z, Role as Zt, MessagesSnapshotEventProps as _, ToolCallArgsEvent as _t, ActivityDeltaEventProps as a, UserMessage as an, TextMessageStartEvent as at, ReasoningEncryptedValueEvent as b, ToolCallChunkEventProps as bt, BaseEvent as c, ThinkingEndEventProps as ct, CustomEvent as d, ThinkingTextMessageContentEvent as dt, SystemMessage as en, TextMessageContentEvent as et, CustomEventProps as f, ThinkingTextMessageContentEventProps as ft, MessagesSnapshotEvent as g, ThinkingTextMessageStartEventProps as gt, EventType as h, ThinkingTextMessageStartEvent as ht, ActivityDeltaEvent as i, ToolMessage as in, TextMessageRole as it, ReasoningMessageStartEvent as j, AudioInputContent as jt, ReasoningMessageEndEvent as k, ActivityMessage as kt, BaseEventFields as l, ThinkingStartEvent as lt, EventProps as m, ThinkingTextMessageEndEventProps as mt, AGUIEventByType as n, Tool as nn, TextMessageEndEvent as nt, ActivitySnapshotEvent as o, VideoInputContent as on, TextMessageStartEventProps as ot, EventPayloadOf as p, ThinkingTextMessageEndEvent as pt, StateSnapshotEventProps as q, Message as qt, AGUIEventOf as r, ToolCall as rn, TextMessageEndEventProps as rt, ActivitySnapshotEventProps as s, VideoInputPart as sn, ThinkingEndEvent as st, AGUIEvent as t, TextInputContent as tn, TextMessageContentEventProps as tt, BaseEventProps as u, ThinkingStartEventProps as ut, RawEvent as v, ToolCallArgsEventProps as vt, ReasoningEndEventProps as w, ToolCallResultEventProps as wt, ReasoningEncryptedValueEventProps as x, ToolCallEndEvent as xt, RawEventProps as y, ToolCallChunkEvent as yt, RunFinishedInterruptOutcome as z, ImageInputContent as zt };
//# sourceMappingURL=events-Bg2nO3O2.d.mts.map