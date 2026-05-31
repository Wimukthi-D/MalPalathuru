import { Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';

import { environment } from '../../../environments/environment';
import { RoomEvent } from '../models/room-event.model';

export type RoomSocketTopic = 'state' | 'timer' | 'review' | 'leaderboard';

@Injectable({
  providedIn: 'root'
})
export class RoomSocketService {
  private client: Client | null = null;
  private subscriptions: StompSubscription[] = [];
  private connectedRoomCode: string | null = null;

  connectToRoom(
    roomCode: string,
    onRoomEvent: (event: RoomEvent, topic: RoomSocketTopic) => void,
    onConnected?: () => void,
    onError?: (message: string) => void
  ): void {
    this.disconnect();
    this.connectedRoomCode = roomCode;

    this.client = new Client({
      brokerURL: environment.webSocketUrl,
      reconnectDelay: 5000,
      debug: () => {}
    });

    this.client.onConnect = () => {
      console.log('STOMP CONNECTED');
      onConnected?.();

      this.subscriptions = ([
        'state',
        'timer',
        'review',
        'leaderboard'
      ] as RoomSocketTopic[])
        .map((topic) => this.client?.subscribe(
          `/topic/rooms/${roomCode}/${topic}`,
          (message: IMessage) => {
            try {
              const event = JSON.parse(message.body) as RoomEvent;
              onRoomEvent(event, topic);
            } catch {
              onError?.('Received an unreadable room update.');
            }
          }
        ))
        .filter((subscription): subscription is StompSubscription => Boolean(subscription));
    };

    this.client.onStompError = (frame) => {
      const message = frame.headers['message'] ?? 'STOMP connection error';
      console.error('STOMP error:', message);
      onError?.(message);
    };

    this.client.onWebSocketError = (error) => {
      console.error('WebSocket error:', error);
      onError?.('WebSocket connection error');
    };

    this.client.activate();
  }

  disconnect(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions = [];
    this.connectedRoomCode = null;

    if (this.client?.active) {
      this.client.deactivate();
    }

    this.client = null;
  }

  isConnectedTo(roomCode: string): boolean {
    return this.connectedRoomCode === roomCode && Boolean(this.client?.connected);
  }
}
