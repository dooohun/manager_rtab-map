import { create } from "zustand";
import { toast } from "sonner";
import * as api from "@/api";
import type {
  PoiResponse,
  PoiCreateRequest,
  PoiUpdateRequest,
  Point3D,
} from "@/types";

export interface PendingPoiTarget {
  x: number;
  y: number;
  z: number;
  existingNodeId?: string;
  splitEdge?: {
    edgeId: string;
    fromNodeId: string;
    toNodeId: string;
  };
}

interface PoiStore {
  pois: PoiResponse[];
  isLoading: boolean;
  error: string | null;
  buildingId: string | null;
  selectedPoiId: string | null;
  isPlacementMode: boolean;
  pendingPosition: Point3D | null;
  pendingPoiTarget: PendingPoiTarget | null;

  setBuildingId: (buildingId: string) => void;
  fetchPois: (buildingId: string) => Promise<void>;
  searchPois: (buildingId: string, query?: string) => Promise<void>;
  createPoi: (buildingId: string, data: PoiCreateRequest) => Promise<PoiResponse>;
  updatePoi: (poiId: string, data: PoiUpdateRequest) => Promise<PoiResponse>;
  attachPoiToNode: (poiId: string, routeNodeId: string) => Promise<PoiResponse>;
  deletePoi: (poiId: string) => Promise<void>;
  selectPoi: (poiId: string | null) => void;
  setPlacementMode: (active: boolean) => void;
  setPendingPosition: (position: Point3D | null) => void;
  setPendingPoiTarget: (target: PendingPoiTarget | null) => void;
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
  pendingPoiTarget: null as PendingPoiTarget | null,
};

export const usePoiStore = create<PoiStore>((set, get) => ({
  ...initialState,

  setBuildingId: (buildingId) => set({ buildingId }),

  fetchPois: async (buildingId) => {
    set({ isLoading: true, error: null, buildingId });
    try {
      const pois = await api.getPois(buildingId);
      set({ pois, isLoading: false });
    } catch (error) {
      set({ error: "POI 목록을 불러오는데 실패했습니다.", isLoading: false });
      throw error;
    }
  },

  searchPois: async (buildingId, query) => {
    set({ isLoading: true, error: null });
    try {
      const pois = await api.searchPois(buildingId, query);
      set({ pois, isLoading: false });
    } catch (error) {
      set({ error: "POI 검색에 실패했습니다.", isLoading: false });
      throw error;
    }
  },

  createPoi: async (buildingId, data) => {
    const newPoi = await api.createPoi(buildingId, data);
    set({ pois: [...get().pois, newPoi] });
    toast.success("POI가 생성되었습니다.");
    return newPoi;
  },

  updatePoi: async (poiId, data) => {
    const updated = await api.updatePoi(poiId, data);
    set({ pois: get().pois.map((p) => (p.poiId === poiId ? updated : p)) });
    toast.success("POI가 수정되었습니다.");
    return updated;
  },

  attachPoiToNode: async (poiId, routeNodeId) => {
    const updated = await api.attachPoiToNode(poiId, { routeNodeId });
    set({ pois: get().pois.map((p) => (p.poiId === poiId ? updated : p)) });
    toast.success("POI가 노드에 연결되었습니다.");
    return updated;
  },

  deletePoi: async (poiId) => {
    await api.deletePoi(poiId);
    set({ pois: get().pois.filter((p) => p.poiId !== poiId) });
    toast.success("POI가 삭제되었습니다.");
  },

  selectPoi: (poiId) => set({ selectedPoiId: poiId }),

  setPlacementMode: (active) =>
    set({ isPlacementMode: active, pendingPosition: null, pendingPoiTarget: null, selectedPoiId: null }),

  setPendingPosition: (position) => set({ pendingPosition: position }),

  setPendingPoiTarget: (target) =>
    set({
      pendingPoiTarget: target,
      pendingPosition: target ? { x: target.x, y: target.y, z: target.z } : null,
    }),

  cancelPlacement: () => set({ isPlacementMode: false, pendingPosition: null, pendingPoiTarget: null }),

  reset: () => set(initialState),
}));
