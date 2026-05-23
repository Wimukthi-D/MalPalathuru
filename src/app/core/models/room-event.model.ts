import { Room } from "./room.models";

export type RoomEventType =
  | 'PLAYER_JOINED'
  | 'PLAYER_READY_UPDATED'
  | 'PLAYER_KICKED'
  | 'ROOM_LOCKED'
  | 'ROOM_UNLOCKED'
  | 'GAME_STARTED'
  | 'ROOM_UPDATED';

export interface RoomEvent {
  type: RoomEventType;
  message: string;
  affectedPlayerId: number | null;
  room: Room;
}