import { Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';

import { environment } from '../../../environments/environment';
import { RoomEvent } from '../models/room-event.model';

@Injectable({
  providedIn: 'root'
})
export class RoomSocketService {
  private client: Client | null = null;
  private subscription: StompSubscription | null = null;

  connectToRoom(
    roomCode: string,
    onRoomEvent: (event: RoomEvent) => void
  ): void {
    this.disconnect();

    this.client = new Client({
      brokerURL: environment.webSocketUrl,
      reconnectDelay: 5000,
      debug: () => {}
    });

    this.client.onConnect = () => {
      this.subscription = this.client?.subscribe(
        `/topic/rooms/${roomCode}/state`,
        (message: IMessage) => {
          const event = JSON.parse(message.body) as RoomEvent;
          console.log(event);

          onRoomEvent(event);
        }
      ) ?? null;
    };

    this.client.onStompError = (frame) => {
      console.error('STOMP error:', frame.headers['message']);
    };

    this.client.onWebSocketError = (error) => {
      console.error('WebSocket error:', error);
    };

    this.client.activate();
  }

  disconnect(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;

    if (this.client?.active) {
      this.client.deactivate();
    }

    this.client = null;
  }
}
