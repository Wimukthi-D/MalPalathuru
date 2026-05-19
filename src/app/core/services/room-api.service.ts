import { inject, Injectable } from "@angular/core";
import { ApiManagerService } from "../api/api-manager.service";
import { Observable } from "rxjs";
import { Room } from "../room.models";
import { CreateRoomRequest, JoinRoomRequest } from "../room-request.model";


@Injectable({providedIn: 'root'})
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

}