import { API_BASE_URL } from "@/utils/ApiHelper";

export interface University {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export async function getUniversities(): Promise<University[]> {
  const response = await fetch(`${API_BASE_URL}/api/universities`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to fetch universities");
  }

  return response.json();
}
