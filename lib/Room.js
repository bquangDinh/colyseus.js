"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
const msgpack = __importStar(require("./msgpack"));
const Connection_1 = require("./Connection");
const Serializer_1 = require("./serializer/Serializer");
const Protocol_1 = require("./Protocol");
// The unused imports here are important for better `.d.ts` file generation
// (Later merged with `dts-bundle-generator`)
const nanoevents_1 = require("nanoevents");
const signal_1 = require("./core/signal");
const schema_1 = require("@colyseus/schema");
class Room {
    constructor(name, rootSchema) {
        // Public signals
        this.onStateChange = signal_1.createSignal();
        this.onError = signal_1.createSignal();
        this.onLeave = signal_1.createSignal();
        this.onJoin = signal_1.createSignal();
        this.hasJoined = false;
        this.onMessageHandlers = nanoevents_1.createNanoEvents();
        this.roomId = null;
        this.name = name;
        if (rootSchema) {
            this.serializer = new (Serializer_1.getSerializer("schema"));
            this.rootSchema = rootSchema;
            this.serializer.state = new rootSchema();
        }
        this.onError((code, message) => console.warn(`colyseus.js - onError => (${code}) ${message}`));
        this.onLeave(() => this.removeAllListeners());
    }
    // TODO: deprecate me on version 1.0
    get id() { return this.roomId; }
    connect(endpoint) {
        this.connection = new Connection_1.Connection();
        this.connection.events.onmessage = this.onMessageCallback.bind(this);
        this.connection.events.onclose = (e) => {
            if (!this.hasJoined) {
                console.warn(`Room connection was closed unexpectedly (${e.code}): ${e.reason}`);
                this.onError.invoke(e.code, e.reason);
                return;
            }
            this.onLeave.invoke(e.code);
            this.destroy();
        };
        this.connection.events.onerror = (e) => {
            console.warn(`Room, onError (${e.code}): ${e.reason}`);
            this.onError.invoke(e.code, e.reason);
        };
        this.connection.connect(endpoint);
    }
    leave(consented = true) {
        return new Promise((resolve) => {
            this.onLeave((code) => resolve(code));
            if (this.connection) {
                if (consented) {
                    this.connection.send([Protocol_1.Protocol.LEAVE_ROOM]);
                }
                else {
                    this.connection.close();
                }
            }
            else {
                this.onLeave.invoke(4000); // "consented" code
            }
        });
    }
    onMessage(type, callback) {
        return this.onMessageHandlers.on(this.getMessageHandlerKey(type), callback);
    }
    send(type, message) {
        const initialBytes = [Protocol_1.Protocol.ROOM_DATA];
        if (typeof (type) === "string") {
            schema_1.encode.string(initialBytes, type);
        }
        else {
            schema_1.encode.number(initialBytes, type);
        }
        let arr;
        if (message !== undefined) {
            const encoded = msgpack.encode(message);
            arr = new Uint8Array(initialBytes.length + encoded.byteLength);
            arr.set(new Uint8Array(initialBytes), 0);
            arr.set(new Uint8Array(encoded), initialBytes.length);
        }
        else {
            arr = new Uint8Array(initialBytes);
        }
        this.connection.send(arr.buffer);
    }
    get state() {
        return this.serializer.getState();
    }
    removeAllListeners() {
        this.onJoin.clear();
        this.onStateChange.clear();
        this.onError.clear();
        this.onLeave.clear();
        this.onMessageHandlers.events = {};
    }
    onMessageCallback(event) {
        const bytes = Array.from(new Uint8Array(event.data));
        const code = bytes[0];
        if (code === Protocol_1.Protocol.JOIN_ROOM) {
            let offset = 1;
            this.serializerId = Protocol_1.utf8Read(bytes, offset);
            offset += Protocol_1.utf8Length(this.serializerId);
            // Instantiate serializer if not locally available.
            if (!this.serializer) {
                const serializer = Serializer_1.getSerializer(this.serializerId);
                this.serializer = new serializer();
            }
            if (bytes.length > offset && this.serializer.handshake) {
                this.serializer.handshake(bytes, { offset });
            }
            this.hasJoined = true;
            this.onJoin.invoke();
            // acknowledge successfull JOIN_ROOM
            this.connection.send([Protocol_1.Protocol.JOIN_ROOM]);
        }
        else if (code === Protocol_1.Protocol.ERROR) {
            const it = { offset: 1 };
            const code = schema_1.decode.number(bytes, it);
            const message = schema_1.decode.string(bytes, it);
            this.onError.invoke(code, message);
        }
        else if (code === Protocol_1.Protocol.LEAVE_ROOM) {
            this.leave();
        }
        else if (code === Protocol_1.Protocol.ROOM_DATA_SCHEMA) {
            const it = { offset: 1 };
            const context = this.serializer.getState().constructor._context;
            const type = context.get(schema_1.decode.number(bytes, it));
            const message = new type();
            message.decode(bytes, it);
            this.dispatchMessage(type, message);
        }
        else if (code === Protocol_1.Protocol.ROOM_STATE) {
            bytes.shift(); // drop `code` byte
            this.setState(bytes);
        }
        else if (code === Protocol_1.Protocol.ROOM_STATE_PATCH) {
            bytes.shift(); // drop `code` byte
            this.patch(bytes);
        }
        else if (code === Protocol_1.Protocol.ROOM_DATA) {
            const it = { offset: 1 };
            const type = (schema_1.decode.stringCheck(bytes, it))
                ? schema_1.decode.string(bytes, it)
                : schema_1.decode.number(bytes, it);
            const message = (bytes.length > it.offset)
                ? msgpack.decode(event.data, it.offset)
                : undefined;
            this.dispatchMessage(type, message);
        }
    }
    setState(encodedState) {
        this.serializer.setState(encodedState);
        this.onStateChange.invoke(this.serializer.getState());
    }
    patch(binaryPatch) {
        this.serializer.patch(binaryPatch);
        this.onStateChange.invoke(this.serializer.getState());
    }
    dispatchMessage(type, message) {
        const messageType = this.getMessageHandlerKey(type);
        if (this.onMessageHandlers.events[messageType]) {
            this.onMessageHandlers.emit(messageType, message);
        }
        else if (this.onMessageHandlers.events['*']) {
            this.onMessageHandlers.emit('*', type, message);
        }
        else {
            console.warn(`colyseus.js: onMessage() not registered for type '${type}'.`);
        }
    }
    destroy() {
        if (this.serializer) {
            this.serializer.teardown();
        }
    }
    getMessageHandlerKey(type) {
        switch (typeof (type)) {
            // typeof Schema
            case "function": return `$${type._typeid}`;
            // string
            case "string": return type;
            // number
            case "number": return `i${type}`;
            default: throw new Error("invalid message type.");
        }
    }
}
exports.Room = Room;
//# sourceMappingURL=Room.js.map