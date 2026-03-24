import { springApi } from "./client";
import type { FloorResponse, FloorCreateRequest, FloorUpdateRequest, FloorPathResponse } from "@/types";

export async function getFloors(buildingId: string): Promise<FloorResponse[]> {
  const { data } = await springApi.get<FloorResponse[]>(`/api/v1/buildings/${buildingId}/floors`);
  return data;
}

export async function getFloor(floorId: string): Promise<FloorResponse> {
  const { data } = await springApi.get<FloorResponse>(`/api/v1/floors/${floorId}`);
  return data;
}

export async function createFloor(buildingId: string, body: FloorCreateRequest): Promise<FloorResponse> {
  const { data } = await springApi.post<FloorResponse>(`/api/v1/buildings/${buildingId}/floors`, body);
  return data;
}

export async function updateFloor(floorId: string, body: FloorUpdateRequest): Promise<FloorResponse> {
  const { data } = await springApi.put<FloorResponse>(`/api/v1/floors/${floorId}`, body);
  return data;
}

export async function deleteFloor(floorId: string): Promise<void> {
  await springApi.delete(`/api/v1/floors/${floorId}`);
}

export async function getFloorPath(floorId: string): Promise<FloorPathResponse> {
  const { data } = await springApi.get<FloorPathResponse>(`/api/v1/floors/${floorId}/path`);
  return data;
}

export function getFloorPlyUrl(floorId: string): string {
  const baseUrl = springApi.defaults.baseURL ?? "";
  return `${baseUrl}/api/v1/floors/${floorId}/pointcloud`;
}
