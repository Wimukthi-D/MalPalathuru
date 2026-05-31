export interface Player {
    id: number;
    playerName: string;
    host: boolean;
    connected: boolean;
    ready?: boolean;
    roundScore?: number;
    totalScore: number;
}
