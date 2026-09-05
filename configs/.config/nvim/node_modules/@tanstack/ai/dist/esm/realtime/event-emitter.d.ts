import { RealtimeEvent, RealtimeEventHandler, RealtimeEventPayloads } from './types.js';
export declare function createRealtimeEventEmitter(): {
    emit<TEvent extends RealtimeEvent>(event: TEvent, payload: RealtimeEventPayloads[TEvent]): void;
    on<TEvent extends RealtimeEvent>(event: TEvent, handler: RealtimeEventHandler<TEvent>): () => void;
};
