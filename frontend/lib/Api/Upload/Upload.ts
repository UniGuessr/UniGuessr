import {ApiHelper, API_BASE_URL} from "@/utils/ApiHelper";
import {LocationUpload} from "@/types/Upload/type";

export async function uploadLocation(data: LocationUpload): Promise<{ id: string; image_url: string; message: string }> {
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

  const response = await ApiHelper.post(`${API_BASE_URL}`,`/api/locations/upload`,formData);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to upload location");
  }

  return response.json();
}