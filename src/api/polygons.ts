import { springApi } from "./client";
import type { PolygonResponse, PolygonRequest } from "@/types";

export async function listPolygons(areaId: string): Promise<PolygonResponse[]> {
  const { data } = await springApi.get<PolygonResponse[]>(`/api/v1/areas/${areaId}/polygons`);
  return data;
}

export async function createPolygon(areaId: string, body: PolygonRequest): Promise<PolygonResponse> {
  const { data } = await springApi.post<PolygonResponse>(`/api/v1/areas/${areaId}/polygons`, body);
  return data;
}

export async function updatePolygon(polygonId: string, body: PolygonRequest): Promise<PolygonResponse> {
  const { data } = await springApi.put<PolygonResponse>(`/api/v1/polygons/${polygonId}`, body);
  return data;
}

export async function deletePolygon(polygonId: string): Promise<void> {
  await springApi.delete(`/api/v1/polygons/${polygonId}`);
}
