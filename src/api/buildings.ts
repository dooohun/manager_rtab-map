import { springApi } from "./client";
import type {
  BuildingResponse,
  BuildingDetailResponse,
  BuildingCreateRequest,
  BuildingUpdateRequest,
  BuildingStatus,
} from "@/types";

export async function getBuildings(status?: BuildingStatus): Promise<BuildingResponse[]> {
  const params = status ? { status } : {};
  const { data } = await springApi.get<BuildingResponse[]>("/api/v1/buildings", { params });
  return data;
}

export async function getBuildingDetail(id: string): Promise<BuildingDetailResponse> {
  const { data } = await springApi.get<BuildingDetailResponse>(`/api/v1/buildings/${id}`);
  return data;
}

export async function createBuilding(body: BuildingCreateRequest): Promise<BuildingResponse> {
  const { data } = await springApi.post<BuildingResponse>("/api/v1/buildings", body);
  return data;
}

export async function updateBuilding(id: string, body: BuildingUpdateRequest): Promise<BuildingResponse> {
  const { data } = await springApi.put<BuildingResponse>(`/api/v1/buildings/${id}`, body);
  return data;
}

export async function deleteBuilding(id: string): Promise<void> {
  await springApi.delete(`/api/v1/buildings/${id}`);
}

export async function deleteMultipleBuildings(ids: string[]): Promise<void> {
  await springApi.delete("/api/v1/buildings/batch", { data: ids });
}

export async function updateBuildingStatus(id: string, status: BuildingStatus): Promise<BuildingResponse> {
  const { data } = await springApi.patch<BuildingResponse>(`/api/v1/buildings/${id}/status`, { status });
  return data;
}

