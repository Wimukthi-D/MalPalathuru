import { Player } from "./player.model";

export type GameLanguage = 'SINHALA' | 'ENGLISH';

export type RoomStatus =
  | 'LOBBY'
  | 'LETTER_SELECTION'
  | 'PLAYING'
  | 'REVIEWING'
  | 'ROUND_LEADERBOARD'
  | 'FINISHED'
  | 'CLOSED';

export interface Room {
  id: number;
  roomCode: string;
  language: GameLanguage;
  maxPlayers: number;
  countLimitSeconds: number;
  privateRoom: boolean;
  locked: boolean;
  status: RoomStatus;
  players: Player[];
}