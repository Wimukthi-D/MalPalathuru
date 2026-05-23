import { signal, Injectable } from "@angular/core";
import { Room } from "../models/room.models";
import { Player } from "../models/player.model";

@Injectable({ providedIn: 'root' })
export class RoomStateService {
    currentRoom = signal<Room | null>(null);
    currentPLayer = signal<Player | null>(null);

    setRoom(room: Room): void {
        this.currentRoom.set(room);
        localStorage.setItem('roomCode', room.roomCode);
    }

    setCurrentPlayer(player: Player): void {
        this.currentPLayer.set(player);

        localStorage.setItem('playerId', String(player.id));
        localStorage.setItem('playerName', String(player.playerName));
        localStorage.setItem('isHost', String(player.host));
    }

    isStoredHost(): boolean {
        return localStorage.getItem('isHost') === 'true';
    }

    getStoredRoomCode(): string | null {
        return localStorage.getItem('roomCode');
    }
    
    getStoredPlayerId(): number | null {
        const playerId = localStorage.getItem('playerId');
        return playerId ? Number(playerId) : null;
    }

    getStoredPlayerName(): string | null {
        return localStorage.getItem('playerName');
    }

    clearRoom(): void {
        this.currentRoom.set(null);
        this.currentPLayer.set(null);
        localStorage.removeItem('roomCode');
        localStorage.removeItem('playerId');
        localStorage.removeItem('playerName');
        localStorage.removeItem('isHost');
    }
}