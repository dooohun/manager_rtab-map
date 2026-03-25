import { create } from "zustand";
import type { ChunkResponse, MergedScanResponse } from "@/types";
import * as api from "@/api";
import { toast } from "sonner";

interface ChunkStore {
  chunks: ChunkResponse[];
  isLoading: boolean;
  isUploading: boolean;
  isMerging: boolean;
  mergeStatuses: Record<string, MergedScanResponse>;

  fetchChunks: (floorId: string) => Promise<void>;
  uploadChunk: (floorId: string, file: File) => Promise<void>;
  deleteChunk: (floorId: string, chunkId: string) => Promise<void>;
  mergeChunks: (floorId: string, chunkIds: string[]) => Promise<void>;
  fetchMergeStatus: (floorId: string) => Promise<void>;
  fetchAllMergeStatuses: (floorIds: string[]) => Promise<void>;
  resetSheet: () => void;
  reset: () => void;
}

export const useChunkStore = create<ChunkStore>((set, get) => ({
  chunks: [],
  isLoading: false,
  isUploading: false,
  isMerging: false,
  mergeStatuses: {},

  fetchChunks: async (floorId) => {
    set({ isLoading: true });
    try {
      const chunks = await api.getChunks(floorId);
      set({ chunks });
    } finally {
      set({ isLoading: false });
    }
  },

  uploadChunk: async (floorId, file) => {
    set({ isUploading: true });
    try {
      await api.uploadChunk(floorId, file);
      toast.success("청크가 업로드되었습니다.");
      await get().fetchChunks(floorId);
    } finally {
      set({ isUploading: false });
    }
  },

  deleteChunk: async (floorId, chunkId) => {
    await api.deleteChunk(floorId, chunkId);
    toast.success("청크가 삭제되었습니다.");
    await get().fetchChunks(floorId);
  },

  mergeChunks: async (floorId, chunkIds) => {
    set({ isMerging: true });
    try {
      const result = await api.mergeChunks(floorId, chunkIds);
      set((state) => ({
        mergeStatuses: { ...state.mergeStatuses, [floorId]: result },
      }));
      toast.success(
        result.status === "MERGED"
          ? "병합이 완료되었습니다."
          : "병합이 시작되었습니다.",
      );
    } finally {
      set({ isMerging: false });
    }
  },

  fetchMergeStatus: async (floorId) => {
    try {
      const status = await api.getMergeStatus(floorId);
      set((state) => ({
        mergeStatuses: { ...state.mergeStatuses, [floorId]: status },
      }));
    } catch {
      // 병합 이력 없음 (404) — 무시
    }
  },

  fetchAllMergeStatuses: async (floorIds) => {
    const results = await Promise.allSettled(
      floorIds.map((id) => api.getMergeStatus(id)),
    );
    const statuses: Record<string, MergedScanResponse> = {};
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        statuses[floorIds[index]] = result.value;
      }
    });
    set((state) => ({
      mergeStatuses: { ...state.mergeStatuses, ...statuses },
    }));
  },

  resetSheet: () =>
    set({
      chunks: [],
      isLoading: false,
      isUploading: false,
      isMerging: false,
    }),

  reset: () =>
    set({
      chunks: [],
      isLoading: false,
      isUploading: false,
      isMerging: false,
      mergeStatuses: {},
    }),
}));
