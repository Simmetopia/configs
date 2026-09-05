import { $ as TextMessageChunkEventProps, A as ReasoningMessageEndEventProps, C as ReasoningEndEvent, Ct as ToolCallResultEvent, D as ReasoningMessageContentEvent, E as ReasoningMessageChunkEventProps, Et as ToolCallStartEventProps, F as RunErrorEvent, G as StateDeltaEventProps, H as RunStartedEvent, I as RunErrorEventProps, J as StepFinishedEvent, K as StateSnapshotEvent, Kt as Interrupt, L as RunFinishedEvent, M as ReasoningMessageStartEventProps, N as ReasoningStartEvent, O as ReasoningMessageContentEventProps, P as ReasoningStartEventProps, Q as TextMessageChunkEvent, R as RunFinishedEventProps, St as ToolCallEndEventProps, T as ReasoningMessageChunkEvent, Tt as ToolCallStartEvent, U as RunStartedEventProps, W as StateDeltaEvent, X as StepStartedEvent, Y as StepFinishedEventProps, Z as StepStartedEventProps, _ as MessagesSnapshotEventProps, _t as ToolCallArgsEvent, a as ActivityDeltaEventProps, at as TextMessageStartEvent, b as ReasoningEncryptedValueEvent, bt as ToolCallChunkEventProps, ct as ThinkingEndEventProps, d as CustomEvent, dt as ThinkingTextMessageContentEvent, et as TextMessageContentEvent, f as CustomEventProps, ft as ThinkingTextMessageContentEventProps, g as MessagesSnapshotEvent, gt as ThinkingTextMessageStartEventProps, h as EventType, ht as ThinkingTextMessageStartEvent, i as ActivityDeltaEvent, j as ReasoningMessageStartEvent, k as ReasoningMessageEndEvent, lt as ThinkingStartEvent, mt as ThinkingTextMessageEndEventProps, nt as TextMessageEndEvent, o as ActivitySnapshotEvent, ot as TextMessageStartEventProps, pt as ThinkingTextMessageEndEvent, q as StateSnapshotEventProps, rt as TextMessageEndEventProps, s as ActivitySnapshotEventProps, st as ThinkingEndEvent, tt as TextMessageContentEventProps, ut as ThinkingStartEventProps, v as RawEvent, vt as ToolCallArgsEventProps, w as ReasoningEndEventProps, wt as ToolCallResultEventProps, x as ReasoningEncryptedValueEventProps, xt as ToolCallEndEvent, y as RawEventProps, yt as ToolCallChunkEvent } from "./events-Bg2nO3O2.mjs";
import { z } from "zod/v4";

