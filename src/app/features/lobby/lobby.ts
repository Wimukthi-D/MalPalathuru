import { Component, computed, inject, OnDestroy, OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { RoomApiService } from "../../core/services/room-api.service";
import { RoomStateService } from "../../core/services/room-state.service";
import { interval, Subscription } from "rxjs";
import { Room } from "../../core/room.models";
import { Player } from "../../core/player.model";

@Component({
    selector: 'app-lobby',
    imports: [
        RouterLink,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './lobby.html',
    styleUrl: './lobby.scss'
})


export class Lobby implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly roomApiService = inject(RoomApiService);
    private readonly roomStateService = inject(RoomStateService);

    room = signal<Room | null>(null);
    currentPlayerId = signal<number | null>(null);
    currentPlayerName = signal<string | null>(null);
    isHost = signal(false);

    loading = signal(true);
    errorMessage = signal<string | null>(null);
    copied = signal(false);

    private lobbyRefreshSubscription?: Subscription;

    playerCount = computed(() => this.room()?.players.length ?? 0);

    currentPlayer = computed(() => {
        const room = this.room();
        const playerId = this.currentPlayerId();

        if (!room || !playerId) {
            return null;
        }

        return room.players.find((player) => player.id === playerId) ?? null;
    });

    hostPlayer = computed(() => {
        return this.room()?.players.find((player) => player.host) ?? null;
    });

    ngOnInit(): void {
        const roomCodeFromRoute = this.route.snapshot.paramMap.get('roomCode');

        this.currentPlayerId.set(this.roomStateService.getStoredPlayerId());
        this.currentPlayerName.set(this.roomStateService.getStoredPlayerName());
        this.isHost.set(this.roomStateService.isStoredHost());

        if (!roomCodeFromRoute) {
            this.errorMessage.set('Room code is missing');
            return;
        }

        this.loadRoom(roomCodeFromRoute);

        this.lobbyRefreshSubscription = interval(3000).subscribe(() => {
            this.loadRoom(roomCodeFromRoute, false);
        });
    }

    ngOnDestroy(): void {
        this.lobbyRefreshSubscription?.unsubscribe();
    }


    loadRoom(roomCode: string, showLoading = true): void {
        if (showLoading) {
            this.loading.set(true);
        }

        this.errorMessage.set(null);

        this.roomApiService.getRoomByCode(roomCode).subscribe({
            next: (room) => {
                this.room.set(room);
                this.roomStateService.setRoom(room);
                this.loading.set(false);
            },
            error: (error: Error) => {
                this.errorMessage.set(error.message);
                this.loading.set(false);
            }
        });
    }

    copyRoomCode(): void {
        const roomCode = this.room()?.roomCode;

        if (!roomCode) {
            return;
        }

        navigator.clipboard.writeText(roomCode).then(() => {
            this.copied.set(true);

            setTimeout(() => {
                this.copied.set(false);
            }, 1500);
        });
    }

    refreshLobby(): void {
        const roomCode = this.room()?.roomCode;

        if (!roomCode) {
            return;
        }

        this.loadRoom(roomCode);
    }

    leaveLobby(): void {
        this.roomStateService.clearRoom();
        this.router.navigate(['/']);
    }

    toggleReady(): void {
        alert('Ready API will be connected in the next step.');
    }

    lockOrUnlockRoom(): void {
        alert('Lock / unlock room API will be connected in the next step.');
    }

    kickPlayer(player: Player): void {
        alert(`Kick player API will be connected later for ${player.playerName}.`);
    }

    startGame(): void {
        alert('Start game API will be connected in the next step.');
    }

}