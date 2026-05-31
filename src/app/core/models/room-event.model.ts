import {
  LeaderboardResponse,
  ReviewStateResponse,
  RoomResponse,
  RoundResponse,
  TimerResponse
} from "./room.models";

export type RoomEventType =
  | 'PLAYER_JOINED'
  | 'PLAYER_READY_UPDATED'
  | 'PLAYER_LEFT'
  | 'PLAYER_KICKED'
  | 'ROOM_LOCKED'
  | 'ROOM_UNLOCKED'
  | 'GAME_STARTED'
  | 'LETTER_SELECTED'
  | 'ROUND_STARTED'
  | 'COUNTDOWN_STARTED'
  | 'ANSWER_SUBMITTED'
  | 'ROUND_LOCKED'
  | 'REVIEW_STARTED'
  | 'REVIEW_ITEM_CHANGED'
  | 'VOTE_UPDATED'
  | 'REVIEW_DECISION_UPDATED'
  | 'ROUND_SCORE_READY'
  | 'NEXT_ROUND_STARTED'
  | 'FINAL_LEADERBOARD_READY'
  | 'ROOM_CLOSED';

export interface RoomEventResponse {
  type?: RoomEventType;
  eventType?: RoomEventType;
  message?: string;
  affectedPlayerId?: number | null;
  room?: RoomResponse | null;
  round?: RoundResponse | null;
  timer?: TimerResponse | null;
  review?: ReviewStateResponse | null;
  reviewState?: ReviewStateResponse | null;
  leaderboard?: LeaderboardResponse | null;
  startedAt?: string | null;
  expiresAt?: string | null;
  countLimitSeconds?: number | null;
  payload?: {
    room?: RoomResponse | null;
    round?: RoundResponse | null;
    timer?: TimerResponse | null;
    review?: ReviewStateResponse | null;
    reviewState?: ReviewStateResponse | null;
    leaderboard?: LeaderboardResponse | null;
  };
}

export type RoomEvent = RoomEventResponse;
