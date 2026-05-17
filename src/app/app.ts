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

type LandingMode = 'join' | 'create' | null;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatSlideToggleModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private router = inject(Router);

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

  joinGame(): void {
    if (!this.playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!this.roomCode.trim()) {
      alert('Please enter room code');
      return;
    }

    const code = this.roomCode.trim().toUpperCase();

    this.router.navigate(['/room', code, 'lobby'], {
      queryParams: {
        playerName: this.playerName.trim()
      }
    });
  }

  createGame(): void {
    if (!this.createForm.playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    const generatedRoomCode = this.generateRoomCode();

    this.router.navigate(['/room', generatedRoomCode, 'lobby'], {
      queryParams: {
        host: true,
        playerName: this.createForm.playerName.trim(),
        maxPlayers: this.createForm.maxPlayers,
        countLimitSeconds: this.createForm.countLimitSeconds,
        language: this.createForm.language,
        privateRoom: this.createForm.privateRoom
      }
    });
  }

  toggleRoomPrivacy(): void {
  this.createForm.privateRoom = !this.createForm.privateRoom;
}

  private generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}