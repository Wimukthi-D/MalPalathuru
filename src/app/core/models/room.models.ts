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

export type RoundStatus =
  | 'LETTER_SELECTION'
  | 'PLAYING'
  | 'LOCKED'
  | 'REVIEWING'
  | 'ROUND_LEADERBOARD'
  | 'COMPLETED'
  | 'FINISHED';

export type AnswerFieldKey = 'female' | 'male' | 'flower' | 'fruit' | 'animal' | 'city';
export type ReviewVote = 'ACCEPT' | 'REJECT';
export type ReviewDecision = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface VoteResponse {
  playerId: number;
  playerName?: string;
  vote: ReviewVote;
}

export interface AnswerResponse {
  id?: number;
  answerId?: number;
  roundId?: number;
  playerId?: number;
  playerName?: string;
  category?: AnswerFieldKey | Uppercase<AnswerFieldKey> | string;
  field?: AnswerFieldKey | Uppercase<AnswerFieldKey> | string;
  value?: string;
  answer?: string;
  female?: string;
  male?: string;
  flower?: string;
  fruit?: string;
  animal?: string;
  city?: string;
  decision?: ReviewDecision | string;
  accepted?: boolean;
  rejected?: boolean;
  score?: number;
  votes?: VoteResponse[];
}

export interface RoundResponse {
  id: number;
  roundNumber?: number;
  number?: number;
  status?: RoundStatus | string;
  selectedLetter?: string | null;
  letter?: string | null;
  suggesterPlayerId?: number | null;
  suggestedByPlayerId?: number | null;
  currentSuggesterPlayerId?: number | null;
  suggester?: Player | null;
  usedLetters?: string[];
  startedAt?: string | null;
  expiresAt?: string | null;
  countLimitSeconds?: number | null;
  locked?: boolean;
  answers?: AnswerResponse[];
  answerSheets?: AnswerResponse[];
  submittedAnswers?: AnswerResponse[];
}

export interface TimerResponse {
  roundId?: number;
  startedAt?: string | null;
  expiresAt?: string | null;
  countLimitSeconds?: number | null;
  remainingSeconds?: number | null;
}

export interface ReviewItemResponse extends AnswerResponse {
  index?: number;
  totalItems?: number;
}

export interface ReviewStateResponse {
  roundId?: number;
  status?: string;
  currentIndex?: number;
  totalItems?: number;
  currentAnswerId?: number;
  currentAnswer?: ReviewItemResponse | null;
  currentItem?: ReviewItemResponse | null;
  items?: ReviewItemResponse[];
  answers?: ReviewItemResponse[];
}

export interface LeaderboardEntryResponse {
  playerId?: number;
  playerName?: string;
  rank?: number;
  roundScore?: number;
  score?: number;
  totalScore?: number;
}

export interface LeaderboardResponse {
  roomCode?: string;
  roundId?: number;
  final?: boolean;
  entries?: LeaderboardEntryResponse[];
  rankings?: LeaderboardEntryResponse[];
  players?: LeaderboardEntryResponse[];
}

export interface RoomResponse {
  id: number;
  roomCode: string;
  language: GameLanguage;
  maxPlayers: number;
  countLimitSeconds: number;
  privateRoom: boolean;
  locked: boolean;
  status: RoomStatus;
  players: Player[];
  currentRound?: RoundResponse | null;
  round?: RoundResponse | null;
  rounds?: RoundResponse[];
  usedLetters?: string[];
  selectedLetter?: string | null;
  currentSuggesterPlayerId?: number | null;
  reviewState?: ReviewStateResponse | null;
  leaderboard?: LeaderboardResponse | null;
}

export type Room = RoomResponse;