//#region src/schemas.d.ts
declare const EventTypeSchema: z.ZodEnum<{
  TEXT_MESSAGE_START: "TEXT_MESSAGE_START";
  TEXT_MESSAGE_CONTENT: "TEXT_MESSAGE_CONTENT";
  TEXT_MESSAGE_END: "TEXT_MESSAGE_END";
  TEXT_MESSAGE_CHUNK: "TEXT_MESSAGE_CHUNK";
  TOOL_CALL_START: "TOOL_CALL_START";
  TOOL_CALL_ARGS: "TOOL_CALL_ARGS";
  TOOL_CALL_END: "TOOL_CALL_END";
  TOOL_CALL_CHUNK: "TOOL_CALL_CHUNK";
  TOOL_CALL_RESULT: "TOOL_CALL_RESULT";
  THINKING_START: "THINKING_START";
  THINKING_END: "THINKING_END";
  THINKING_TEXT_MESSAGE_START: "THINKING_TEXT_MESSAGE_START";
  THINKING_TEXT_MESSAGE_CONTENT: "THINKING_TEXT_MESSAGE_CONTENT";
  THINKING_TEXT_MESSAGE_END: "THINKING_TEXT_MESSAGE_END";
  STATE_SNAPSHOT: "STATE_SNAPSHOT";
  STATE_DELTA: "STATE_DELTA";
  MESSAGES_SNAPSHOT: "MESSAGES_SNAPSHOT";
  ACTIVITY_SNAPSHOT: "ACTIVITY_SNAPSHOT";
  ACTIVITY_DELTA: "ACTIVITY_DELTA";
  RAW: "RAW";
  CUSTOM: "CUSTOM";
  RUN_STARTED: "RUN_STARTED";
  RUN_FINISHED: "RUN_FINISHED";
  RUN_ERROR: "RUN_ERROR";
  STEP_STARTED: "STEP_STARTED";
  STEP_FINISHED: "STEP_FINISHED";
  REASONING_START: "REASONING_START";
  REASONING_MESSAGE_START: "REASONING_MESSAGE_START";
  REASONING_MESSAGE_CONTENT: "REASONING_MESSAGE_CONTENT";
  REASONING_MESSAGE_END: "REASONING_MESSAGE_END";
  REASONING_MESSAGE_CHUNK: "REASONING_MESSAGE_CHUNK";
  REASONING_END: "REASONING_END";
  REASONING_ENCRYPTED_VALUE: "REASONING_ENCRYPTED_VALUE";
}>;
declare const FunctionCallSchema: z.ZodObject<{
  name: z.ZodString;
  arguments: z.ZodString;
}, z.core.$strip>;
declare const ToolCallSchema: z.ZodObject<{
  id: z.ZodString;
  type: z.ZodLiteral<"function">;
  function: z.ZodObject<{
    name: z.ZodString;
    arguments: z.ZodString;
  }, z.core.$strip>;
  encryptedValue: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const TextInputContentSchema: z.ZodObject<{
  type: z.ZodLiteral<"text">;
  text: z.ZodString;
}, z.core.$strip>;
declare const InputContentDataSourceSchema: z.ZodObject<{
  type: z.ZodLiteral<"data">;
  value: z.ZodString;
  mimeType: z.ZodString;
}, z.core.$strip>;
declare const InputContentUrlSourceSchema: z.ZodObject<{
  type: z.ZodLiteral<"url">;
  value: z.ZodString;
  mimeType: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const InputContentSourceSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
  type: z.ZodLiteral<"data">;
  value: z.ZodString;
  mimeType: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
  type: z.ZodLiteral<"url">;
  value: z.ZodString;
  mimeType: z.ZodOptional<z.ZodString>;
}, z.core.$strip>]>;
declare const ImageInputContentSchema: z.ZodObject<{
  type: z.ZodLiteral<"image">;
  source: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"data">;
    value: z.ZodString;
    mimeType: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"url">;
    value: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>;
  metadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
declare const AudioInputContentSchema: z.ZodObject<{
  type: z.ZodLiteral<"audio">;
  source: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"data">;
    value: z.ZodString;
    mimeType: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"url">;
    value: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>;
  metadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
declare const VideoInputContentSchema: z.ZodObject<{
  type: z.ZodLiteral<"video">;
  source: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"data">;
    value: z.ZodString;
    mimeType: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"url">;
    value: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>;
  metadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
declare const DocumentInputContentSchema: z.ZodObject<{
  type: z.ZodLiteral<"document">;
  source: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"data">;
    value: z.ZodString;
    mimeType: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"url">;
    value: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>;
  metadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
declare const ImageInputPartSchema: z.ZodObject<{
  type: z.ZodLiteral<"image">;
  source: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"data">;
    value: z.ZodString;
    mimeType: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"url">;
    value: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>;
  metadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
declare const AudioInputPartSchema: z.ZodObject<{
  type: z.ZodLiteral<"audio">;
  source: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"data">;
    value: z.ZodString;
    mimeType: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"url">;
    value: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>;
  metadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
declare const VideoInputPartSchema: z.ZodObject<{
  type: z.ZodLiteral<"video">;
  source: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"data">;
    value: z.ZodString;
    mimeType: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"url">;
    value: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>;
  metadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
declare const DocumentInputPartSchema: z.ZodObject<{
  type: z.ZodLiteral<"document">;
  source: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"data">;
    value: z.ZodString;
    mimeType: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"url">;
    value: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>;
  metadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
declare const BinaryInputContentSchema: z.ZodObject<{
  type: z.ZodLiteral<"binary">;
  mimeType: z.ZodString;
  id: z.ZodOptional<z.ZodString>;
  url: z.ZodOptional<z.ZodString>;
  data: z.ZodOptional<z.ZodString>;
  filename: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const InputContentSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
  type: z.ZodLiteral<"text">;
  text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
  type: z.ZodLiteral<"image">;
  source: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"data">;
    value: z.ZodString;
    mimeType: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"url">;
    value: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>;
  metadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
  type: z.ZodLiteral<"audio">;
  source: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"data">;
    value: z.ZodString;
    mimeType: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"url">;
    value: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>;
  metadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
  type: z.ZodLiteral<"video">;
  source: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"data">;
    value: z.ZodString;
    mimeType: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"url">;
    value: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>;
  metadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
  type: z.ZodLiteral<"document">;
  source: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"data">;
    value: z.ZodString;
    mimeType: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"url">;
    value: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>;
  metadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
  type: z.ZodLiteral<"binary">;
  mimeType: z.ZodString;
  id: z.ZodOptional<z.ZodString>;
  url: z.ZodOptional<z.ZodString>;
  data: z.ZodOptional<z.ZodString>;
  filename: z.ZodOptional<z.ZodString>;
}, z.core.$strip>]>;
declare const InputContentPartSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
  type: z.ZodLiteral<"text">;
  text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
  type: z.ZodLiteral<"image">;
  source: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"data">;
    value: z.ZodString;
    mimeType: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"url">;
    value: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>;
  metadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
  type: z.ZodLiteral<"audio">;
  source: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"data">;
    value: z.ZodString;
    mimeType: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"url">;
    value: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>;
  metadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
  type: z.ZodLiteral<"video">;
  source: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"data">;
    value: z.ZodString;
    mimeType: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"url">;
    value: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>;
  metadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
  type: z.ZodLiteral<"document">;
  source: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"data">;
    value: z.ZodString;
    mimeType: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"url">;
    value: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>;
  metadata: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
  type: z.ZodLiteral<"binary">;
  mimeType: z.ZodString;
  id: z.ZodOptional<z.ZodString>;
  url: z.ZodOptional<z.ZodString>;
  data: z.ZodOptional<z.ZodString>;
  filename: z.ZodOptional<z.ZodString>;
}, z.core.$strip>]>;
declare const DeveloperMessageSchema: z.ZodObject<{
  id: z.ZodString;
  name: z.ZodOptional<z.ZodString>;
  encryptedValue: z.ZodOptional<z.ZodString>;
  role: z.ZodLiteral<"developer">;
  content: z.ZodString;
}, z.core.$strip>;
declare const SystemMessageSchema: z.ZodObject<{
  id: z.ZodString;
  name: z.ZodOptional<z.ZodString>;
  encryptedValue: z.ZodOptional<z.ZodString>;
  role: z.ZodLiteral<"system">;
  content: z.ZodString;
}, z.core.$strip>;
declare const AssistantMessageSchema: z.ZodObject<{
  id: z.ZodString;
  name: z.ZodOptional<z.ZodString>;
  encryptedValue: z.ZodOptional<z.ZodString>;
  role: z.ZodLiteral<"assistant">;
  content: z.ZodOptional<z.ZodString>;
  toolCalls: z.ZodOptional<z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"function">;
    function: z.ZodObject<{
      name: z.ZodString;
      arguments: z.ZodString;
    }, z.core.$strip>;
    encryptedValue: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>>>;
}, z.core.$strip>;
declare const UserMessageSchema: z.ZodObject<{
  id: z.ZodString;
  name: z.ZodOptional<z.ZodString>;
  encryptedValue: z.ZodOptional<z.ZodString>;
  role: z.ZodLiteral<"user">;
  content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"image">;
    source: z.ZodDiscriminatedUnion<[z.ZodObject<{
      type: z.ZodLiteral<"data">;
      value: z.ZodString;
      mimeType: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"url">;
      value: z.ZodString;
      mimeType: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>;
    metadata: z.ZodOptional<z.ZodUnknown>;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"audio">;
    source: z.ZodDiscriminatedUnion<[z.ZodObject<{
      type: z.ZodLiteral<"data">;
      value: z.ZodString;
      mimeType: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"url">;
      value: z.ZodString;
      mimeType: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>;
    metadata: z.ZodOptional<z.ZodUnknown>;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"video">;
    source: z.ZodDiscriminatedUnion<[z.ZodObject<{
      type: z.ZodLiteral<"data">;
      value: z.ZodString;
      mimeType: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"url">;
      value: z.ZodString;
      mimeType: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>;
    metadata: z.ZodOptional<z.ZodUnknown>;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"document">;
    source: z.ZodDiscriminatedUnion<[z.ZodObject<{
      type: z.ZodLiteral<"data">;
      value: z.ZodString;
      mimeType: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"url">;
      value: z.ZodString;
      mimeType: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>;
    metadata: z.ZodOptional<z.ZodUnknown>;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"binary">;
    mimeType: z.ZodString;
    id: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    data: z.ZodOptional<z.ZodString>;
    filename: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>>]>;
}, z.core.$strip>;
declare const ToolMessageSchema: z.ZodObject<{
  id: z.ZodString;
  content: z.ZodString;
  role: z.ZodLiteral<"tool">;
  toolCallId: z.ZodString;
  error: z.ZodOptional<z.ZodString>;
  encryptedValue: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const ActivityMessageSchema: z.ZodObject<{
  id: z.ZodString;
  role: z.ZodLiteral<"activity">;
  activityType: z.ZodString;
  content: z.ZodRecord<z.ZodString, z.ZodAny>;
}, z.core.$strip>;
declare const ReasoningMessageSchema: z.ZodObject<{
  id: z.ZodString;
  role: z.ZodLiteral<"reasoning">;
  content: z.ZodString;
  encryptedValue: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const MessageSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
  id: z.ZodString;
  name: z.ZodOptional<z.ZodString>;
  encryptedValue: z.ZodOptional<z.ZodString>;
  role: z.ZodLiteral<"developer">;
  content: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
  id: z.ZodString;
  name: z.ZodOptional<z.ZodString>;
  encryptedValue: z.ZodOptional<z.ZodString>;
  role: z.ZodLiteral<"system">;
  content: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
  id: z.ZodString;
  name: z.ZodOptional<z.ZodString>;
  encryptedValue: z.ZodOptional<z.ZodString>;
  role: z.ZodLiteral<"assistant">;
  content: z.ZodOptional<z.ZodString>;
  toolCalls: z.ZodOptional<z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"function">;
    function: z.ZodObject<{
      name: z.ZodString;
      arguments: z.ZodString;
    }, z.core.$strip>;
    encryptedValue: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>>>;
}, z.core.$strip>, z.ZodObject<{
  id: z.ZodString;
  name: z.ZodOptional<z.ZodString>;
  encryptedValue: z.ZodOptional<z.ZodString>;
  role: z.ZodLiteral<"user">;
  content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"image">;
    source: z.ZodDiscriminatedUnion<[z.ZodObject<{
      type: z.ZodLiteral<"data">;
      value: z.ZodString;
      mimeType: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"url">;
      value: z.ZodString;
      mimeType: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>;
    metadata: z.ZodOptional<z.ZodUnknown>;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"audio">;
    source: z.ZodDiscriminatedUnion<[z.ZodObject<{
      type: z.ZodLiteral<"data">;
      value: z.ZodString;
      mimeType: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"url">;
      value: z.ZodString;
      mimeType: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>;
    metadata: z.ZodOptional<z.ZodUnknown>;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"video">;
    source: z.ZodDiscriminatedUnion<[z.ZodObject<{
      type: z.ZodLiteral<"data">;
      value: z.ZodString;
      mimeType: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"url">;
      value: z.ZodString;
      mimeType: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>;
    metadata: z.ZodOptional<z.ZodUnknown>;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"document">;
    source: z.ZodDiscriminatedUnion<[z.ZodObject<{
      type: z.ZodLiteral<"data">;
      value: z.ZodString;
      mimeType: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"url">;
      value: z.ZodString;
      mimeType: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>;
    metadata: z.ZodOptional<z.ZodUnknown>;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"binary">;
    mimeType: z.ZodString;
    id: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    data: z.ZodOptional<z.ZodString>;
    filename: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>>]>;
}, z.core.$strip>, z.ZodObject<{
  id: z.ZodString;
  content: z.ZodString;
  role: z.ZodLiteral<"tool">;
  toolCallId: z.ZodString;
  error: z.ZodOptional<z.ZodString>;
  encryptedValue: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
  id: z.ZodString;
  role: z.ZodLiteral<"activity">;
  activityType: z.ZodString;
  content: z.ZodRecord<z.ZodString, z.ZodAny>;
}, z.core.$strip>, z.ZodObject<{
  id: z.ZodString;
  role: z.ZodLiteral<"reasoning">;
  content: z.ZodString;
  encryptedValue: z.ZodOptional<z.ZodString>;
}, z.core.$strip>]>;
declare const RoleSchema: z.ZodUnion<readonly [z.ZodLiteral<"developer">, z.ZodLiteral<"system">, z.ZodLiteral<"assistant">, z.ZodLiteral<"user">, z.ZodLiteral<"tool">, z.ZodLiteral<"activity">, z.ZodLiteral<"reasoning">]>;
declare const ContextSchema: z.ZodObject<{
  description: z.ZodString;
  value: z.ZodString;
}, z.core.$strip>;
declare const ToolSchema: z.ZodObject<{
  name: z.ZodString;
  description: z.ZodString;
  parameters: z.ZodOptional<z.ZodAny>;
  metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;
declare const InterruptSchema: z.ZodObject<{
  id: z.ZodString;
  reason: z.ZodString;
  message: z.ZodOptional<z.ZodString>;
  toolCallId: z.ZodOptional<z.ZodString>;
  responseSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
  expiresAt: z.ZodOptional<z.ZodString>;
  metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;
declare const ResumeEntrySchema: z.ZodObject<{
  interruptId: z.ZodString;
  status: z.ZodEnum<{
    resolved: "resolved";
    cancelled: "cancelled";
  }>;
  payload: z.ZodOptional<z.ZodAny>;
}, z.core.$strip>;
declare const RunAgentInputSchema: z.ZodObject<{
  threadId: z.ZodString;
  runId: z.ZodString;
  parentRunId: z.ZodOptional<z.ZodString>;
  state: z.ZodOptional<z.ZodAny>;
  messages: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    encryptedValue: z.ZodOptional<z.ZodString>;
    role: z.ZodLiteral<"developer">;
    content: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    encryptedValue: z.ZodOptional<z.ZodString>;
    role: z.ZodLiteral<"system">;
    content: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    encryptedValue: z.ZodOptional<z.ZodString>;
    role: z.ZodLiteral<"assistant">;
    content: z.ZodOptional<z.ZodString>;
    toolCalls: z.ZodOptional<z.ZodArray<z.ZodObject<{
      id: z.ZodString;
      type: z.ZodLiteral<"function">;
      function: z.ZodObject<{
        name: z.ZodString;
        arguments: z.ZodString;
      }, z.core.$strip>;
      encryptedValue: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    encryptedValue: z.ZodOptional<z.ZodString>;
    role: z.ZodLiteral<"user">;
    content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
      type: z.ZodLiteral<"text">;
      text: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"image">;
      source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"data">;
        value: z.ZodString;
        mimeType: z.ZodString;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"url">;
        value: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>]>;
      metadata: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"audio">;
      source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"data">;
        value: z.ZodString;
        mimeType: z.ZodString;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"url">;
        value: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>]>;
      metadata: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"video">;
      source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"data">;
        value: z.ZodString;
        mimeType: z.ZodString;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"url">;
        value: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>]>;
      metadata: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"document">;
      source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"data">;
        value: z.ZodString;
        mimeType: z.ZodString;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"url">;
        value: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>]>;
      metadata: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"binary">;
      mimeType: z.ZodString;
      id: z.ZodOptional<z.ZodString>;
      url: z.ZodOptional<z.ZodString>;
      data: z.ZodOptional<z.ZodString>;
      filename: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>>]>;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    content: z.ZodString;
    role: z.ZodLiteral<"tool">;
    toolCallId: z.ZodString;
    error: z.ZodOptional<z.ZodString>;
    encryptedValue: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    role: z.ZodLiteral<"activity">;
    activityType: z.ZodString;
    content: z.ZodRecord<z.ZodString, z.ZodAny>;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    role: z.ZodLiteral<"reasoning">;
    content: z.ZodString;
    encryptedValue: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>>;
  tools: z.ZodArray<z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    parameters: z.ZodOptional<z.ZodAny>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
  }, z.core.$strip>>;
  context: z.ZodArray<z.ZodObject<{
    description: z.ZodString;
    value: z.ZodString;
  }, z.core.$strip>>;
  forwardedProps: z.ZodOptional<z.ZodAny>;
  resume: z.ZodOptional<z.ZodArray<z.ZodObject<{
    interruptId: z.ZodString;
    status: z.ZodEnum<{
      resolved: "resolved";
      cancelled: "cancelled";
    }>;
    payload: z.ZodOptional<z.ZodAny>;
  }, z.core.$strip>>>;
}, z.core.$strip>;
declare const StateSchema: z.ZodAny;
declare const BaseEventSchema: z.ZodObject<{
  type: z.ZodEnum<{
    TEXT_MESSAGE_START: "TEXT_MESSAGE_START";
    TEXT_MESSAGE_CONTENT: "TEXT_MESSAGE_CONTENT";
    TEXT_MESSAGE_END: "TEXT_MESSAGE_END";
    TEXT_MESSAGE_CHUNK: "TEXT_MESSAGE_CHUNK";
    TOOL_CALL_START: "TOOL_CALL_START";
    TOOL_CALL_ARGS: "TOOL_CALL_ARGS";
    TOOL_CALL_END: "TOOL_CALL_END";
    TOOL_CALL_CHUNK: "TOOL_CALL_CHUNK";
    TOOL_CALL_RESULT: "TOOL_CALL_RESULT";
    THINKING_START: "THINKING_START";
    THINKING_END: "THINKING_END";
    THINKING_TEXT_MESSAGE_START: "THINKING_TEXT_MESSAGE_START";
    THINKING_TEXT_MESSAGE_CONTENT: "THINKING_TEXT_MESSAGE_CONTENT";
    THINKING_TEXT_MESSAGE_END: "THINKING_TEXT_MESSAGE_END";
    STATE_SNAPSHOT: "STATE_SNAPSHOT";
    STATE_DELTA: "STATE_DELTA";
    MESSAGES_SNAPSHOT: "MESSAGES_SNAPSHOT";
    ACTIVITY_SNAPSHOT: "ACTIVITY_SNAPSHOT";
    ACTIVITY_DELTA: "ACTIVITY_DELTA";
    RAW: "RAW";
    CUSTOM: "CUSTOM";
    RUN_STARTED: "RUN_STARTED";
    RUN_FINISHED: "RUN_FINISHED";
    RUN_ERROR: "RUN_ERROR";
    STEP_STARTED: "STEP_STARTED";
    STEP_FINISHED: "STEP_FINISHED";
    REASONING_START: "REASONING_START";
    REASONING_MESSAGE_START: "REASONING_MESSAGE_START";
    REASONING_MESSAGE_CONTENT: "REASONING_MESSAGE_CONTENT";
    REASONING_MESSAGE_END: "REASONING_MESSAGE_END";
    REASONING_MESSAGE_CHUNK: "REASONING_MESSAGE_CHUNK";
    REASONING_END: "REASONING_END";
    REASONING_ENCRYPTED_VALUE: "REASONING_ENCRYPTED_VALUE";
  }>;
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
}, z.core.$loose>;
declare const TextMessageStartEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.TEXT_MESSAGE_START>;
  messageId: z.ZodString;
  role: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"developer">, z.ZodLiteral<"system">, z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>;
  name: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
declare const TextMessageContentEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.TEXT_MESSAGE_CONTENT>;
  messageId: z.ZodString;
  delta: z.ZodString;
}, z.core.$loose>;
declare const TextMessageEndEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.TEXT_MESSAGE_END>;
  messageId: z.ZodString;
}, z.core.$loose>;
declare const TextMessageChunkEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.TEXT_MESSAGE_CHUNK>;
  messageId: z.ZodOptional<z.ZodString>;
  role: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"developer">, z.ZodLiteral<"system">, z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>;
  delta: z.ZodOptional<z.ZodString>;
  name: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
/**
 * @deprecated Use ReasoningTextMessageStartEventSchema instead. Will be removed in 1.0.0.
 */
declare const ThinkingTextMessageStartEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.THINKING_TEXT_MESSAGE_START>;
}, z.core.$loose>;
/**
 * @deprecated Use ReasoningMessageContentEventSchema instead. Will be removed in 1.0.0.
 */
declare const ThinkingTextMessageContentEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.THINKING_TEXT_MESSAGE_CONTENT>;
  delta: z.ZodString;
}, z.core.$loose>;
/**
 * @deprecated Use ReasoningMessageEndEventSchema instead. Will be removed in 1.0.0.
 */
declare const ThinkingTextMessageEndEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.THINKING_TEXT_MESSAGE_END>;
}, z.core.$loose>;
declare const ToolCallStartEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.TOOL_CALL_START>;
  toolCallId: z.ZodString;
  toolCallName: z.ZodString;
  parentMessageId: z.ZodPipe<z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodTransform<string | undefined, string | null | undefined>>;
}, z.core.$loose>;
declare const ToolCallArgsEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.TOOL_CALL_ARGS>;
  toolCallId: z.ZodString;
  delta: z.ZodString;
}, z.core.$loose>;
declare const ToolCallEndEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.TOOL_CALL_END>;
  toolCallId: z.ZodString;
}, z.core.$loose>;
declare const ToolCallResultEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  messageId: z.ZodString;
  type: z.ZodLiteral<EventType.TOOL_CALL_RESULT>;
  toolCallId: z.ZodString;
  content: z.ZodString;
  role: z.ZodOptional<z.ZodLiteral<"tool">>;
}, z.core.$loose>;
declare const ToolCallChunkEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.TOOL_CALL_CHUNK>;
  toolCallId: z.ZodOptional<z.ZodString>;
  toolCallName: z.ZodOptional<z.ZodString>;
  parentMessageId: z.ZodPipe<z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodTransform<string | undefined, string | null | undefined>>;
  delta: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
/**
 * @deprecated Use ReasoningStartEventSchema instead. Will be removed in 1.0.0.
 */
declare const ThinkingStartEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.THINKING_START>;
  title: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
/**
 * @deprecated Use ReasoningEndEventSchema instead. Will be removed in 1.0.0.
 */
declare const ThinkingEndEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.THINKING_END>;
}, z.core.$loose>;
declare const StateSnapshotEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.STATE_SNAPSHOT>;
  snapshot: z.ZodOptional<z.ZodAny>;
}, z.core.$loose>;
declare const StateDeltaEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.STATE_DELTA>;
  delta: z.ZodArray<z.ZodAny>;
}, z.core.$loose>;
declare const MessagesSnapshotEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.MESSAGES_SNAPSHOT>;
  messages: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    encryptedValue: z.ZodOptional<z.ZodString>;
    role: z.ZodLiteral<"developer">;
    content: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    encryptedValue: z.ZodOptional<z.ZodString>;
    role: z.ZodLiteral<"system">;
    content: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    encryptedValue: z.ZodOptional<z.ZodString>;
    role: z.ZodLiteral<"assistant">;
    content: z.ZodOptional<z.ZodString>;
    toolCalls: z.ZodOptional<z.ZodArray<z.ZodObject<{
      id: z.ZodString;
      type: z.ZodLiteral<"function">;
      function: z.ZodObject<{
        name: z.ZodString;
        arguments: z.ZodString;
      }, z.core.$strip>;
      encryptedValue: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    encryptedValue: z.ZodOptional<z.ZodString>;
    role: z.ZodLiteral<"user">;
    content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
      type: z.ZodLiteral<"text">;
      text: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"image">;
      source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"data">;
        value: z.ZodString;
        mimeType: z.ZodString;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"url">;
        value: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>]>;
      metadata: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"audio">;
      source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"data">;
        value: z.ZodString;
        mimeType: z.ZodString;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"url">;
        value: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>]>;
      metadata: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"video">;
      source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"data">;
        value: z.ZodString;
        mimeType: z.ZodString;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"url">;
        value: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>]>;
      metadata: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"document">;
      source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"data">;
        value: z.ZodString;
        mimeType: z.ZodString;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"url">;
        value: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>]>;
      metadata: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"binary">;
      mimeType: z.ZodString;
      id: z.ZodOptional<z.ZodString>;
      url: z.ZodOptional<z.ZodString>;
      data: z.ZodOptional<z.ZodString>;
      filename: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>>]>;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    content: z.ZodString;
    role: z.ZodLiteral<"tool">;
    toolCallId: z.ZodString;
    error: z.ZodOptional<z.ZodString>;
    encryptedValue: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    role: z.ZodLiteral<"activity">;
    activityType: z.ZodString;
    content: z.ZodRecord<z.ZodString, z.ZodAny>;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    role: z.ZodLiteral<"reasoning">;
    content: z.ZodString;
    encryptedValue: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>>;
}, z.core.$loose>;
declare const ActivitySnapshotEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.ACTIVITY_SNAPSHOT>;
  messageId: z.ZodString;
  activityType: z.ZodString;
  content: z.ZodRecord<z.ZodString, z.ZodAny>;
  replace: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$loose>;
