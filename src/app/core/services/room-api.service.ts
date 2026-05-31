import { inject, Injectable } from "@angular/core";
import { ApiManagerService } from "../api/api-manager.service";
import { Observable } from "rxjs";
import { Room } from "../models/room.models";
import { RoomEventResponse } from "../models/room-event.model";
import {
    CreateRoomRequest,
    JoinRoomRequest,
    ReviewDecisionRequest,
    ReviewVoteRequest,
    SelectLetterRequest,
    SubmitAnswersRequest
} from "../room-request.model";


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
        return this.apiManager.post<null, Room>(
            `rooms/${roomCode}/start?hostPlayerId=${hostPlayerId}`,
            null
        );
    }

    toggleReady(roomCode: string, playerId: number): Observable<Room> {
        return this.apiManager.patch<null, Room>(`rooms/${roomCode}/players/${playerId}/ready`, null);
    }

    selectLetter(roomCode: string, roundId: number, request: SelectLetterRequest): Observable<RoomEventResponse | Room> {
        return this.apiManager.post<SelectLetterRequest, RoomEventResponse | Room>(
            `rooms/${roomCode}/rounds/${roundId}/select-letter`,
            request
        );
    }

    submitAnswers(roomCode: string, roundId: number, request: SubmitAnswersRequest): Observable<RoomEventResponse | Room> {
        return this.apiManager.post<SubmitAnswersRequest, RoomEventResponse | Room>(
            `rooms/${roomCode}/rounds/${roundId}/answers`,
            request
        );
    }

    lockRound(roomCode: string, roundId: number): Observable<RoomEventResponse | Room> {
        return this.apiManager.post<null, RoomEventResponse | Room>(
            `rooms/${roomCode}/rounds/${roundId}/lock`,
            null
        );
    }

    startReview(roomCode: string, roundId: number, hostPlayerId: number): Observable<RoomEventResponse | Room> {
        return this.apiManager.post<null, RoomEventResponse | Room>(
            `rooms/${roomCode}/rounds/${roundId}/review/start?hostPlayerId=${hostPlayerId}`,
            null
        );
    }

    voteOnAnswer(roomCode: string, roundId: number, request: ReviewVoteRequest): Observable<RoomEventResponse | Room> {
        return this.apiManager.post<ReviewVoteRequest, RoomEventResponse | Room>(
            `rooms/${roomCode}/rounds/${roundId}/review/vote`,
            request
        );
    }

    decideAnswer(roomCode: string, roundId: number, hostPlayerId: number, request: ReviewDecisionRequest): Observable<RoomEventResponse | Room> {
        return this.apiManager.post<ReviewDecisionRequest, RoomEventResponse | Room>(
            `rooms/${roomCode}/rounds/${roundId}/review/decision?hostPlayerId=${hostPlayerId}`,
            request
        );
    }

    completeReview(roomCode: string, roundId: number, hostPlayerId: number): Observable<RoomEventResponse | Room> {
        return this.apiManager.post<null, RoomEventResponse | Room>(
            `rooms/${roomCode}/rounds/${roundId}/review/complete?hostPlayerId=${hostPlayerId}`,
            null
        );
    }

    nextRound(roomCode: string, roundId: number, hostPlayerId: number): Observable<RoomEventResponse | Room> {
        return this.apiManager.post<null, RoomEventResponse | Room>(
            `rooms/${roomCode}/rounds/${roundId}/next?hostPlayerId=${hostPlayerId}`,
            null
        );
    }

    closeRoom(roomCode: string, hostPlayerId: number): Observable<RoomEventResponse | null> {
        return this.apiManager.post<null, RoomEventResponse | null>(
            `rooms/${roomCode}/close?hostPlayerId=${hostPlayerId}`,
            null
        );
    }
}
