export interface Player {
    id: number;
    playerName: string;
    host: boolean;
    ready: boolean;
    connected: boolean;
    totalScore: number;
}