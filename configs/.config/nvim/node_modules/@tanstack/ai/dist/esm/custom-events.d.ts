import { CustomEvent, StreamChunk } from './types.js';
/** Well-known CUSTOM event names. */
export declare const CUSTOM_EVENT: {
    readonly FILE_CHANGED: "file.changed";
    readonly PROCESS_STDOUT: "process.stdout";
    readonly PROCESS_STDERR: "process.stderr";
    readonly PORT_OPENED: "port.opened";
    readonly APPROVAL_REQUESTED: "approval.requested";
    readonly APPROVAL_RESOLVED: "approval.resolved";
    readonly ARTIFACT_CREATED: "artifact.created";
    readonly SANDBOX_CREATED: "sandbox.created";
    readonly SANDBOX_RESUMED: "sandbox.resumed";
};
/** Union of the well-known CUSTOM event name literals. */
export type WellKnownCustomEventName = (typeof CUSTOM_EVENT)[keyof typeof CUSTOM_EVENT];
export interface FileChangedPayload {
    type: 'create' | 'change' | 'delete';
    /** Absolute path inside the sandbox (under the workspace root). */
    path: string;
    /** Unified diff, when the harness can produce one. */
    diff?: string;
    timestamp: number;
}
export interface ProcessOutputPayload {
    /** Stable id for the spawned process whose output this is. */
    processId: string;
    /** A chunk of stdout/stderr text. */
    chunk: string;
}
export interface PortOpenedPayload {
    port: number;
    /** Externally reachable URL, when the provider exposes one. */
    url?: string;
}
export interface ApprovalRequestedPayload {
    approvalId: string;
    title: string;
    /** Free-form detail describing the action awaiting approval. */
    [key: string]: unknown;
}
export interface ApprovalResolvedPayload {
    approvalId: string;
    granted: boolean;
}
export interface ArtifactCreatedPayload {
    artifactId: string;
    name: string;
    mimeType: string;
    size: number;
}
export interface SandboxLifecyclePayload {
    sandboxId: string;
    provider: string;
}
/** Maps each well-known name to its payload type. */
export interface CustomEventPayloads {
    [CUSTOM_EVENT.FILE_CHANGED]: FileChangedPayload;
    [CUSTOM_EVENT.PROCESS_STDOUT]: ProcessOutputPayload;
    [CUSTOM_EVENT.PROCESS_STDERR]: ProcessOutputPayload;
    [CUSTOM_EVENT.PORT_OPENED]: PortOpenedPayload;
    [CUSTOM_EVENT.APPROVAL_REQUESTED]: ApprovalRequestedPayload;
    [CUSTOM_EVENT.APPROVAL_RESOLVED]: ApprovalResolvedPayload;
    [CUSTOM_EVENT.ARTIFACT_CREATED]: ArtifactCreatedPayload;
    [CUSTOM_EVENT.SANDBOX_CREATED]: SandboxLifecyclePayload;
    [CUSTOM_EVENT.SANDBOX_RESUMED]: SandboxLifecyclePayload;
}
/** A CUSTOM event narrowed to a specific well-known name and its payload. */
export type WellKnownCustomEvent<TName extends WellKnownCustomEventName> = CustomEvent & {
    name: TName;
    value: CustomEventPayloads[TName];
};
/**
 * Type guard: is `chunk` a CUSTOM event with the given well-known `name`?
 * Narrows the payload type when true, so consumers read `chunk.value` typed.
 */
export declare function isCustomEvent<TName extends WellKnownCustomEventName>(chunk: StreamChunk, name: TName): chunk is WellKnownCustomEvent<TName>;