declare const ActivityDeltaEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.ACTIVITY_DELTA>;
  messageId: z.ZodString;
  activityType: z.ZodString;
  patch: z.ZodArray<z.ZodAny>;
}, z.core.$loose>;
declare const RawEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.RAW>;
  event: z.ZodOptional<z.ZodAny>;
  source: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
declare const CustomEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.CUSTOM>;
  name: z.ZodString;
  value: z.ZodOptional<z.ZodAny>;
}, z.core.$loose>;
declare const RunStartedEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.RUN_STARTED>;
  threadId: z.ZodString;
  runId: z.ZodString;
  parentRunId: z.ZodOptional<z.ZodString>;
  input: z.ZodOptional<z.ZodObject<{
    threadId: z.ZodString;
    runId: z.ZodString;
    parentRunId: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodAny>;
    messages: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
      id: z.ZodString;
      name: z.ZodOptional<z.ZodString>;
      encryptedValue: z.ZodOptional<z.ZodString>;
      role: z.ZodLiteral<"developer">;
      content: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      id: z.ZodString;
      name: z.ZodOptional<z.ZodString>;
      encryptedValue: z.ZodOptional<z.ZodString>;
      role: z.ZodLiteral<"system">;
      content: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      id: z.ZodString;
      name: z.ZodOptional<z.ZodString>;
      encryptedValue: z.ZodOptional<z.ZodString>;
      role: z.ZodLiteral<"assistant">;
      content: z.ZodOptional<z.ZodString>;
      toolCalls: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"function">;
        function: z.ZodObject<{
          name: z.ZodString;
          arguments: z.ZodString;
        }, z.core.$strip>;
        encryptedValue: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>>>;
    }, z.core.$strip>, z.ZodObject<{
      id: z.ZodString;
      name: z.ZodOptional<z.ZodString>;
      encryptedValue: z.ZodOptional<z.ZodString>;
      role: z.ZodLiteral<"user">;
      content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"image">;
        source: z.ZodDiscriminatedUnion<[z.ZodObject<{
          type: z.ZodLiteral<"data">;
          value: z.ZodString;
          mimeType: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
          type: z.ZodLiteral<"url">;
          value: z.ZodString;
          mimeType: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>]>;
        metadata: z.ZodOptional<z.ZodUnknown>;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"audio">;
        source: z.ZodDiscriminatedUnion<[z.ZodObject<{
          type: z.ZodLiteral<"data">;
          value: z.ZodString;
          mimeType: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
          type: z.ZodLiteral<"url">;
          value: z.ZodString;
          mimeType: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>]>;
        metadata: z.ZodOptional<z.ZodUnknown>;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"video">;
        source: z.ZodDiscriminatedUnion<[z.ZodObject<{
          type: z.ZodLiteral<"data">;
          value: z.ZodString;
          mimeType: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
          type: z.ZodLiteral<"url">;
          value: z.ZodString;
          mimeType: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>]>;
        metadata: z.ZodOptional<z.ZodUnknown>;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"document">;
        source: z.ZodDiscriminatedUnion<[z.ZodObject<{
          type: z.ZodLiteral<"data">;
          value: z.ZodString;
          mimeType: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
          type: z.ZodLiteral<"url">;
          value: z.ZodString;
          mimeType: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>]>;
        metadata: z.ZodOptional<z.ZodUnknown>;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"binary">;
        mimeType: z.ZodString;
        id: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        data: z.ZodOptional<z.ZodString>;
        filename: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>]>>]>;
    }, z.core.$strip>, z.ZodObject<{
      id: z.ZodString;
      content: z.ZodString;
      role: z.ZodLiteral<"tool">;
      toolCallId: z.ZodString;
      error: z.ZodOptional<z.ZodString>;
      encryptedValue: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
      id: z.ZodString;
      role: z.ZodLiteral<"activity">;
      activityType: z.ZodString;
      content: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
      id: z.ZodString;
      role: z.ZodLiteral<"reasoning">;
      content: z.ZodString;
      encryptedValue: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>>;
    tools: z.ZodArray<z.ZodObject<{
      name: z.ZodString;
      description: z.ZodString;
      parameters: z.ZodOptional<z.ZodAny>;
      metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>>;
    context: z.ZodArray<z.ZodObject<{
      description: z.ZodString;
      value: z.ZodString;
    }, z.core.$strip>>;
    forwardedProps: z.ZodOptional<z.ZodAny>;
    resume: z.ZodOptional<z.ZodArray<z.ZodObject<{
      interruptId: z.ZodString;
      status: z.ZodEnum<{
        resolved: "resolved";
        cancelled: "cancelled";
      }>;
      payload: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>>>;
  }, z.core.$strip>>;
}, z.core.$loose>;
declare const RunFinishedSuccessOutcomeSchema: z.ZodObject<{
  type: z.ZodLiteral<"success">;
}, z.core.$strict>;
declare const RunFinishedInterruptOutcomeSchema: z.ZodObject<{
  type: z.ZodLiteral<"interrupt">;
  interrupts: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    reason: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
    toolCallId: z.ZodOptional<z.ZodString>;
    responseSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    expiresAt: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
  }, z.core.$strip>>;
}, z.core.$strict>;
declare const RunFinishedOutcomeSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
  type: z.ZodLiteral<"success">;
}, z.core.$strict>, z.ZodObject<{
  type: z.ZodLiteral<"interrupt">;
  interrupts: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    reason: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
    toolCallId: z.ZodOptional<z.ZodString>;
    responseSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    expiresAt: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
  }, z.core.$strip>>;
}, z.core.$strict>]>;
declare const RunFinishedEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.RUN_FINISHED>;
  threadId: z.ZodString;
  runId: z.ZodString;
  result: z.ZodOptional<z.ZodAny>;
  outcome: z.ZodPipe<z.ZodOptional<z.ZodNullable<z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"success">;
  }, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"interrupt">;
    interrupts: z.ZodArray<z.ZodObject<{
      id: z.ZodString;
      reason: z.ZodString;
      message: z.ZodOptional<z.ZodString>;
      toolCallId: z.ZodOptional<z.ZodString>;
      responseSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
      expiresAt: z.ZodOptional<z.ZodString>;
      metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>>;
  }, z.core.$strict>]>>>, z.ZodTransform<{
    type: "success";
  } | {
    type: "interrupt";
    interrupts: {
      id: string;
      reason: string;
      message?: string | undefined;
      toolCallId?: string | undefined;
      responseSchema?: Record<string, any> | undefined;
      expiresAt?: string | undefined;
      metadata?: Record<string, any> | undefined;
    }[];
  } | undefined, {
    type: "success";
  } | {
    type: "interrupt";
    interrupts: {
      id: string;
      reason: string;
      message?: string | undefined;
      toolCallId?: string | undefined;
      responseSchema?: Record<string, any> | undefined;
      expiresAt?: string | undefined;
      metadata?: Record<string, any> | undefined;
    }[];
  } | null | undefined>>;
}, z.core.$loose>;
declare const RunErrorEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.RUN_ERROR>;
  message: z.ZodString;
  code: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
