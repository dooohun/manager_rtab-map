import { springApi } from "./client";
import type { PoiResponse, PoiCreateRequest, PoiRegisterRequest } from "@/types";

/**
 * POI 목록 조회
 */
export async function getPois(buildingId: string): Promise<PoiResponse[]> {
  const response = await springApi.get<PoiResponse[]>(`/api/v1/buildings/${buildingId}/pois`);
  return response.data;
}

/**
 * POI 검색
 */
export async function searchPois(buildingId: string, query?: string): Promise<PoiResponse[]> {
  const response = await springApi.get<PoiResponse[]>(
    `/api/v1/buildings/${buildingId}/pois/search`,
    {
      params: { query },
    }
  );
  return response.data;
}

/**
 * POI 생성
 */
export async function createPoi(
  buildingId: string,
  data: PoiCreateRequest
): Promise<PoiResponse> {
  const response = await springApi.post<PoiResponse>(
    `/api/v1/buildings/${buildingId}/pois`,
    data
  );
  return response.data;
}

/**
 * 노드에 POI 등록
 */
export async function registerPoiToNode(
  nodeId: string,
  data: PoiRegisterRequest
): Promise<PoiResponse> {
  const response = await springApi.put<PoiResponse>(`/api/v1/nodes/${nodeId}/poi`, data);
  return response.data;
}

/**
 * POI 삭제 (노드에서 POI 정보 제거)
 */
export async function deletePoi(nodeId: string): Promise<void> {
  await springApi.delete(`/api/v1/nodes/${nodeId}/poi`);
}
