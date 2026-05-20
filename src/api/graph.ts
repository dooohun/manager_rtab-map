import { springApi } from "./client";
import type {
  FloorGraphResponse,
  PathNodeResponse,
  PathEdgeResponse,
  NodeCreateRequest,
  NodeUpdateRequest,
  EdgeCreateRequest,
  EdgeUpdateRequest,
} from "@/types";

export async function getFloorGraph(floorId: string, areaId?: string): Promise<FloorGraphResponse> {
  const params = areaId ? { areaId } : undefined;
  const { data } = await springApi.get<FloorGraphResponse>(`/api/v1/floors/${floorId}/graph`, { params });
  return data;
}

export async function createNode(areaId: string, request: NodeCreateRequest): Promise<PathNodeResponse> {
  const { data } = await springApi.post<PathNodeResponse>(`/api/v1/areas/${areaId}/nodes`, request);
  return data;
}

export async function updateNode(nodeId: string, request: NodeUpdateRequest): Promise<PathNodeResponse> {
  const { data } = await springApi.put<PathNodeResponse>(`/api/v1/nodes/${nodeId}`, request);
  return data;
}

export async function deleteNode(nodeId: string): Promise<void> {
  await springApi.delete(`/api/v1/nodes/${nodeId}`);
}

export async function createEdge(areaId: string, request: EdgeCreateRequest): Promise<PathEdgeResponse> {
  const { data } = await springApi.post<PathEdgeResponse>(`/api/v1/areas/${areaId}/edges`, request);
  return data;
}

export async function updateEdge(edgeId: string, request: EdgeUpdateRequest): Promise<PathEdgeResponse> {
  const { data } = await springApi.put<PathEdgeResponse>(`/api/v1/edges/${edgeId}`, request);
  return data;
}

export async function deleteEdge(edgeId: string): Promise<void> {
  await springApi.delete(`/api/v1/edges/${edgeId}`);
}

export async function clearManualGraph(areaId: string): Promise<void> {
  await springApi.delete(`/api/v1/areas/${areaId}/graph/manual`);
}
