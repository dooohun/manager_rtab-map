import { create } from "zustand";
import { toast } from "sonner";
import * as api from "@/api";
import type { PoiResponse, PoiCreateRequest, PoiRegisterRequest, Point3D } from "@/types";

interface PoiStore {
  pois: PoiResponse[];
  isLoading: boolean;
  error: string | null;
  buildingId: string | null;
  selectedPoiId: string | null;
  isPlacementMode: boolean;
  pendingPosition: Point3D | null;

  // Actions
  setBuildingId: (buildingId: string) => void;
  fetchPois: (buildingId: string) => Promise<void>;
  searchPois: (buildingId: string, query?: string) => Promise<void>;
  createPoi: (buildingId: string, data: PoiCreateRequest) => Promise<PoiResponse>;
  registerPoiToNode: (nodeId: string, data: PoiRegisterRequest) => Promise<PoiResponse>;
  deletePoi: (nodeId: string) => Promise<void>;
  selectPoi: (poiId: string | null) => void;
  setPlacementMode: (active: boolean) => void;
  setPendingPosition: (position: Point3D | null) => void;
  cancelPlacement: () => void;
  reset: () => void;
}

const initialState = {
  pois: [] as PoiResponse[],
  isLoading: false,
  error: null as string | null,
  buildingId: null as string | null,
  selectedPoiId: null as string | null,
  isPlacementMode: false,
  pendingPosition: null as Point3D | null,
};

export const usePoiStore = create<PoiStore>((set, get) => ({
  ...initialState,

  setBuildingId: (buildingId: string) => set({ buildingId }),

  fetchPois: async (buildingId: string) => {
    set({ isLoading: true, error: null, buildingId });
    try {
      const pois = await api.getPois(buildingId);
      set({ pois, isLoading: false });
    } catch (error) {
      set({ error: "POI 목록을 불러오는데 실패했습니다.", isLoading: false });
      throw error;
    }
  },

  searchPois: async (buildingId: string, query?: string) => {
    set({ isLoading: true, error: null });
    try {
      const pois = await api.searchPois(buildingId, query);
      set({ pois, isLoading: false });
    } catch (error) {
      set({ error: "POI 검색에 실패했습니다.", isLoading: false });
      throw error;
    }
  },

  createPoi: async (buildingId: string, data: PoiCreateRequest) => {
    const newPoi = await api.createPoi(buildingId, data);
    set({ pois: [...get().pois, newPoi] });
    toast.success("POI가 생성되었습니다.");
    return newPoi;
  },

  registerPoiToNode: async (nodeId: string, data: PoiRegisterRequest) => {
    const poi = await api.registerPoiToNode(nodeId, data);
    const existing = get().pois.find((p) => p.nodeId === nodeId);
    if (existing) {
      set({ pois: get().pois.map((p) => (p.nodeId === nodeId ? poi : p)) });
      toast.success("POI가 수정되었습니다.");
    } else {
      set({ pois: [...get().pois, poi] });
      toast.success("POI가 등록되었습니다.");
    }
    return poi;
  },

  deletePoi: async (nodeId: string) => {
    await api.deletePoi(nodeId);
    set({ pois: get().pois.filter((p) => p.nodeId !== nodeId) });
    toast.success("POI가 삭제되었습니다.");
  },

  selectPoi: (poiId) => set({ selectedPoiId: poiId }),

  setPlacementMode: (active) =>
    set({ isPlacementMode: active, pendingPosition: null, selectedPoiId: null }),

  setPendingPosition: (position) => set({ pendingPosition: position }),

  cancelPlacement: () => set({ isPlacementMode: false, pendingPosition: null }),

  reset: () => set(initialState),
}));
