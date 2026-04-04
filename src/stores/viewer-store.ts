import { create } from "zustand";
import { getFloorPath } from "@/api/floors";
import type { FloorPathResponse, FloorResponse, BuildingDetailResponse, NodeImageResponse } from "@/types";

type ViewMode = "orbit" | "top-down" | "fps";

interface ViewerState {
  selectedFloorId: string | null;
  floors: FloorResponse[];
  building: BuildingDetailResponse | null;
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
  setShowPath: (show: boolean) => void;
  setShowPOI: (show: boolean) => void;
  setShowPointcloud: (show: boolean) => void;
  setPointSize: (size: number) => void;
  setPlyUrl: (url: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  showAllFloors: boolean;
  setShowAllFloors: (show: boolean) => void;
  nearbyImages: NodeImageResponse[];
  setNearbyImages: (images: NodeImageResponse[]) => void;
  orbitTarget: { x: number; y: number; z: number } | null;
  setOrbitTarget: (target: { x: number; y: number; z: number } | null) => void;
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
  showPointcloud: false,
  pointSize: 0.04,
  plyUrl: null as string | null,
  viewMode: "orbit" as ViewMode,
  showAllFloors: false,
  nearbyImages: [] as NodeImageResponse[],
  orbitTarget: null as { x: number; y: number; z: number } | null,
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
  setShowPointcloud: (show) => set({ showPointcloud: show }),
  setPointSize: (size) => set({ pointSize: size }),
  setPlyUrl: (url) => set({ plyUrl: url }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowAllFloors: (show) => set({ showAllFloors: show }),
  setNearbyImages: (images) => set({ nearbyImages: images }),
  setOrbitTarget: (target) => set({ orbitTarget: target }),

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
