import { Component, computed, inject, OnDestroy, OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { RoomApiService } from "../../core/services/room-api.service";
import { RoomStateService } from "../../core/services/room-state.service";
import { Room } from "../../core/models/room.models";
import { Player } from "../../core/models/player.model";
import { RoomSocketService } from "../../core/services/room-socket.service";
import { RoomEvent } from "../../core/models/room-event.model";


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
  private readonly roomSocketService = inject(RoomSocketService);
  private readonly roomStateService = inject(RoomStateService);

  room = signal<Room | null>(null);
  currentPlayerId = signal<number | null>(null);
  currentPlayerName = signal<string | null>(null);
  isHost = signal(false);

  loading = signal(false);
  actionLoading = signal(false);
  errorMessage = signal<string | null>(null);
  copied = signal(false);

  playerCount = computed(() => this.room()?.players.length ?? 0);
  isLobbyStatus = computed(() => this.room()?.status === 'LOBBY');

  currentPlayer = computed(() => {
    const room = this.room();
    const playerId = this.currentPlayerId();

    if (!room || !playerId) {
      return null;
    }

    return room.players.find((player) => player.id === playerId) ?? null;
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
    this.connectRoomSocket(roomCodeFromRoute);
  }

  ngOnDestroy(): void {
    this.roomSocketService.disconnect();
  }

  loadRoom(roomCode: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.roomApiService.getRoomByCode(roomCode).subscribe({
      next: (room) => {
        this.updateRoomState(room);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  connectRoomSocket(roomCode: string): void {
    this.roomSocketService.connectToRoom(roomCode, (event) => {
      this.handleRoomEvent(event);
    });
  }

  handleRoomEvent(event: RoomEvent): void {
    if (event.type === 'ROOM_CLOSED') {
      this.handleRoomClosed();
      return;
    }

    if (event.type === 'PLAYER_KICKED') {
      this.handleKickEvent(event);
      return;
    }

    this.updateRoomState(event.room);

    if (event.type === 'GAME_STARTED') {
      alert('Game started. Letter selection page will be connected next.');
    }
  }

  handleKickEvent(event: RoomEvent): void {
    const currentPlayerId = this.currentPlayerId();

    if (event.affectedPlayerId === currentPlayerId) {
      this.roomSocketService.disconnect();
      this.roomStateService.clearRoom();
      this.roomStateService.setNotice('You were removed from the room by the host.');
      this.router.navigate(['/']);
      return;
    }

    this.updateRoomState(event.room);
  }

  handleRoomClosed(): void {
    this.roomSocketService.disconnect();
    this.roomStateService.clearRoom();
    this.roomStateService.setNotice('The host left. The room has been closed.');
    this.router.navigate(['/']);
  }

  updateRoomState(room: Room): void {
    this.room.set(room);
    this.roomStateService.setRoom(room);

    const currentPlayerId = this.currentPlayerId();
    const currentPlayer = room.players.find((player) => player.id === currentPlayerId);

    if (currentPlayer) {
      this.currentPlayerName.set(currentPlayer.playerName);
      this.isHost.set(currentPlayer.host);
      this.roomStateService.setCurrentPlayer(currentPlayer);
    }
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
    const room = this.room();
    const player = this.currentPlayer();

    if (!room || !player) {
      this.roomSocketService.disconnect();
      this.roomStateService.clearRoom();
      this.router.navigate(['/']);
      return;
    }

    if (player.host && !confirm('Leaving as host will close the room for everyone. Continue?')) {
      return;
    }

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    this.roomApiService
      .leavePlayer(room.roomCode, player.id)
      .subscribe({
        next: (updatedRoom) => {
          this.actionLoading.set(false);

          if (!updatedRoom || player.host) {
            this.roomSocketService.disconnect();
            this.roomStateService.clearRoom();
            this.roomStateService.setNotice('The host left. The room has been closed.');
            this.router.navigate(['/']);
            return;
          }

          this.roomSocketService.disconnect();
          this.roomStateService.clearRoom();
          this.router.navigate(['/']);
        },
        error: (error: Error) => {
          this.errorMessage.set(error.message);
          this.actionLoading.set(false);
        }
      });
  }

  lockOrUnlockRoom(): void {
    const room = this.room();
    const hostPlayer = this.currentPlayer();

    if (!room || !hostPlayer?.host || !this.isLobbyStatus()) {
      return;
    }

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    const request$ = room.locked
      ? this.roomApiService.unlockRoom(room.roomCode, hostPlayer.id)
      : this.roomApiService.lockRoom(room.roomCode, hostPlayer.id);

    request$.subscribe({
      next: (updatedRoom) => {
        this.updateRoomState(updatedRoom);
        this.actionLoading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.actionLoading.set(false);
      }
    });
  }

  kickPlayer(player: Player): void {
    const room = this.room();
    const hostPlayer = this.currentPlayer();

    if (!room || !hostPlayer?.host || !this.isLobbyStatus()) {
      return;
    }

    if (!confirm(`Remove ${player.playerName} from this room?`)) {
      return;
    }

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    this.roomApiService
      .kickPlayer(room.roomCode, player.id, hostPlayer.id)
      .subscribe({
        next: (updatedRoom) => {
          this.updateRoomState(updatedRoom);
          this.actionLoading.set(false);
        },
        error: (error: Error) => {
          this.errorMessage.set(error.message);
          this.actionLoading.set(false);
        }
      });
  }

  startGame(): void {
    const room = this.room();
    const hostPlayer = this.currentPlayer();

    if (!room || !hostPlayer?.host || !this.isLobbyStatus()) {
      return;
    }

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    this.roomApiService.startGame(room.roomCode, hostPlayer.id).subscribe({
      next: (updatedRoom) => {
        this.updateRoomState(updatedRoom);
        this.actionLoading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.actionLoading.set(false);
      }
    });
  }
}
