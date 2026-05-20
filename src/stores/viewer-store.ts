import { create } from "zustand";
import { getFloorPath } from "@/api/floors";
import { getAreas } from "@/api/areas";
import type {
  FloorPathResponse,
  FloorResponse,
  BuildingDetailResponse,
  AreaResponse,
} from "@/types";

type ViewMode = "orbit" | "top-down" | "fps";

interface ViewerState {
  selectedFloorId: string | null;
  floors: FloorResponse[];
  building: BuildingDetailResponse | null;
  areas: AreaResponse[];
  selectedAreaId: string | null;
  floorPath: FloorPathResponse | null;
  isLoadingPath: boolean;
  showPath: boolean;
  showPOI: boolean;
  showPointcloud: boolean;
  pointSize: number;
  plyUrl: string | null;
  viewMode: ViewMode;

  setBuilding: (building: BuildingDetailResponse | null) => void;
  setFloors: (floors: FloorResponse[]) => void;
  selectFloor: (floorId: string) => void;
  selectArea: (areaId: string) => void;
  setShowPath: (show: boolean) => void;
  setShowPOI: (show: boolean) => void;
  setShowPointcloud: (show: boolean) => void;
  setPointSize: (size: number) => void;
  setPlyUrl: (url: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  showAllFloors: boolean;
  setShowAllFloors: (show: boolean) => void;
  orbitTarget: { x: number; y: number; z: number } | null;
  setOrbitTarget: (target: { x: number; y: number; z: number } | null) => void;
  loadFloorData: (floorId: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  selectedFloorId: null as string | null,
  floors: [] as FloorResponse[],
  building: null as BuildingDetailResponse | null,
  areas: [] as AreaResponse[],
  selectedAreaId: null as string | null,
  floorPath: null as FloorPathResponse | null,
  isLoadingPath: false,
  showPath: true,
  showPOI: false,
  showPointcloud: false,
  pointSize: 0.04,
  plyUrl: null as string | null,
  viewMode: "orbit" as ViewMode,
  showAllFloors: false,
  orbitTarget: null as { x: number; y: number; z: number } | null,
};

export const useViewerStore = create<ViewerState>((set) => ({
  ...initialState,

  setBuilding: (building) => set({ building }),
  setFloors: (floors) => set({ floors }),

  selectFloor: (floorId) => {
    set({ selectedFloorId: floorId, floorPath: null });
  },

  selectArea: (areaId) => set({ selectedAreaId: areaId }),

  setShowPath: (show) => set({ showPath: show }),
  setShowPOI: (show) => set({ showPOI: show }),
  setShowPointcloud: (show) => set({ showPointcloud: show }),
  setPointSize: (size) => set({ pointSize: size }),
  setPlyUrl: (url) => set({ plyUrl: url }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowAllFloors: (show) => set({ showAllFloors: show }),
  setOrbitTarget: (target) => set({ orbitTarget: target }),

  loadFloorData: async (floorId) => {
    set({
      selectedFloorId: floorId,
      isLoadingPath: true,
      floorPath: null,
      areas: [],
      selectedAreaId: null,
    });

    try {
      const [pathData, areas] = await Promise.all([
        getFloorPath(floorId).catch(() => null),
        getAreas(floorId).catch(() => [] as AreaResponse[]),
      ]);
      const defaultArea = areas.find((a) => a.isDefault) ?? areas[0] ?? null;
      set({
        floorPath: pathData,
        areas,
        selectedAreaId: defaultArea?.areaId ?? null,
        isLoadingPath: false,
      });
    } catch {
      set({ isLoadingPath: false });
    }
  },

  reset: () => set(initialState),
}));
