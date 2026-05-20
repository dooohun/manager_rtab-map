import { create } from "zustand";
import { toast } from "sonner";
import * as api from "@/api";
import type { PolygonResponse, PolygonRequest, Point3D } from "@/types";

interface PolygonStore {
  polygons: PolygonResponse[];
  isLoading: boolean;
  areaId: string | null;
  selectedPolygonId: string | null;

  // 코너 draft — add-corner 모드에서 클릭으로 vertex 누적. commitDraftAsCorner로 닫으면
  // area에 새 polygon row 1개 POST (1 area = 다중 row, read 시 서버가 UnaryUnion).
  draftVertices: Point3D[];

  fetchPolygons: (areaId: string) => Promise<void>;
  createPolygon: (areaId: string, body: PolygonRequest) => Promise<PolygonResponse>;
  updatePolygon: (polygonId: string, body: PolygonRequest) => Promise<PolygonResponse>;
  deletePolygon: (polygonId: string) => Promise<void>;
  selectPolygon: (polygonId: string | null) => void;

  addDraftVertex: (p: Point3D) => void;
  popDraftVertex: () => void;
  clearDraft: () => void;
  commitDraftAsCorner: (areaId: string) => Promise<void>;

  reset: () => void;
}

const initialState = {
  polygons: [] as PolygonResponse[],
  isLoading: false,
  areaId: null as string | null,
  selectedPolygonId: null as string | null,
  draftVertices: [] as Point3D[],
};

export const usePolygonStore = create<PolygonStore>((set, get) => ({
  ...initialState,

  fetchPolygons: async (areaId) => {
    set({ isLoading: true, areaId });
    try {
      const polygons = await api.listPolygons(areaId);
      set({ polygons, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createPolygon: async (areaId, body) => {
    const newPolygon = await api.createPolygon(areaId, body);
    set({ polygons: [...get().polygons, newPolygon] });
    toast.success("폴리곤이 생성되었습니다.");
    return newPolygon;
  },

  updatePolygon: async (polygonId, body) => {
    const updated = await api.updatePolygon(polygonId, body);
    set({ polygons: get().polygons.map((p) => (p.polygonId === polygonId ? updated : p)) });
    toast.success("폴리곤이 수정되었습니다.");
    return updated;
  },

  deletePolygon: async (polygonId) => {
    await api.deletePolygon(polygonId);
    set({
      polygons: get().polygons.filter((p) => p.polygonId !== polygonId),
      selectedPolygonId: get().selectedPolygonId === polygonId ? null : get().selectedPolygonId,
    });
    toast.success("폴리곤이 삭제되었습니다.");
  },

  selectPolygon: (polygonId) => set({ selectedPolygonId: polygonId }),

  addDraftVertex: (p) => set({ draftVertices: [...get().draftVertices, p] }),
  popDraftVertex: () => set({ draftVertices: get().draftVertices.slice(0, -1) }),
  clearDraft: () => set({ draftVertices: [] }),
  commitDraftAsCorner: async (areaId) => {
    const verts = get().draftVertices;
    if (verts.length < 3) {
      toast.error("코너는 최소 3개 vertex 필요");
      return;
    }
    const created = await api.createPolygon(areaId, { exterior: verts });
    set({ draftVertices: [], polygons: [...get().polygons, created] });
    toast.success(`코너 저장 (vertex ${verts.length})`);
  },

  reset: () => set(initialState),
}));
