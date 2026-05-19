import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RoomApiService } from "./core/services/room-api.service";
import { RoomStateService } from "./core/services/room-state.service";
import { CreateRoomRequest, JoinRoomRequest } from './core/room-request.model';
import { Room } from './core/room.models';

type LandingMode = 'join' | 'create' | null;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatSlideToggleModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})


export class App {
  private router = inject(Router);

  private readonly roomApiService = inject(RoomApiService);
  private readonly roomStateService = inject(RoomStateService);


  loading = signal(false);
  errorMessage = signal<string | null>(null);

  JoinErrors = {
    name : signal(false),
    code : signal(false)
  }

  CreateErrors = {
    name : signal(false)
  }

  currentUrl = signal('/');
  mode = signal<LandingMode>(null);

  roomCode = '';
  playerName = '';

  createForm = {
    playerName: '',
    maxPlayers: 5,
    countLimitSeconds: 50,
    language: 'si',
    privateRoom: false
  };

  isLandingPage = computed(() => this.currentUrl() === '/');

  constructor() {
    this.currentUrl.set(this.router.url || '/');

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.currentUrl.set(event.urlAfterRedirects);
      });
  }

  showJoinGame(): void {
    this.mode.set('join');
  }

  showCreateGame(): void {
    this.mode.set('create');
  }

  goBack(): void {
    this.mode.set(null);
    this.roomCode = '';
    this.playerName = '';
  }

  private findLatestJoinedPlayer(room: Room, playerName: string) {
    return [...room.players]
      .reverse()
      .find((player) => player.playerName === playerName);
  }

  joinGame(): void {

    const playerName = this.playerName.trim();
    const roomCode = this.roomCode.trim().toUpperCase();

    if (!playerName) {
      this.JoinErrors.name.set(true)
      this.errorMessage.set('Please enter your name');
      return;
    }

    if (!roomCode) {
      this.JoinErrors.code.set(true)
      this.errorMessage.set('Please enter room code');
      return;
    }

    const request: JoinRoomRequest = {
      playerName,
      roomCode
    };

    this.loading.set(true);
    this.errorMessage.set(null);

    this.roomApiService.joinRoom(request).subscribe({
      next: (room) => {
        console.log(room);
        const currentPlayer = this.findLatestJoinedPlayer(room, playerName);

        this.roomStateService.setRoom(room);

        if (currentPlayer) {
          this.roomStateService.setCurrentPlayer(currentPlayer);
        }

        this.loading.set(false)
        this.router.navigate(['/room', room.roomCode, 'lobby'])
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.errorMessage.set(error.message);
      }
    });


  }



  createGame(): void {
    const playerName = this.createForm.playerName.trim();

    if (!playerName) {
      this.errorMessage.set('Please enter your name')
      return;
    }

    const request: CreateRoomRequest = {
      playerName,
      language: this.createForm.language === 'si' ? 'SINHALA' : 'ENGLISH',
      maxPlayers: this.createForm.maxPlayers,
      countLimitSeconds: this.createForm.countLimitSeconds,
      privateRoom: this.createForm.privateRoom
    };

    this.loading.set(true);
    this.errorMessage.set(null);

    this.roomApiService.createRoom(request).subscribe({

      next: (room) => {
        const hostPlayer = room.players.find((player) => player.host);
        this.roomStateService.setRoom(room);

        if (hostPlayer) {
          this.roomStateService.setCurrentPlayer(hostPlayer);
        }
        this.loading.set(false);

        this.router.navigate(['/room', room.roomCode, 'lobby']);
      },

      error: (error: Error) => {
        this.loading.set(false);
        this.errorMessage.set(error.message);
      }
    })
  }

  toggleRoomPrivacy(): void {
    this.createForm.privateRoom = !this.createForm.privateRoom;
  }

  // private generateRoomCode(): string {
  //   return Math.random().toString(36).substring(2, 8).toUpperCase();
  // }
}