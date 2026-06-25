import { LeaderboardEntry, LeaderboardEntryCreate } from "@/types/Leaderboard/type";
import { API_BASE_URL, ApiHelper } from "@/utils/ApiHelper";


export async function saveScoreToLeaderboard(data: LeaderboardEntryCreate): Promise<{ id: string; message: string }> {

  const response = await ApiHelper.post(`${API_BASE_URL}`,`/api/leaderboard`, data);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to save score to leaderboard");
  }

  return response.json();
}

export async function getLeaderboard(
  limit: number = 100,
  rounds?: number,
  difficulty?: string
): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  if (rounds) params.append("rounds", rounds.toString());
  if (difficulty) params.append("difficulty", difficulty);

  const response = await fetch(`${API_BASE_URL}/api/leaderboard?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch leaderboard");
  }

  return response.json();
}

export async function getUserRank(
  username: string,
  rounds?: number,
  difficulty?: string
): Promise<{ username: string; rank: number; total_entries: number }> {
  const params = new URLSearchParams();
  if (rounds) params.append("rounds", rounds.toString());
  if (difficulty) params.append("difficulty", difficulty);

  const response = await ApiHelper.get(`${API_BASE_URL}/api/leaderboard/user/${encodeURIComponent(username)}/rank?${params.toString()}`, "");

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get user rank");
  }

  return response.json();
}