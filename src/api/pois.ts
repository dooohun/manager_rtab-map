import { springApi } from "./client";
import type {
  PoiResponse,
  PoiCreateRequest,
  PoiUpdateRequest,
  PoiAttachRequest,
} from "@/types";

export async function getPois(buildingId: string): Promise<PoiResponse[]> {
  const { data } = await springApi.get<PoiResponse[]>(`/api/v1/buildings/${buildingId}/pois`);
  return data;
}

export async function searchPois(buildingId: string, query?: string): Promise<PoiResponse[]> {
  const { data } = await springApi.get<PoiResponse[]>(
    `/api/v1/buildings/${buildingId}/pois/search`,
    { params: { query } },
  );
  return data;
}

export async function createPoi(buildingId: string, body: PoiCreateRequest): Promise<PoiResponse> {
  const { data } = await springApi.post<PoiResponse>(`/api/v1/buildings/${buildingId}/pois`, body);
  return data;
}

export async function updatePoi(poiId: string, body: PoiUpdateRequest): Promise<PoiResponse> {
  const { data } = await springApi.put<PoiResponse>(`/api/v1/pois/${poiId}`, body);
  return data;
}

export async function attachPoiToNode(poiId: string, body: PoiAttachRequest): Promise<PoiResponse> {
  const { data } = await springApi.put<PoiResponse>(`/api/v1/pois/${poiId}/route-node`, body);
  return data;
}

export async function deletePoi(poiId: string): Promise<void> {
  await springApi.delete(`/api/v1/pois/${poiId}`);
}
