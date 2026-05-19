import { signal, Injectable } from "@angular/core";
import { Room } from "../room.models";
import { Player } from "../player.model";

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
}