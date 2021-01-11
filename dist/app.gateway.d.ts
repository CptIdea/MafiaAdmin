import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { Player } from "./Player";
export declare class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    admins: string[];
    players: Player[];
    time: number;
    vote: number[];
    speaker: number;
    startSpeaker: number;
    gameStep: 0;
    isAdmin(client: Socket): boolean;
    private logger;
    handleMessage(client: Socket, payload: string): void;
    addPlayer(client: Socket, payload: any): void;
    giveFoul(client: Socket, payload: any): void;
    refundFoul(client: Socket, payload: any): void;
    randomizeRoles(roles: any): void;
    playerAction(client: Socket, payload: any): void;
    addTimer(client: Socket, payload: any): void;
    changeSpeech(client: Socket, payload: any): void;
    nextSpeech(): void;
    nextCircle(): void;
    setDon(client: Socket, payload: any): void;
    setSheriff(client: Socket, payload: any): void;
    setMafia(client: Socket, payload: any): void;
    sendPlayers(): void;
    afterInit(server: Server): void;
    handleDisconnect(client: Socket): void;
    handleConnection(client: Socket, ...args: any[]): void;
}
