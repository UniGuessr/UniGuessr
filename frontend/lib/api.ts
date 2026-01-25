const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SessionCreate {
  rounds: number;
  difficulty: "easy" | "normal" | "hard";
}

export interface Session {
  _id: string;
  rounds: number;
  difficulty: string;
  location_ids: string[];
  current_round: number;
  guesses: Guess[];
  total_score: number;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export interface Guess {
  location_id: string;
  guessed_latitude: number;
  guessed_longitude: number;
  actual_latitude: number;
  actual_longitude: number;
  distance_meters: number;
  points: number;
  guessed_floor?: number | null;
  actual_floor?: number | null;
  floor_bonus: number;
  timestamp: string;
}

export interface CurrentLocation {
  location_id: string;
  image_url: string;
  name: string;
  building_id?: string | null;
  round: number;
  total_rounds: number;
}

export interface GuessResult {
  distance_meters: number;
  points: number;
  floor_bonus: number;
  guessed_floor?: number | null;
  actual_floor?: number | null;
  actual_location: {
    latitude: number;
    longitude: number;
    name: string;
    building_id?: string | null;
    floor?: number | null;
  };
  guessed_location: {
    latitude: number;
    longitude: number;
  };
  round_complete: boolean;
  game_complete: boolean;
  current_round: number;
  total_score: number;
}

export async function createSession(data: SessionCreate): Promise<Session> {
  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create session");
  }

  return response.json();
}

export async function getSession(sessionId: string): Promise<Session> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get session");
  }

  return response.json();
}

export async function getCurrentLocation(sessionId: string): Promise<CurrentLocation> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/current-location`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get current location");
  }

  return response.json();
}

export async function submitGuess(
  sessionId: string,
  latitude: number,
  longitude: number,
  floor?: number | null
): Promise<GuessResult> {
  const body: { latitude: number; longitude: number; floor?: number | null } = {
    latitude,
    longitude,
  };
  
  if (floor !== undefined && floor !== null) {
    body.floor = floor;
  }

  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/guess`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to submit guess");
  }

  return response.json();
}

export async function getLocationsCount(): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/api/locations/count`);

  if (!response.ok) {
    return 0;
  }

  const data = await response.json();
  return data.count;
}

// Leaderboard types and functions
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

export async function saveScoreToLeaderboard(
  data: LeaderboardEntryCreate
): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/leaderboard`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

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

  const response = await fetch(
    `${API_BASE_URL}/api/leaderboard/user/${encodeURIComponent(username)}/rank?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get user rank");
  }

  return response.json();
}

// Location upload
export interface LocationUpload {
  name: string;
  latitude: number;
  longitude: number;
  difficulty: string;
  building_id?: string | null;
  floor?: number | null;
  image: File;
}

export async function uploadLocation(
  data: LocationUpload
): Promise<{ id: string; image_url: string; message: string }> {
  const formData = new FormData();
  formData.append("name", data.name);
  formData.append("latitude", data.latitude.toString());
  formData.append("longitude", data.longitude.toString());
  formData.append("difficulty", data.difficulty);
  
  if (data.building_id) {
    formData.append("building_id", data.building_id);
  }
  
  if (data.floor !== undefined && data.floor !== null) {
    formData.append("floor", data.floor.toString());
  }
  
  formData.append("image", data.image);

  const response = await fetch(`${API_BASE_URL}/api/locations`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to upload location");
  }

  return response.json();
}
