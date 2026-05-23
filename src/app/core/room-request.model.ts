import { GameLanguage } from "./models/room.models";

export interface CreateRoomRequest {
    playerName: string;
    language: GameLanguage;
    maxPlayers: number;
    countLimitSeconds: number;
    privateRoom: boolean;
}

export interface JoinRoomRequest {
    playerName: string;
    roomCode: string;
}