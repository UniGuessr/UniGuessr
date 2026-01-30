export interface LeaderboardEntryCreate {
  username: string;
  score: number;
  rounds: number;
  difficulty: string;
}

export interface LeaderboardEntry {
  _id: string;
  username: string;
  score: number;
  rounds: number;
  difficulty: string;
  created_at: string;
  rank?: number;
}