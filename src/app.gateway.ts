import {
    SubscribeMessage,
    WebSocketGateway,
    OnGatewayInit,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import {Logger} from '@nestjs/common';
import {Socket, Server} from 'socket.io';
import {Player} from "./Player";


@WebSocketGateway()
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    admins: string[] = [];
    players: Player[] = [];
    time: number = 0;
    vote: number[] = [];
    speaker: number = 0
    startSpeaker: number = 0
    gameStep: 0; //0 - Waiting start, 1 - selectMafia, 2 - selectSheriff

    isAdmin(client: Socket): boolean {
        return this.admins.indexOf(client.id) > -1
    }

    private logger: Logger = new Logger('AppGateway');

    @SubscribeMessage('msgToServer')
    handleMessage(client: Socket, payload: string): void {
        if (this.isAdmin(client)) {
            //this.server.emit('msgToClient', payload);
            this.logger.log(`Message: ${JSON.stringify(payload)}`)
            let data = JSON.parse(payload)
            if (data.type == "addPlayer") {
                this.logger.log("addPlayer")
            }
        }
    }

    @SubscribeMessage('addPlayer')
    addPlayer(client: Socket, payload: any): void {
        if (this.isAdmin(client)) {
            this.players.push(new Player(this.players.length + 1))
            this.sendPlayers()
        }
    }

    @SubscribeMessage('foul')
    giveFoul(client: Socket, payload: any): void {
        if (this.isAdmin(client)){
            if (this.players[payload['player']].foul<4){
                this.players[payload['player']].foul++
                if (this.players[payload['player']].foul>=4){
                    this.players[payload['player']].dis = true
                    if (this.startSpeaker==payload['player']){
                        let cur = this.speaker
                        this.nextCircle()
                        this.speaker = cur
                        this.server.emit('speech', {'speaker': this.speaker})
                    }
                }
            }
            this.sendPlayers()
        }
    }
    @SubscribeMessage('antifoul')
    refundFoul(client: Socket, payload: any): void {
        if (this.isAdmin(client)){
            if (this.players[payload['player']].foul>0){
                this.players[payload['player']].foul--
                if (this.players[payload['player']].foul<4){
                    this.players[payload['player']].dis = false
                }
            }
            this.sendPlayers()
        }
    }

    randomizeRoles(roles: any) {
        let uses: number[] = []
        for (let role in roles) {
            if (uses.length == this.players.length) {
                break
            }
            while (roles[role] > 0) {
                let cur = randomInteger(0, this.players.length - 1)
                while (uses.indexOf(cur) > 0) {
                    cur = randomInteger(0, this.players.length - 1)
                }
                this.players[cur].role = role
                roles[role]--
            }
        }
        this.sendPlayers()
    }

    @SubscribeMessage('playerAction')
    playerAction(client: Socket, payload: any) {
        if (this.isAdmin(client)) {
            if (payload['playerAction'] == 'aKill') {
                this.players[payload['player']].kill()
                if (this.startSpeaker==payload['player']) {
                    this.nextCircle()
                }
                this.logger.log(this.players[payload['player']].name + " live status: " + this.players[payload['player']].live, 'Players')
            }
            if (payload['playerAction'] == 'aVote') {
                this.logger.log('took')
                if (this.players[payload['player']].live && !this.players[payload['player']].dis) {

                    if (this.vote.indexOf(payload['player']) == -1) {
                        this.vote.push(payload['player'])
                        this.logger.log(this.players[payload['player']].name + " added to vote list", 'Players')
                    } else {
                        this.vote.splice(this.vote.indexOf(payload['player']), 1)
                        this.logger.log(this.players[payload['player']].name + " removed from vote list", 'Players')
                    }
                    this.server.emit('vote', {'vote': this.vote})
                }
            }
            if (payload['playerAction'] == 'aVoteClear') {
                this.vote = []
                this.server.emit('vote', {'vote': this.vote})
                this.logger.log('Vote list has cleared', 'Players')
            }


            this.sendPlayers()
        }
    }

    @SubscribeMessage('timer')
    addTimer(client: Socket, payload: any) {
        if (this.isAdmin(client)) {
            this.time = payload.time
            this.logger.log('Set timer to ' + this.time + ' seconds', 'Timer')
        }
    }

    @SubscribeMessage('changeSpeech')
    changeSpeech(client: Socket, payload: any) {
        this.speaker = payload.player
        this.server.emit('speech', {'speaker': this.speaker})
    }

    @SubscribeMessage('nextSpeech')
    nextSpeech() {
        this.speaker++
        if (this.speaker >= this.players.length) {
            this.speaker = 0
        }
        while (!this.players[this.speaker].live || this.players[this.speaker].dis) {
            this.speaker++
            if (this.speaker >= this.players.length) {
                this.speaker = 0
            }
        }
        this.time = 1
        if (this.speaker==this.startSpeaker){
            this.nextCircle()
        }
        this.server.emit('speech', {'speaker': this.speaker})
    }

    @SubscribeMessage('nextCircle')
    nextCircle() {
        this.startSpeaker++
        while (!this.players[this.startSpeaker].live || this.players[this.startSpeaker].dis) {
            this.startSpeaker++
            if (this.startSpeaker >= this.players.length) {
                this.startSpeaker = 0
            }
        }
        this.time = 1
        this.speaker = this.startSpeaker
        this.server.emit('speech', {'speaker': this.speaker})
        this.server.emit('startSpeaker', {'speaker': this.speaker})
    }

    @SubscribeMessage('setDon')
    setDon(client: Socket, payload: any){
        if (this.isAdmin(client)){
            this.players.forEach(function (pl,i,players) {
                if (pl.role==='don'){
                    players[i].role=''
                }
            })
            this.players[payload['player']].role = 'don'
            this.sendPlayers()
        }
    }
    @SubscribeMessage('setSheriff')
    setSheriff(client: Socket, payload: any){
        if (this.isAdmin(client)){
            this.players.forEach(function (pl,i,players) {
                if (pl.role==='sheriff'){
                    players[i].role=''
                }
            })
            this.players[payload['player']].role = 'sheriff'
            this.sendPlayers()
        }
    }
    @SubscribeMessage('setMafia')
    setMafia(client: Socket, payload: any){
        if (this.isAdmin(client)){
            if (this.players[payload['player']].role === 'mafia'){
                this.players[payload['player']].role = ''
            }else {
                this.players[payload['player']].role = 'mafia'
            }
            this.sendPlayers()
        }
    }
    sendPlayers() {
        this.server.emit('players', {"players": this.players})
    }

    afterInit(server: Server) {
        this.logger.log('Init');
        let i = 1
        while (i < 13) {
            this.players.push(new Player(i))
            i++
        }
        this.randomizeRoles({"mafia": 2, "don": 1, "sheriff": 1})

        setInterval(() => function (app) {
            if (app.time > 0) {
                app.time--
                app.server.emit('timer', {'timer': app.time})
            }
        }(this), 1000);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        if (this.admins.indexOf(client.id) > -1) {
            this.admins.splice(this.admins.indexOf(client.id), 1)
        }
    }

    handleConnection(client: Socket, ...args: any[]) {
        this.logger.log(`Client connected: ${client.id}`);

        if (this.admins.length < 2) {
            this.admins.push(client.id);
            this.server.emit('vote', {'vote': this.vote})
            this.server.emit('speech', {'speaker': this.speaker})
            this.server.emit('startSpeaker', {'speaker': this.speaker})
            this.sendPlayers()
        } else {
            client.disconnect();
            this.logger.log(`AdminList is full. Client blacklisted`);
        }


        this.logger.log(JSON.stringify(this.admins))
    }
}

function randomInteger(min, max) {
    let rand = min + Math.random() * (max + 1 - min);
    return Math.floor(rand);
}
