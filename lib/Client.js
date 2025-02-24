"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = exports.MatchMakeError = void 0;
const httpie_1 = require("httpie");
const ServerError_1 = require("./errors/ServerError");
const Room_1 = require("./Room");
const Auth_1 = require("./Auth");
class MatchMakeError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        Object.setPrototypeOf(this, MatchMakeError.prototype);
    }
}
exports.MatchMakeError = MatchMakeError;
// - React Native does not provide `window.location`
// - Cocos Creator (Native) does not provide `window.location.hostname`
const DEFAULT_ENDPOINT = (typeof (window) !== "undefined" && typeof ((_a = window === null || window === void 0 ? void 0 : window.location) === null || _a === void 0 ? void 0 : _a.hostname) !== "undefined")
    ? `${window.location.protocol.replace("http", "ws")}//${window.location.hostname}${(window.location.port && `:${window.location.port}`)}`
    : "ws://127.0.0.1:2567";
class Client {
    constructor(endpoint = DEFAULT_ENDPOINT) {
        this.endpoint = endpoint;
    }
    get auth() {
        if (!this._auth) {
            this._auth = new Auth_1.Auth(this.endpoint);
        }
        return this._auth;
    }
    joinOrCreate(roomName, options = {}, rootSchema) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.createMatchMakeRequest('joinOrCreate', roomName, options, rootSchema);
        });
    }
    create(roomName, options = {}, rootSchema) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.createMatchMakeRequest('create', roomName, options, rootSchema);
        });
    }
    join(roomName, options = {}, rootSchema) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.createMatchMakeRequest('join', roomName, options, rootSchema);
        });
    }
    joinById(roomId, options = {}, rootSchema) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.createMatchMakeRequest('joinById', roomId, options, rootSchema);
        });
    }
    reconnect(roomId, sessionId, rootSchema) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.createMatchMakeRequest('joinById', roomId, { sessionId }, rootSchema);
        });
    }
    getAvailableRooms(roomName = "") {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${this.endpoint.replace("ws", "http")}/matchmake/${roomName}`;
            return (yield httpie_1.get(url, { headers: { 'Accept': 'application/json' } })).data;
        });
    }
    consumeSeatReservation(response, rootSchema) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = this.createRoom(response.room.name, rootSchema);
            room.roomId = response.room.roomId;
            room.sessionId = response.sessionId;
            room.connect(this.buildEndpoint(response.room, { sessionId: room.sessionId }));
            return new Promise((resolve, reject) => {
                const onError = (code, message) => reject(new ServerError_1.ServerError(code, message));
                room.onError.once(onError);
                room['onJoin'].once(() => {
                    room.onError.remove(onError);
                    resolve(room);
                });
            });
        });
    }
    createMatchMakeRequest(method, roomName, options = {}, rootSchema) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${this.endpoint.replace("ws", "http")}/matchmake/${method}/${roomName}`;
            // automatically forward auth token, if present
            if (this._auth && this._auth.hasToken) {
                options.token = this._auth.token;
            }
            const response = (yield httpie_1.post(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(options)
            })).data;
            if (response.error) {
                throw new MatchMakeError(response.error, response.code);
            }
            return this.consumeSeatReservation(response, rootSchema);
        });
    }
    createRoom(roomName, rootSchema) {
        return new Room_1.Room(roomName, rootSchema);
    }
    buildEndpoint(room, options = {}) {
        const params = [];
        for (const name in options) {
            if (!options.hasOwnProperty(name)) {
                continue;
            }
            params.push(`${name}=${options[name]}`);
        }
        return `${this.endpoint}/${room.processId}/${room.roomId}?${params.join('&')}`;
    }
}
exports.Client = Client;
//# sourceMappingURL=Client.js.map