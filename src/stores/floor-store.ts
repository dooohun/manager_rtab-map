import { create } from "zustand";
import type {
  FloorResponse,
  FloorCreateRequest,
  FloorUpdateRequest,
} from "@/types";
import * as api from "@/api";
import { toast } from "sonner";
import { useBuildingStore } from "./building-store";

interface FloorStore {
  floors: FloorResponse[];
  isLoading: boolean;

  fetchFloors: (buildingId: string) => Promise<void>;
  createFloor: (buildingId: string, data: FloorCreateRequest) => Promise<FloorResponse>;
  updateFloor: (floorId: string, data: FloorUpdateRequest, buildingId: string) => Promise<void>;
  deleteFloor: (floorId: string, buildingId: string) => Promise<void>;
}

export const useFloorStore = create<FloorStore>((set, get) => ({
  floors: [],
  isLoading: false,

  fetchFloors: async (buildingId) => {
    set({ isLoading: true });
    try {
      const floors = await api.getFloors(buildingId);
      set({ floors });
    } finally {
      set({ isLoading: false });
    }
  },

  createFloor: async (buildingId, data) => {
    const floor = await api.createFloor(buildingId, data);
    toast.success("층이 생성되었습니다.");
    await Promise.all([
      get().fetchFloors(buildingId),
      useBuildingStore.getState().fetchBuildingDetail(buildingId),
    ]);
    return floor;
  },

  updateFloor: async (floorId, data, buildingId) => {
    await api.updateFloor(floorId, data);
    toast.success("층 정보가 수정되었습니다.");
    await Promise.all([
      get().fetchFloors(buildingId),
      useBuildingStore.getState().fetchBuildingDetail(buildingId),
    ]);
  },

  deleteFloor: async (floorId, buildingId) => {
    await api.deleteFloor(floorId);
    toast.success("층이 삭제되었습니다.");
    await Promise.all([
      get().fetchFloors(buildingId),
      useBuildingStore.getState().fetchBuildingDetail(buildingId),
    ]);
  },
}));
