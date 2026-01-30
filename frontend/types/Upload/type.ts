export interface LocationUpload {
  name: string;
  latitude: number;
  longitude: number;
  difficulty: string;
  building_id?: string | null;
  floor?: number | null;
  image: File;
}