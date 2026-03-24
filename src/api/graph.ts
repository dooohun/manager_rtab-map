import { springApi } from "./client";
import type {
  FloorGraphResponse,
  PathNodeResponse,
  PathEdgeResponse,
  NodeCreateRequest,
  NodeUpdateRequest,
  EdgeCreateRequest,
} from "@/types";

export async function getFloorGraph(floorId: string): Promise<FloorGraphResponse> {
  const { data } = await springApi.get<FloorGraphResponse>(`/api/v1/floors/${floorId}/graph`);
  return data;
}

export async function createNode(floorId: string, request: NodeCreateRequest): Promise<PathNodeResponse> {
  const { data } = await springApi.post<PathNodeResponse>(`/api/v1/floors/${floorId}/nodes`, request);
  return data;
}

export async function updateNode(nodeId: string, request: NodeUpdateRequest): Promise<PathNodeResponse> {
  const { data } = await springApi.put<PathNodeResponse>(`/api/v1/nodes/${nodeId}`, request);
  return data;
}

export async function deleteNode(nodeId: string): Promise<void> {
  await springApi.delete(`/api/v1/nodes/${nodeId}`);
}

export async function createEdge(floorId: string, request: EdgeCreateRequest): Promise<PathEdgeResponse> {
  const { data } = await springApi.post<PathEdgeResponse>(`/api/v1/floors/${floorId}/edges`, request);
  return data;
}

export async function deleteEdge(edgeId: string): Promise<void> {
  await springApi.delete(`/api/v1/edges/${edgeId}`);
}

export async function clearFloorGraph(floorId: string): Promise<void> {
  await springApi.delete(`/api/v1/floors/${floorId}/graph`);
}
