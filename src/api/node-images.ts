import { springApi } from "./client";
import type { NodeImageResponse } from "@/types";

export async function fetchNearbyImages(
  buildingId: string,
  x: number,
  y: number,
  z: number,
): Promise<NodeImageResponse[]> {
  const { data } = await springApi.post<NodeImageResponse[]>(
    `/api/v1/buildings/${buildingId}/node-images`,
    { x, y, z },
  );
  return data;
}
