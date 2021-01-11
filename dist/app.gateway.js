"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const Player_1 = require("./Player");
let AppGateway = class AppGateway {
    constructor() {
        this.admins = [];
        this.players = [];
        this.time = 0;
        this.vote = [];
        this.speaker = 0;
        this.startSpeaker = 0;
        this.logger = new common_1.Logger('AppGateway');
    }
    isAdmin(client) {
        return this.admins.indexOf(client.id) > -1;
    }
    handleMessage(client, payload) {
        if (this.isAdmin(client)) {
            this.logger.log(`Message: ${JSON.stringify(payload)}`);
            let data = JSON.parse(payload);
            if (data.type == "addPlayer") {
                this.logger.log("addPlayer");
            }
        }
    }
    addPlayer(client, payload) {
        if (this.isAdmin(client)) {
            this.players.push(new Player_1.Player(this.players.length + 1));
            this.sendPlayers();
        }
    }
    giveFoul(client, payload) {
        if (this.isAdmin(client)) {
            if (this.players[payload['player']].foul < 4) {
                this.players[payload['player']].foul++;
                if (this.players[payload['player']].foul >= 4) {
                    this.players[payload['player']].dis = true;
                    if (this.startSpeaker == payload['player']) {
                        let cur = this.speaker;
                        this.nextCircle();
                        this.speaker = cur;
                        this.server.emit('speech', { 'speaker': this.speaker });
                    }
                }
            }
            this.sendPlayers();
        }
    }
    refundFoul(client, payload) {
        if (this.isAdmin(client)) {
            if (this.players[payload['player']].foul > 0) {
                this.players[payload['player']].foul--;
                if (this.players[payload['player']].foul < 4) {
                    this.players[payload['player']].dis = false;
                }
            }
            this.sendPlayers();
        }
    }
    randomizeRoles(roles) {
        let uses = [];
        for (let role in roles) {
            if (uses.length == this.players.length) {
                break;
            }
            while (roles[role] > 0) {
                let cur = randomInteger(0, this.players.length - 1);
                while (uses.indexOf(cur) > 0) {
                    cur = randomInteger(0, this.players.length - 1);
                }
                this.players[cur].role = role;
                roles[role]--;
            }
        }
        this.sendPlayers();
    }
    playerAction(client, payload) {
        if (this.isAdmin(client)) {
            if (payload['playerAction'] == 'aKill') {
                this.players[payload['player']].kill();
                if (this.startSpeaker == payload['player']) {
                    this.nextCircle();
                }
                this.logger.log(this.players[payload['player']].name + " live status: " + this.players[payload['player']].live, 'Players');
            }
            if (payload['playerAction'] == 'aVote') {
                this.logger.log('took');
                if (this.players[payload['player']].live && !this.players[payload['player']].dis) {
                    if (this.vote.indexOf(payload['player']) == -1) {
                        this.vote.push(payload['player']);
                        this.logger.log(this.players[payload['player']].name + " added to vote list", 'Players');
                    }
                    else {
                        this.vote.splice(this.vote.indexOf(payload['player']), 1);
                        this.logger.log(this.players[payload['player']].name + " removed from vote list", 'Players');
                    }
                    this.server.emit('vote', { 'vote': this.vote });
                }
            }
            if (payload['playerAction'] == 'aVoteClear') {
                this.vote = [];
                this.server.emit('vote', { 'vote': this.vote });
                this.logger.log('Vote list has cleared', 'Players');
            }
            this.sendPlayers();
        }
    }
    addTimer(client, payload) {
        if (this.isAdmin(client)) {
            this.time = payload.time;
            this.logger.log('Set timer to ' + this.time + ' seconds', 'Timer');
        }
    }
    changeSpeech(client, payload) {
        this.speaker = payload.player;
        this.server.emit('speech', { 'speaker': this.speaker });
    }
    nextSpeech() {
        this.speaker++;
        if (this.speaker >= this.players.length) {
            this.speaker = 0;
        }
        while (!this.players[this.speaker].live || this.players[this.speaker].dis) {
            this.speaker++;
            if (this.speaker >= this.players.length) {
                this.speaker = 0;
            }
        }
        this.time = 1;
        if (this.speaker == this.startSpeaker) {
            this.nextCircle();
        }
        this.server.emit('speech', { 'speaker': this.speaker });
    }
    nextCircle() {
        this.startSpeaker++;
        while (!this.players[this.startSpeaker].live || this.players[this.startSpeaker].dis) {
            this.startSpeaker++;
            if (this.startSpeaker >= this.players.length) {
                this.startSpeaker = 0;
            }
        }
        this.time = 1;
        this.speaker = this.startSpeaker;
        this.server.emit('speech', { 'speaker': this.speaker });
        this.server.emit('startSpeaker', { 'speaker': this.speaker });
    }
    setDon(client, payload) {
        if (this.isAdmin(client)) {
            this.players.forEach(function (pl, i, players) {
                if (pl.role === 'don') {
                    players[i].role = '';
                }
            });
            this.players[payload['player']].role = 'don';
            this.sendPlayers();
        }
    }
    setSheriff(client, payload) {
        if (this.isAdmin(client)) {
            this.players.forEach(function (pl, i, players) {
                if (pl.role === 'sheriff') {
                    players[i].role = '';
                }
            });
            this.players[payload['player']].role = 'sheriff';
            this.sendPlayers();
        }
    }
    setMafia(client, payload) {
        if (this.isAdmin(client)) {
            if (this.players[payload['player']].role === 'mafia') {
                this.players[payload['player']].role = '';
            }
            else {
                this.players[payload['player']].role = 'mafia';
            }
            this.sendPlayers();
        }
    }
    sendPlayers() {
        this.server.emit('players', { "players": this.players });
    }
    afterInit(server) {
        this.logger.log('Init');
        let i = 1;
        while (i < 13) {
            this.players.push(new Player_1.Player(i));
            i++;
        }
        this.randomizeRoles({ "mafia": 2, "don": 1, "sheriff": 1 });
        setInterval(() => function (app) {
            if (app.time > 0) {
                app.time--;
                app.server.emit('timer', { 'timer': app.time });
            }
        }(this), 1000);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        if (this.admins.indexOf(client.id) > -1) {
            this.admins.splice(this.admins.indexOf(client.id), 1);
        }
    }
    handleConnection(client, ...args) {
        this.logger.log(`Client connected: ${client.id}`);
        if (this.admins.length < 2) {
            this.admins.push(client.id);
            this.server.emit('vote', { 'vote': this.vote });
            this.server.emit('speech', { 'speaker': this.speaker });
            this.server.emit('startSpeaker', { 'speaker': this.speaker });
            this.sendPlayers();
        }
        else {
            client.disconnect();
            this.logger.log(`AdminList is full. Client blacklisted`);
        }
        this.logger.log(JSON.stringify(this.admins));
    }
};
__decorate([
    websockets_1.WebSocketServer(),
    __metadata("design:type", typeof (_a = typeof socket_io_1.Server !== "undefined" && socket_io_1.Server) === "function" ? _a : Object)
], AppGateway.prototype, "server", void 0);
__decorate([
    websockets_1.SubscribeMessage('msgToServer'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _b : Object, String]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "handleMessage", null);
__decorate([
    websockets_1.SubscribeMessage('addPlayer'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _c : Object, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "addPlayer", null);
__decorate([
    websockets_1.SubscribeMessage('foul'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _d : Object, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "giveFoul", null);
__decorate([
    websockets_1.SubscribeMessage('antifoul'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_e = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _e : Object, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "refundFoul", null);
__decorate([
    websockets_1.SubscribeMessage('playerAction'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_f = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _f : Object, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "playerAction", null);
__decorate([
    websockets_1.SubscribeMessage('timer'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_g = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _g : Object, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "addTimer", null);
__decorate([
    websockets_1.SubscribeMessage('changeSpeech'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_h = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _h : Object, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "changeSpeech", null);
__decorate([
    websockets_1.SubscribeMessage('nextSpeech'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "nextSpeech", null);
__decorate([
    websockets_1.SubscribeMessage('nextCircle'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "nextCircle", null);
__decorate([
    websockets_1.SubscribeMessage('setDon'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_j = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _j : Object, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "setDon", null);
__decorate([
    websockets_1.SubscribeMessage('setSheriff'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_k = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _k : Object, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "setSheriff", null);
__decorate([
    websockets_1.SubscribeMessage('setMafia'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_l = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _l : Object, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "setMafia", null);
AppGateway = __decorate([
    websockets_1.WebSocketGateway()
], AppGateway);
exports.AppGateway = AppGateway;
function randomInteger(min, max) {
    let rand = min + Math.random() * (max + 1 - min);
    return Math.floor(rand);
}
//# sourceMappingURL=app.gateway.js.map