declare const StepStartedEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.STEP_STARTED>;
  stepName: z.ZodString;
}, z.core.$loose>;
declare const StepFinishedEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.STEP_FINISHED>;
  stepName: z.ZodString;
}, z.core.$loose>;
declare const ReasoningEncryptedValueSubtypeSchema: z.ZodUnion<readonly [z.ZodLiteral<"tool-call">, z.ZodLiteral<"message">]>;
declare const ReasoningStartEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.REASONING_START>;
  messageId: z.ZodString;
}, z.core.$loose>;
declare const ReasoningMessageStartEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.REASONING_MESSAGE_START>;
  messageId: z.ZodString;
  role: z.ZodLiteral<"reasoning">;
}, z.core.$loose>;
declare const ReasoningMessageContentEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.REASONING_MESSAGE_CONTENT>;
  messageId: z.ZodString;
  delta: z.ZodString;
}, z.core.$loose>;
declare const ReasoningMessageEndEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.REASONING_MESSAGE_END>;
  messageId: z.ZodString;
}, z.core.$loose>;
declare const ReasoningMessageChunkEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.REASONING_MESSAGE_CHUNK>;
  messageId: z.ZodOptional<z.ZodString>;
  delta: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
declare const ReasoningEndEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.REASONING_END>;
  messageId: z.ZodString;
}, z.core.$loose>;
declare const ReasoningEncryptedValueEventSchema: z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.REASONING_ENCRYPTED_VALUE>;
  subtype: z.ZodUnion<readonly [z.ZodLiteral<"tool-call">, z.ZodLiteral<"message">]>;
  entityId: z.ZodString;
  encryptedValue: z.ZodString;
}, z.core.$loose>;
/**
 * Discriminated union of all AG-UI event schemas. Suitable for validating
 * untrusted event payloads from the wire.
 */
