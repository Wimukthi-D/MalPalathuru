import { GameLanguage, ReviewDecision, ReviewVote } from "./models/room.models";

export interface CreateRoomRequest {
    playerName: string;
    language: GameLanguage;
    maxPlayers: number;
    countLimitSeconds: number;
    privateRoom: boolean;
}

export interface JoinRoomRequest {
    playerName: string;
    roomCode: string;
}

export interface SelectLetterRequest {
    playerId: number;
    letter: string;
}

export interface SubmitAnswersRequest {
    playerId: number;
    female: string;
    male: string;
    flower: string;
    fruit: string;
    animal: string;
    city: string;
}

export interface ReviewVoteRequest {
    playerId: number;
    answerId: number;
    vote: ReviewVote;
}

export interface ReviewDecisionRequest {
    answerId: number;
    decision: Exclude<ReviewDecision, 'PENDING'>;
}
