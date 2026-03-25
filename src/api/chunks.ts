import { springApi } from "./client";
import type { ChunkResponse, MergedScanResponse } from "@/types";

export async function getChunks(floorId: string): Promise<ChunkResponse[]> {
  const { data } = await springApi.get<ChunkResponse[]>(
    `/api/v1/floors/${floorId}/scans/chunks`,
  );
  return data;
}

export async function uploadChunk(
  floorId: string,
  file: File,
): Promise<ChunkResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await springApi.post<ChunkResponse>(
    `/api/v1/floors/${floorId}/scans/chunks`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 300000,
    },
  );
  return data;
}

export async function deleteChunk(
  floorId: string,
  chunkId: string,
): Promise<void> {
  await springApi.delete(
    `/api/v1/floors/${floorId}/scans/chunks/${chunkId}`,
  );
}

export async function mergeChunks(
  floorId: string,
  chunkIds: string[],
): Promise<MergedScanResponse> {
  const { data } = await springApi.post<MergedScanResponse>(
    `/api/v1/floors/${floorId}/scans/merge`,
    { chunkIds },
  );
  return data;
}

export async function getMergeStatus(
  floorId: string,
): Promise<MergedScanResponse> {
  const { data } = await springApi.get<MergedScanResponse>(
    `/api/v1/floors/${floorId}/scans/merge/status`,
  );
  return data;
}
