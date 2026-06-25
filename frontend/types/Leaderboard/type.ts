export interface LeaderboardEntryCreate {
  username: string;
  score: number;
  rounds: number;
  difficulty: string;
  university?: string | null;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  score: number;
  rounds: number;
  difficulty: string;
  university?: string | null;
  created_at: string;
  rank?: number;
}