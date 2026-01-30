import {ApiHelper} from "@/utils/ApiHelper";


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


