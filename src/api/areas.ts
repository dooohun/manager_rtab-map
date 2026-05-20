import { springApi } from "./client";
import type { AreaResponse } from "@/types";

export async function getAreas(floorId: string): Promise<AreaResponse[]> {
  const { data } = await springApi.get<AreaResponse[]>(`/api/v1/floors/${floorId}/areas`);
  return data;
}

export async function createArea(floorId: string, label: string): Promise<AreaResponse> {
  const { data } = await springApi.post<AreaResponse>(`/api/v1/floors/${floorId}/areas`, { label });
  return data;
}