declare const EventSchemas: z.ZodDiscriminatedUnion<[z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.TEXT_MESSAGE_START>;
  messageId: z.ZodString;
  role: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<"developer">, z.ZodLiteral<"system">, z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>;
  name: z.ZodOptional<z.ZodString>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.TEXT_MESSAGE_CONTENT>;
  messageId: z.ZodString;
  delta: z.ZodString;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.TEXT_MESSAGE_END>;
  messageId: z.ZodString;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.TEXT_MESSAGE_CHUNK>;
  messageId: z.ZodOptional<z.ZodString>;
  role: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"developer">, z.ZodLiteral<"system">, z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>;
  delta: z.ZodOptional<z.ZodString>;
  name: z.ZodOptional<z.ZodString>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.THINKING_START>;
  title: z.ZodOptional<z.ZodString>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.THINKING_END>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.THINKING_TEXT_MESSAGE_START>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.THINKING_TEXT_MESSAGE_CONTENT>;
  delta: z.ZodString;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.THINKING_TEXT_MESSAGE_END>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.TOOL_CALL_START>;
  toolCallId: z.ZodString;
  toolCallName: z.ZodString;
  parentMessageId: z.ZodPipe<z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodTransform<string | undefined, string | null | undefined>>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.TOOL_CALL_ARGS>;
  toolCallId: z.ZodString;
  delta: z.ZodString;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.TOOL_CALL_END>;
  toolCallId: z.ZodString;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.TOOL_CALL_CHUNK>;
  toolCallId: z.ZodOptional<z.ZodString>;
  toolCallName: z.ZodOptional<z.ZodString>;
  parentMessageId: z.ZodPipe<z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodTransform<string | undefined, string | null | undefined>>;
  delta: z.ZodOptional<z.ZodString>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  messageId: z.ZodString;
  type: z.ZodLiteral<EventType.TOOL_CALL_RESULT>;
  toolCallId: z.ZodString;
  content: z.ZodString;
  role: z.ZodOptional<z.ZodLiteral<"tool">>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.STATE_SNAPSHOT>;
  snapshot: z.ZodOptional<z.ZodAny>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.STATE_DELTA>;
  delta: z.ZodArray<z.ZodAny>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.MESSAGES_SNAPSHOT>;
  messages: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    encryptedValue: z.ZodOptional<z.ZodString>;
    role: z.ZodLiteral<"developer">;
    content: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    encryptedValue: z.ZodOptional<z.ZodString>;
    role: z.ZodLiteral<"system">;
    content: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    encryptedValue: z.ZodOptional<z.ZodString>;
    role: z.ZodLiteral<"assistant">;
    content: z.ZodOptional<z.ZodString>;
    toolCalls: z.ZodOptional<z.ZodArray<z.ZodObject<{
      id: z.ZodString;
      type: z.ZodLiteral<"function">;
      function: z.ZodObject<{
        name: z.ZodString;
        arguments: z.ZodString;
      }, z.core.$strip>;
      encryptedValue: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    encryptedValue: z.ZodOptional<z.ZodString>;
    role: z.ZodLiteral<"user">;
    content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
      type: z.ZodLiteral<"text">;
      text: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"image">;
      source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"data">;
        value: z.ZodString;
        mimeType: z.ZodString;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"url">;
        value: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>]>;
      metadata: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"audio">;
      source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"data">;
        value: z.ZodString;
        mimeType: z.ZodString;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"url">;
        value: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>]>;
      metadata: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"video">;
      source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"data">;
        value: z.ZodString;
        mimeType: z.ZodString;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"url">;
        value: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>]>;
      metadata: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"document">;
      source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"data">;
        value: z.ZodString;
        mimeType: z.ZodString;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"url">;
        value: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>]>;
      metadata: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
      type: z.ZodLiteral<"binary">;
      mimeType: z.ZodString;
      id: z.ZodOptional<z.ZodString>;
      url: z.ZodOptional<z.ZodString>;
      data: z.ZodOptional<z.ZodString>;
      filename: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>>]>;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    content: z.ZodString;
    role: z.ZodLiteral<"tool">;
    toolCallId: z.ZodString;
    error: z.ZodOptional<z.ZodString>;
    encryptedValue: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    role: z.ZodLiteral<"activity">;
    activityType: z.ZodString;
    content: z.ZodRecord<z.ZodString, z.ZodAny>;
  }, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    role: z.ZodLiteral<"reasoning">;
    content: z.ZodString;
    encryptedValue: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>]>>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.ACTIVITY_SNAPSHOT>;
  messageId: z.ZodString;
  activityType: z.ZodString;
  content: z.ZodRecord<z.ZodString, z.ZodAny>;
  replace: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.ACTIVITY_DELTA>;
  messageId: z.ZodString;
  activityType: z.ZodString;
  patch: z.ZodArray<z.ZodAny>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.RAW>;
  event: z.ZodOptional<z.ZodAny>;
  source: z.ZodOptional<z.ZodString>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.CUSTOM>;
  name: z.ZodString;
  value: z.ZodOptional<z.ZodAny>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.RUN_STARTED>;
  threadId: z.ZodString;
  runId: z.ZodString;
  parentRunId: z.ZodOptional<z.ZodString>;
  input: z.ZodOptional<z.ZodObject<{
    threadId: z.ZodString;
    runId: z.ZodString;
    parentRunId: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodAny>;
    messages: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
      id: z.ZodString;
      name: z.ZodOptional<z.ZodString>;
      encryptedValue: z.ZodOptional<z.ZodString>;
      role: z.ZodLiteral<"developer">;
      content: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      id: z.ZodString;
      name: z.ZodOptional<z.ZodString>;
      encryptedValue: z.ZodOptional<z.ZodString>;
      role: z.ZodLiteral<"system">;
      content: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
      id: z.ZodString;
      name: z.ZodOptional<z.ZodString>;
      encryptedValue: z.ZodOptional<z.ZodString>;
      role: z.ZodLiteral<"assistant">;
      content: z.ZodOptional<z.ZodString>;
      toolCalls: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"function">;
        function: z.ZodObject<{
          name: z.ZodString;
          arguments: z.ZodString;
        }, z.core.$strip>;
        encryptedValue: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>>>;
    }, z.core.$strip>, z.ZodObject<{
      id: z.ZodString;
      name: z.ZodOptional<z.ZodString>;
      encryptedValue: z.ZodOptional<z.ZodString>;
      role: z.ZodLiteral<"user">;
      content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"image">;
        source: z.ZodDiscriminatedUnion<[z.ZodObject<{
          type: z.ZodLiteral<"data">;
          value: z.ZodString;
          mimeType: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
          type: z.ZodLiteral<"url">;
          value: z.ZodString;
          mimeType: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>]>;
        metadata: z.ZodOptional<z.ZodUnknown>;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"audio">;
        source: z.ZodDiscriminatedUnion<[z.ZodObject<{
          type: z.ZodLiteral<"data">;
          value: z.ZodString;
          mimeType: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
          type: z.ZodLiteral<"url">;
          value: z.ZodString;
          mimeType: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>]>;
        metadata: z.ZodOptional<z.ZodUnknown>;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"video">;
        source: z.ZodDiscriminatedUnion<[z.ZodObject<{
          type: z.ZodLiteral<"data">;
          value: z.ZodString;
          mimeType: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
          type: z.ZodLiteral<"url">;
          value: z.ZodString;
          mimeType: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>]>;
        metadata: z.ZodOptional<z.ZodUnknown>;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"document">;
        source: z.ZodDiscriminatedUnion<[z.ZodObject<{
          type: z.ZodLiteral<"data">;
          value: z.ZodString;
          mimeType: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
          type: z.ZodLiteral<"url">;
          value: z.ZodString;
          mimeType: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>]>;
        metadata: z.ZodOptional<z.ZodUnknown>;
      }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"binary">;
        mimeType: z.ZodString;
        id: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        data: z.ZodOptional<z.ZodString>;
        filename: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>]>>]>;
    }, z.core.$strip>, z.ZodObject<{
      id: z.ZodString;
      content: z.ZodString;
      role: z.ZodLiteral<"tool">;
      toolCallId: z.ZodString;
      error: z.ZodOptional<z.ZodString>;
      encryptedValue: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
      id: z.ZodString;
      role: z.ZodLiteral<"activity">;
      activityType: z.ZodString;
      content: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
      id: z.ZodString;
      role: z.ZodLiteral<"reasoning">;
      content: z.ZodString;
      encryptedValue: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>>;
    tools: z.ZodArray<z.ZodObject<{
      name: z.ZodString;
      description: z.ZodString;
      parameters: z.ZodOptional<z.ZodAny>;
      metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>>;
    context: z.ZodArray<z.ZodObject<{
      description: z.ZodString;
      value: z.ZodString;
    }, z.core.$strip>>;
    forwardedProps: z.ZodOptional<z.ZodAny>;
    resume: z.ZodOptional<z.ZodArray<z.ZodObject<{
      interruptId: z.ZodString;
      status: z.ZodEnum<{
        resolved: "resolved";
        cancelled: "cancelled";
      }>;
      payload: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>>>;
  }, z.core.$strip>>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.RUN_FINISHED>;
  threadId: z.ZodString;
  runId: z.ZodString;
  result: z.ZodOptional<z.ZodAny>;
  outcome: z.ZodPipe<z.ZodOptional<z.ZodNullable<z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"success">;
  }, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"interrupt">;
    interrupts: z.ZodArray<z.ZodObject<{
      id: z.ZodString;
      reason: z.ZodString;
      message: z.ZodOptional<z.ZodString>;
      toolCallId: z.ZodOptional<z.ZodString>;
      responseSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
      expiresAt: z.ZodOptional<z.ZodString>;
      metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>>;
  }, z.core.$strict>]>>>, z.ZodTransform<{
    type: "success";
  } | {
    type: "interrupt";
    interrupts: {
      id: string;
      reason: string;
      message?: string | undefined;
      toolCallId?: string | undefined;
      responseSchema?: Record<string, any> | undefined;
      expiresAt?: string | undefined;
      metadata?: Record<string, any> | undefined;
    }[];
  } | undefined, {
    type: "success";
  } | {
    type: "interrupt";
    interrupts: {
      id: string;
      reason: string;
      message?: string | undefined;
      toolCallId?: string | undefined;
      responseSchema?: Record<string, any> | undefined;
      expiresAt?: string | undefined;
      metadata?: Record<string, any> | undefined;
    }[];
  } | null | undefined>>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.RUN_ERROR>;
  message: z.ZodString;
  code: z.ZodOptional<z.ZodString>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.STEP_STARTED>;
  stepName: z.ZodString;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.STEP_FINISHED>;
  stepName: z.ZodString;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.REASONING_START>;
  messageId: z.ZodString;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.REASONING_MESSAGE_START>;
  messageId: z.ZodString;
  role: z.ZodLiteral<"reasoning">;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.REASONING_MESSAGE_CONTENT>;
  messageId: z.ZodString;
  delta: z.ZodString;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.REASONING_MESSAGE_END>;
  messageId: z.ZodString;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.REASONING_MESSAGE_CHUNK>;
  messageId: z.ZodOptional<z.ZodString>;
  delta: z.ZodOptional<z.ZodString>;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.REASONING_END>;
  messageId: z.ZodString;
}, z.core.$loose>, z.ZodObject<{
  timestamp: z.ZodOptional<z.ZodNumber>;
  rawEvent: z.ZodOptional<z.ZodAny>;
  type: z.ZodLiteral<EventType.REASONING_ENCRYPTED_VALUE>;
  subtype: z.ZodUnion<readonly [z.ZodLiteral<"tool-call">, z.ZodLiteral<"message">]>;
  entityId: z.ZodString;
  encryptedValue: z.ZodString;
}, z.core.$loose>]>;
/** Describes a sub-agent that can be invoked by a parent agent. */
declare const SubAgentInfoSchema: z.ZodObject<{
  name: z.ZodString;
  description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Basic metadata about the agent. Useful for discovery UIs, agent marketplaces,
 * and debugging.
 */
declare const IdentityCapabilitiesSchema: z.ZodObject<{
  name: z.ZodOptional<z.ZodString>;
  type: z.ZodOptional<z.ZodString>;
  description: z.ZodOptional<z.ZodString>;
  version: z.ZodOptional<z.ZodString>;
  provider: z.ZodOptional<z.ZodString>;
  documentationUrl: z.ZodOptional<z.ZodString>;
  metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
/**
 * Declares which transport mechanisms the agent supports.
 */
declare const TransportCapabilitiesSchema: z.ZodObject<{
  streaming: z.ZodOptional<z.ZodBoolean>;
  websocket: z.ZodOptional<z.ZodBoolean>;
  httpBinary: z.ZodOptional<z.ZodBoolean>;
  pushNotifications: z.ZodOptional<z.ZodBoolean>;
  resumable: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Tool calling capabilities.
 */
declare const ToolsCapabilitiesSchema: z.ZodObject<{
  supported: z.ZodOptional<z.ZodBoolean>;
  items: z.ZodOptional<z.ZodArray<z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    parameters: z.ZodOptional<z.ZodAny>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
  }, z.core.$strip>>>;
  parallelCalls: z.ZodOptional<z.ZodBoolean>;
  clientProvided: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Output format support.
 */
declare const OutputCapabilitiesSchema: z.ZodObject<{
  structuredOutput: z.ZodOptional<z.ZodBoolean>;
  supportedMimeTypes: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
/**
 * State and memory management capabilities.
 */
declare const StateCapabilitiesSchema: z.ZodObject<{
  snapshots: z.ZodOptional<z.ZodBoolean>;
  deltas: z.ZodOptional<z.ZodBoolean>;
  memory: z.ZodOptional<z.ZodBoolean>;
  persistentState: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Multi-agent coordination capabilities.
 */
declare const MultiAgentCapabilitiesSchema: z.ZodObject<{
  supported: z.ZodOptional<z.ZodBoolean>;
  delegation: z.ZodOptional<z.ZodBoolean>;
  handoffs: z.ZodOptional<z.ZodBoolean>;
  subAgents: z.ZodOptional<z.ZodArray<z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>>>;
}, z.core.$strip>;
/**
 * Reasoning and thinking capabilities.
 */
declare const ReasoningCapabilitiesSchema: z.ZodObject<{
  supported: z.ZodOptional<z.ZodBoolean>;
  streaming: z.ZodOptional<z.ZodBoolean>;
  encrypted: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Modalities the agent can accept as input.
 */
declare const MultimodalInputCapabilitiesSchema: z.ZodObject<{
  image: z.ZodOptional<z.ZodBoolean>;
  audio: z.ZodOptional<z.ZodBoolean>;
  video: z.ZodOptional<z.ZodBoolean>;
  pdf: z.ZodOptional<z.ZodBoolean>;
  file: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Modalities the agent can produce as output.
 */
declare const MultimodalOutputCapabilitiesSchema: z.ZodObject<{
  image: z.ZodOptional<z.ZodBoolean>;
  audio: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Multimodal input and output support.
 */
declare const MultimodalCapabilitiesSchema: z.ZodObject<{
  input: z.ZodOptional<z.ZodObject<{
    image: z.ZodOptional<z.ZodBoolean>;
    audio: z.ZodOptional<z.ZodBoolean>;
    video: z.ZodOptional<z.ZodBoolean>;
    pdf: z.ZodOptional<z.ZodBoolean>;
    file: z.ZodOptional<z.ZodBoolean>;
  }, z.core.$strip>>;
  output: z.ZodOptional<z.ZodObject<{
    image: z.ZodOptional<z.ZodBoolean>;
    audio: z.ZodOptional<z.ZodBoolean>;
  }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Execution control and limits.
 */
declare const ExecutionCapabilitiesSchema: z.ZodObject<{
  codeExecution: z.ZodOptional<z.ZodBoolean>;
  sandboxed: z.ZodOptional<z.ZodBoolean>;
  maxIterations: z.ZodOptional<z.ZodNumber>;
  maxExecutionTime: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Human-in-the-loop interaction support.
 */
declare const HumanInTheLoopCapabilitiesSchema: z.ZodObject<{
  supported: z.ZodOptional<z.ZodBoolean>;
  approvals: z.ZodOptional<z.ZodBoolean>;
  interventions: z.ZodOptional<z.ZodBoolean>;
  feedback: z.ZodOptional<z.ZodBoolean>;
  interrupts: z.ZodOptional<z.ZodBoolean>;
  approveWithEdits: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * A typed, categorized snapshot of an agent's current capabilities.
 * Returned by `getCapabilities()` on `AbstractAgent`.
 */
declare const AgentCapabilitiesSchema: z.ZodObject<{
  identity: z.ZodOptional<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodString>;
    provider: z.ZodOptional<z.ZodString>;
    documentationUrl: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  }, z.core.$strip>>;
  transport: z.ZodOptional<z.ZodObject<{
    streaming: z.ZodOptional<z.ZodBoolean>;
    websocket: z.ZodOptional<z.ZodBoolean>;
    httpBinary: z.ZodOptional<z.ZodBoolean>;
    pushNotifications: z.ZodOptional<z.ZodBoolean>;
    resumable: z.ZodOptional<z.ZodBoolean>;
  }, z.core.$strip>>;
  tools: z.ZodOptional<z.ZodObject<{
    supported: z.ZodOptional<z.ZodBoolean>;
    items: z.ZodOptional<z.ZodArray<z.ZodObject<{
      name: z.ZodString;
      description: z.ZodString;
      parameters: z.ZodOptional<z.ZodAny>;
      metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>>>;
    parallelCalls: z.ZodOptional<z.ZodBoolean>;
    clientProvided: z.ZodOptional<z.ZodBoolean>;
  }, z.core.$strip>>;
  output: z.ZodOptional<z.ZodObject<{
    structuredOutput: z.ZodOptional<z.ZodBoolean>;
    supportedMimeTypes: z.ZodOptional<z.ZodArray<z.ZodString>>;
  }, z.core.$strip>>;
  state: z.ZodOptional<z.ZodObject<{
    snapshots: z.ZodOptional<z.ZodBoolean>;
    deltas: z.ZodOptional<z.ZodBoolean>;
    memory: z.ZodOptional<z.ZodBoolean>;
    persistentState: z.ZodOptional<z.ZodBoolean>;
  }, z.core.$strip>>;
  multiAgent: z.ZodOptional<z.ZodObject<{
    supported: z.ZodOptional<z.ZodBoolean>;
    delegation: z.ZodOptional<z.ZodBoolean>;
    handoffs: z.ZodOptional<z.ZodBoolean>;
    subAgents: z.ZodOptional<z.ZodArray<z.ZodObject<{
      name: z.ZodString;
      description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
  }, z.core.$strip>>;
  reasoning: z.ZodOptional<z.ZodObject<{
    supported: z.ZodOptional<z.ZodBoolean>;
    streaming: z.ZodOptional<z.ZodBoolean>;
    encrypted: z.ZodOptional<z.ZodBoolean>;
  }, z.core.$strip>>;
  multimodal: z.ZodOptional<z.ZodObject<{
    input: z.ZodOptional<z.ZodObject<{
      image: z.ZodOptional<z.ZodBoolean>;
      audio: z.ZodOptional<z.ZodBoolean>;
      video: z.ZodOptional<z.ZodBoolean>;
      pdf: z.ZodOptional<z.ZodBoolean>;
      file: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    output: z.ZodOptional<z.ZodObject<{
      image: z.ZodOptional<z.ZodBoolean>;
      audio: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
  }, z.core.$strip>>;
  execution: z.ZodOptional<z.ZodObject<{
    codeExecution: z.ZodOptional<z.ZodBoolean>;
    sandboxed: z.ZodOptional<z.ZodBoolean>;
    maxIterations: z.ZodOptional<z.ZodNumber>;
    maxExecutionTime: z.ZodOptional<z.ZodNumber>;
  }, z.core.$strip>>;
  humanInTheLoop: z.ZodOptional<z.ZodObject<{
    supported: z.ZodOptional<z.ZodBoolean>;
    approvals: z.ZodOptional<z.ZodBoolean>;
    interventions: z.ZodOptional<z.ZodBoolean>;
    feedback: z.ZodOptional<z.ZodBoolean>;
    interrupts: z.ZodOptional<z.ZodBoolean>;
    approveWithEdits: z.ZodOptional<z.ZodBoolean>;
  }, z.core.$strip>>;
  custom: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
//#endregion
//#region src/event-factories.d.ts
/** Creates a TEXT_MESSAGE_START event. `role` defaults to `"assistant"` when omitted. */
declare const createTextMessageStartEvent: (props: TextMessageStartEventProps) => TextMessageStartEvent;
/** Creates a TEXT_MESSAGE_CONTENT event. */
declare const createTextMessageContentEvent: (props: TextMessageContentEventProps) => TextMessageContentEvent;
/** Creates a TEXT_MESSAGE_END event. */
declare const createTextMessageEndEvent: (props: TextMessageEndEventProps) => TextMessageEndEvent;
/** Creates a TEXT_MESSAGE_CHUNK event. */
declare const createTextMessageChunkEvent: (props: TextMessageChunkEventProps) => TextMessageChunkEvent;
/** @deprecated Use `createReasoningMessageStartEvent` instead. Will be removed in 1.0.0. */
declare const createThinkingTextMessageStartEvent: (props: ThinkingTextMessageStartEventProps) => ThinkingTextMessageStartEvent;
/** @deprecated Use `createReasoningMessageContentEvent` instead. Will be removed in 1.0.0. */
declare const createThinkingTextMessageContentEvent: (props: ThinkingTextMessageContentEventProps) => ThinkingTextMessageContentEvent;
/** @deprecated Use `createReasoningMessageEndEvent` instead. Will be removed in 1.0.0. */
declare const createThinkingTextMessageEndEvent: (props: ThinkingTextMessageEndEventProps) => ThinkingTextMessageEndEvent;
/** Creates a TOOL_CALL_START event. */
declare const createToolCallStartEvent: (props: ToolCallStartEventProps) => ToolCallStartEvent;
/** Creates a TOOL_CALL_ARGS event. */
declare const createToolCallArgsEvent: (props: ToolCallArgsEventProps) => ToolCallArgsEvent;
/** Creates a TOOL_CALL_END event. */
declare const createToolCallEndEvent: (props: ToolCallEndEventProps) => ToolCallEndEvent;
/** Creates a TOOL_CALL_CHUNK event. */
declare const createToolCallChunkEvent: (props: ToolCallChunkEventProps) => ToolCallChunkEvent;
/** Creates a TOOL_CALL_RESULT event. */
declare const createToolCallResultEvent: (props: ToolCallResultEventProps) => ToolCallResultEvent;
/** @deprecated Use `createReasoningStartEvent` instead. Will be removed in 1.0.0. */
declare const createThinkingStartEvent: (props: ThinkingStartEventProps) => ThinkingStartEvent;
/** @deprecated Use `createReasoningEndEvent` instead. Will be removed in 1.0.0. */
declare const createThinkingEndEvent: (props: ThinkingEndEventProps) => ThinkingEndEvent;
/** Creates a STATE_SNAPSHOT event. */
declare const createStateSnapshotEvent: (props: StateSnapshotEventProps) => StateSnapshotEvent;
/** Creates a STATE_DELTA event. */
declare const createStateDeltaEvent: (props: StateDeltaEventProps) => StateDeltaEvent;
/** Creates a MESSAGES_SNAPSHOT event. */
declare const createMessagesSnapshotEvent: (props: MessagesSnapshotEventProps) => MessagesSnapshotEvent;
/** Creates an ACTIVITY_SNAPSHOT event. `replace` defaults to `true` when omitted. */
declare const createActivitySnapshotEvent: (props: ActivitySnapshotEventProps) => ActivitySnapshotEvent;
/** Creates an ACTIVITY_DELTA event. */
declare const createActivityDeltaEvent: (props: ActivityDeltaEventProps) => ActivityDeltaEvent;
/** Creates a RAW event. */
declare const createRawEvent: (props: RawEventProps) => RawEvent;
/** Creates a CUSTOM event. */
declare const createCustomEvent: (props: CustomEventProps) => CustomEvent;
/** Creates a RUN_STARTED event. */
declare const createRunStartedEvent: (props: RunStartedEventProps) => RunStartedEvent;
/**
 * Creates a RUN_FINISHED event.
 *
 * `outcome` is optional. Omit it for legacy/back-compat behavior, or set it
 * explicitly to `{ type: "success" }` or `{ type: "interrupt", interrupts }` —
 * see `createRunFinishedSuccessEvent` and `createRunFinishedInterruptEvent` for
 * convenience helpers. `outcome: null` is normalized to `outcome` being omitted.
 */
declare const createRunFinishedEvent: (props: RunFinishedEventProps) => RunFinishedEvent;
/** Creates a RUN_FINISHED event with `outcome: { type: "success" }`. */
declare const createRunFinishedSuccessEvent: (props: Omit<RunFinishedEventProps, "outcome">) => RunFinishedEvent;
/**
 * Creates a RUN_FINISHED event with `outcome: { type: "interrupt", interrupts }`.
 * Throws if `interrupts` is empty (the schema requires at least one entry).
 */
declare const createRunFinishedInterruptEvent: (props: Omit<RunFinishedEventProps, "outcome"> & {
  interrupts: Interrupt[];
}) => RunFinishedEvent;
/** Creates a RUN_ERROR event. */
declare const createRunErrorEvent: (props: RunErrorEventProps) => RunErrorEvent;
/** Creates a STEP_STARTED event. */
declare const createStepStartedEvent: (props: StepStartedEventProps) => StepStartedEvent;
/** Creates a STEP_FINISHED event. */
declare const createStepFinishedEvent: (props: StepFinishedEventProps) => StepFinishedEvent;
/** Creates a REASONING_START event. */
declare const createReasoningStartEvent: (props: ReasoningStartEventProps) => ReasoningStartEvent;
/** Creates a REASONING_MESSAGE_START event. */
declare const createReasoningMessageStartEvent: (props: ReasoningMessageStartEventProps) => ReasoningMessageStartEvent;
/** Creates a REASONING_MESSAGE_CONTENT event. */
declare const createReasoningMessageContentEvent: (props: ReasoningMessageContentEventProps) => ReasoningMessageContentEvent;
/** Creates a REASONING_MESSAGE_END event. */
declare const createReasoningMessageEndEvent: (props: ReasoningMessageEndEventProps) => ReasoningMessageEndEvent;
/** Creates a REASONING_MESSAGE_CHUNK event. */
declare const createReasoningMessageChunkEvent: (props: ReasoningMessageChunkEventProps) => ReasoningMessageChunkEvent;
/** Creates a REASONING_END event. */
declare const createReasoningEndEvent: (props: ReasoningEndEventProps) => ReasoningEndEvent;
/** Creates a REASONING_ENCRYPTED_VALUE event. */
declare const createReasoningEncryptedValueEvent: (props: ReasoningEncryptedValueEventProps) => ReasoningEncryptedValueEvent;
//#endregion
export { ActivityDeltaEventSchema, ActivityMessageSchema, ActivitySnapshotEventSchema, AgentCapabilitiesSchema, AssistantMessageSchema, AudioInputContentSchema, AudioInputPartSchema, BaseEventSchema, BinaryInputContentSchema, ContextSchema, CustomEventSchema, DeveloperMessageSchema, DocumentInputContentSchema, DocumentInputPartSchema, EventSchemas, EventTypeSchema, ExecutionCapabilitiesSchema, FunctionCallSchema, HumanInTheLoopCapabilitiesSchema, IdentityCapabilitiesSchema, ImageInputContentSchema, ImageInputPartSchema, InputContentDataSourceSchema, InputContentPartSchema, InputContentSchema, InputContentSourceSchema, InputContentUrlSourceSchema, InterruptSchema, MessageSchema, MessagesSnapshotEventSchema, MultiAgentCapabilitiesSchema, MultimodalCapabilitiesSchema, MultimodalInputCapabilitiesSchema, MultimodalOutputCapabilitiesSchema, OutputCapabilitiesSchema, RawEventSchema, ReasoningCapabilitiesSchema, ReasoningEncryptedValueEventSchema, ReasoningEncryptedValueSubtypeSchema, ReasoningEndEventSchema, ReasoningMessageChunkEventSchema, ReasoningMessageContentEventSchema, ReasoningMessageEndEventSchema, ReasoningMessageSchema, ReasoningMessageStartEventSchema, ReasoningStartEventSchema, ResumeEntrySchema, RoleSchema, RunAgentInputSchema, RunErrorEventSchema, RunFinishedEventSchema, RunFinishedInterruptOutcomeSchema, RunFinishedOutcomeSchema, RunFinishedSuccessOutcomeSchema, RunStartedEventSchema, StateCapabilitiesSchema, StateDeltaEventSchema, StateSchema, StateSnapshotEventSchema, StepFinishedEventSchema, StepStartedEventSchema, SubAgentInfoSchema, SystemMessageSchema, TextInputContentSchema, TextMessageChunkEventSchema, TextMessageContentEventSchema, TextMessageEndEventSchema, TextMessageStartEventSchema, ThinkingEndEventSchema, ThinkingStartEventSchema, ThinkingTextMessageContentEventSchema, ThinkingTextMessageEndEventSchema, ThinkingTextMessageStartEventSchema, ToolCallArgsEventSchema, ToolCallChunkEventSchema, ToolCallEndEventSchema, ToolCallResultEventSchema, ToolCallSchema, ToolCallStartEventSchema, ToolMessageSchema, ToolSchema, ToolsCapabilitiesSchema, TransportCapabilitiesSchema, UserMessageSchema, VideoInputContentSchema, VideoInputPartSchema, createActivityDeltaEvent, createActivitySnapshotEvent, createCustomEvent, createMessagesSnapshotEvent, createRawEvent, createReasoningEncryptedValueEvent, createReasoningEndEvent, createReasoningMessageChunkEvent, createReasoningMessageContentEvent, createReasoningMessageEndEvent, createReasoningMessageStartEvent, createReasoningStartEvent, createRunErrorEvent, createRunFinishedEvent, createRunFinishedInterruptEvent, createRunFinishedSuccessEvent, createRunStartedEvent, createStateDeltaEvent, createStateSnapshotEvent, createStepFinishedEvent, createStepStartedEvent, createTextMessageChunkEvent, createTextMessageContentEvent, createTextMessageEndEvent, createTextMessageStartEvent, createThinkingEndEvent, createThinkingStartEvent, createThinkingTextMessageContentEvent, createThinkingTextMessageEndEvent, createThinkingTextMessageStartEvent, createToolCallArgsEvent, createToolCallChunkEvent, createToolCallEndEvent, createToolCallResultEvent, createToolCallStartEvent };
//# sourceMappingURL=schemas.d.mts.map