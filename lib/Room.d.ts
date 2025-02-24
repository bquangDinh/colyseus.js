import { Connection } from './Connection';
import { Serializer } from './serializer/Serializer';
import { DefaultEvents, Emitter } from 'nanoevents';
import { EventEmitter } from './core/signal';
import { SchemaConstructor } from './serializer/SchemaSerializer';
import { Schema } from '@colyseus/schema';
export interface RoomAvailable<Metadata = any> {
    roomId: string;
    clients: number;
    maxClients: number;
    metadata?: Metadata;
}
export declare class Room<State = any> {
    roomId: string;
    sessionId: string;
    name: string;
    connection: Connection;
    onStateChange: {
        once: (cb: (state: State) => void) => void;
        remove: (cb: (state: State) => void) => void;
        invoke: (state: State) => void;
        invokeAsync: (state: State) => Promise<any[]>;
        clear: () => void;
    } & ((this: any, cb: (state: State) => void) => EventEmitter<(state: State) => void>);
    onError: {
        once: (cb: (code: number, message?: string) => void) => void;
        remove: (cb: (code: number, message?: string) => void) => void;
        invoke: (code: number, message?: string) => void;
        invokeAsync: (code: number, message?: string) => Promise<any[]>;
        clear: () => void;
    } & ((this: any, cb: (code: number, message?: string) => void) => EventEmitter<(code: number, message?: string) => void>);
    onLeave: {
        once: (cb: (code: number) => void) => void;
        remove: (cb: (code: number) => void) => void;
        invoke: (code: number) => void;
        invokeAsync: (code: number) => Promise<any[]>;
        clear: () => void;
    } & ((this: any, cb: (code: number) => void) => EventEmitter<(code: number) => void>);
    protected onJoin: {
        once: (cb: (...args: any[]) => void | Promise<any>) => void;
        remove: (cb: (...args: any[]) => void | Promise<any>) => void;
        invoke: (...args: any[]) => void;
        invokeAsync: (...args: any[]) => Promise<any[]>;
        clear: () => void;
    } & ((this: any, cb: (...args: any[]) => void | Promise<any>) => EventEmitter<(...args: any[]) => void | Promise<any>>);
    serializerId: string;
    protected serializer: Serializer<State>;
    protected hasJoined: boolean;
    protected rootSchema: SchemaConstructor<State>;
    protected onMessageHandlers: Emitter<DefaultEvents>;
    constructor(name: string, rootSchema?: SchemaConstructor<State>);
    get id(): string;
    connect(endpoint: string): void;
    leave(consented?: boolean): Promise<number>;
    onMessage<T = any>(type: "*", callback: (type: string | number | Schema, message: T) => void): any;
    onMessage<T extends (typeof Schema & (new (...args: any[]) => any))>(type: T, callback: (message: InstanceType<T>) => void): any;
    onMessage<T = any>(type: string | number, callback: (message: T) => void): any;
    send(type: string | number, message?: any): void;
    get state(): State;
    removeAllListeners(): void;
    protected onMessageCallback(event: MessageEvent): void;
    protected setState(encodedState: number[]): void;
    protected patch(binaryPatch: number[]): void;
    private dispatchMessage;
    private destroy;
    private getMessageHandlerKey;
}
