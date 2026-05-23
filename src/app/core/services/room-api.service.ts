import { inject, Injectable } from "@angular/core";
import { ApiManagerService } from "../api/api-manager.service";
import { Observable } from "rxjs";
import { Room } from "../models/room.models";
import { CreateRoomRequest, JoinRoomRequest } from "../room-request.model";


@Injectable({ providedIn: 'root' })
export class RoomApiService {

    private readonly apiManager = inject(ApiManagerService);

    createRoom(request: CreateRoomRequest): Observable<Room> {
        return this.apiManager.post<CreateRoomRequest, Room>('rooms', request);
    }

    joinRoom(request: JoinRoomRequest): Observable<Room> {
        return this.apiManager.post<JoinRoomRequest, Room>('rooms/join', request);
    }

    getRoomByCode(roomCode: string): Observable<Room> {
        return this.apiManager.get<Room>(`rooms/${roomCode}`);
    }

    lockRoom(roomCode: string, hostPlayerId: number): Observable<Room> {
        return this.apiManager.patch<null, Room>(`rooms/${roomCode}/lock?hostPlayerId=${hostPlayerId}`, null);
    }

    unlockRoom(roomCode: string, hostPlayerId: number): Observable<Room> {
        return this.apiManager.patch<null, Room>(`rooms/${roomCode}/unlock?hostPlayerId=${hostPlayerId}`, null);
    }

    leavePlayer(roomCode: string, playerId: number): Observable<Room | null> {
        return this.apiManager.delete<Room | null>(`rooms/${roomCode}/players/${playerId}`);
    }

    kickPlayer(roomCode: string, targetPlayerId: number, hostPlayerId: number): Observable<Room> {
        return this.apiManager.delete<Room>(`rooms/${roomCode}/players/${targetPlayerId}?hostPlayerId=${hostPlayerId}`);
    }

    startGame(roomCode: string, hostPlayerId: number): Observable<Room> {
        return this.apiManager.patch<null, Room>(
            `rooms/${roomCode}/start?hostPlayerId=${hostPlayerId}`,
            null
        );
    }
}
