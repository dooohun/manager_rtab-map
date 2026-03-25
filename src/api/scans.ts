import { springApi } from "./client";

export interface ScanSessionResponse {
  id: string;
  buildingId: string;
  fileName: string;
  fileSize: number;
  status: string;
  plyFileId: string | null;
}

export async function getScanSessions(buildingId: string): Promise<ScanSessionResponse[]> {
  const { data } = await springApi.get<ScanSessionResponse[]>(
    `/api/v1/buildings/${buildingId}/scans`,
  );
  return data;
}
