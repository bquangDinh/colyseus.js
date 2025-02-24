import { Room, RoomAvailable } from './Room';
import { Auth } from './Auth';
import { SchemaConstructor } from './serializer/SchemaSerializer';
export declare type JoinOptions = any;
export declare class MatchMakeError extends Error {
    code: number;
    constructor(message: string, code: number);
}
export declare class Client {
    protected endpoint: string;
    protected _auth: Auth;
    constructor(endpoint?: string);
    get auth(): Auth;
    joinOrCreate<T>(roomName: string, options?: JoinOptions, rootSchema?: SchemaConstructor<T>): Promise<Room<T>>;
    create<T>(roomName: string, options?: JoinOptions, rootSchema?: SchemaConstructor<T>): Promise<Room<T>>;
    join<T>(roomName: string, options?: JoinOptions, rootSchema?: SchemaConstructor<T>): Promise<Room<T>>;
    joinById<T>(roomId: string, options?: JoinOptions, rootSchema?: SchemaConstructor<T>): Promise<Room<T>>;
    reconnect<T>(roomId: string, sessionId: string, rootSchema?: SchemaConstructor<T>): Promise<Room<T>>;
    getAvailableRooms<Metadata = any>(roomName?: string): Promise<RoomAvailable<Metadata>[]>;
    consumeSeatReservation<T>(response: any, rootSchema?: SchemaConstructor<T>): Promise<Room<T>>;
    protected createMatchMakeRequest<T>(method: string, roomName: string, options?: JoinOptions, rootSchema?: SchemaConstructor<T>): Promise<Room<T>>;
    protected createRoom<T>(roomName: string, rootSchema?: SchemaConstructor<T>): Room<T>;
    protected buildEndpoint(room: any, options?: any): string;
}
