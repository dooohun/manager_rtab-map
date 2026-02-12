import { create } from "zustand";
import { getFloorPath } from "@/api/floors";
import type { FloorPathResponse, FloorResponse, BuildingDetailResponse } from "@/types";

type ViewMode = "orbit" | "top-down" | "first-person";

interface ViewerState {
  selectedFloorId: string | null;
  floors: FloorResponse[];
  building: BuildingDetailResponse | null;
  floorPath: FloorPathResponse | null;
  isLoadingPath: boolean;
  showPath: boolean;
  showPOI: boolean;
  viewMode: ViewMode;

  setBuilding: (building: BuildingDetailResponse | null) => void;
  setFloors: (floors: FloorResponse[]) => void;
  selectFloor: (floorId: string) => void;
  setShowPath: (show: boolean) => void;
  setShowPOI: (show: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  loadFloorData: (floorId: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  selectedFloorId: null as string | null,
  floors: [] as FloorResponse[],
  building: null as BuildingDetailResponse | null,
  floorPath: null as FloorPathResponse | null,
  isLoadingPath: false,
  showPath: true,
  showPOI: false,
  viewMode: "orbit" as ViewMode,
};

export const useViewerStore = create<ViewerState>((set) => ({
  ...initialState,

  setBuilding: (building) => set({ building }),
  setFloors: (floors) => set({ floors }),

  selectFloor: (floorId) => {
    set({ selectedFloorId: floorId, floorPath: null });
  },

  setShowPath: (show) => set({ showPath: show }),
  setShowPOI: (show) => set({ showPOI: show }),
  setViewMode: (mode) => set({ viewMode: mode }),

  loadFloorData: async (floorId) => {
    set({
      selectedFloorId: floorId,
      isLoadingPath: true,
      floorPath: null,
    });

    try {
      const pathData = await getFloorPath(floorId);
      set({ floorPath: pathData, isLoadingPath: false });
    } catch {
      set({ isLoadingPath: false });
    }
  },

  reset: () => set(initialState),
}));
