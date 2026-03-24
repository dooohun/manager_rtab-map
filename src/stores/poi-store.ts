import { create } from "zustand";
import { toast } from "sonner";
import * as api from "@/api";
import * as graphApi from "@/api/graph";
import { useGraphEditorStore } from "./graph-editor-store";
import { useViewerStore } from "./viewer-store";
import type { PoiResponse, PoiCreateRequest, PoiRegisterRequest, Point3D } from "@/types";

export interface PendingPoiTarget {
  x: number;
  y: number;
  z: number;
  targetNodeId?: string;
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
  registerPoiToNode: (nodeId: string, data: PoiRegisterRequest) => Promise<PoiResponse>;
  deletePoi: (nodeId: string) => Promise<void>;
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
    const graphStore = useGraphEditorStore.getState();
    const selectedFloorId = useViewerStore.getState().selectedFloorId;

    // 해당 노드에 연결된 수평 엣지 확인
    const connectedEdges = graphStore.edges.filter(
      (e) => (e.fromNodeId === nodeId || e.toNodeId === nodeId) && e.edgeType === "HORIZONTAL",
    );

    // 수평 엣지가 정확히 2개 → 엣지 분할로 생긴 노드 → 노드 삭제 + 엣지 병합
    if (connectedEdges.length === 2 && selectedFloorId) {
      const neighbors = connectedEdges.map((e) =>
        e.fromNodeId === nodeId ? e.toNodeId : e.fromNodeId,
      );

      // 노드 삭제 (백엔드에서 연결된 엣지도 함께 삭제)
      await graphApi.deleteNode(nodeId);

      // 이웃 노드 사이에 엣지 복원
      try {
        await graphApi.createEdge(selectedFloorId, {
          fromNodeId: neighbors[0],
          toNodeId: neighbors[1],
          isBidirectional: true,
        });
      } catch { /* 이미 존재하는 엣지면 무시 */ }

      set({ pois: get().pois.filter((p) => p.nodeId !== nodeId) });
      await graphStore.fetchGraph(selectedFloorId);
      toast.success("POI 노드가 삭제되고 엣지가 병합되었습니다.");
    } else {
      // 다른 경우 → POI 정보만 제거 (노드는 WAYPOINT로 유지)
      await api.deletePoi(nodeId);
      set({ pois: get().pois.filter((p) => p.nodeId !== nodeId) });

      if (selectedFloorId && graphStore.isEditorActive) {
        await graphStore.fetchGraph(selectedFloorId);
      }
      toast.success("POI가 삭제되었습니다.");
    }
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
