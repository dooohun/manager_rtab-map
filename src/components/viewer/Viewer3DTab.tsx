import { useEffect, useState } from "react";
import { useViewerStore, useBuildingStore, usePoiStore } from "@/stores";
import { PointCloudViewer } from "./PointCloudViewer";
import { ViewerControls } from "./ViewerControls";
import { CreatePOIDialog, POIDetailSheet } from "@/components/poi";
import type { FloorResponse } from "@/types";

interface Viewer3DTabProps {
  floors: FloorResponse[];
}

export function Viewer3DTab({ floors }: Viewer3DTabProps) {
  const setFloors = useViewerStore((s) => s.setFloors);
  const setBuilding = useViewerStore((s) => s.setBuilding);
  const viewerReset = useViewerStore((s) => s.reset);
  const currentBuilding = useBuildingStore((s) => s.currentBuilding);
  const pendingPoiPosition = usePoiStore((s) => s.pendingPosition);
  const selectedPoiId = usePoiStore((s) => s.selectedPoiId);
  const selectPoi = usePoiStore((s) => s.selectPoi);
  const fetchPois = usePoiStore((s) => s.fetchPois);
  const poiReset = usePoiStore((s) => s.reset);

  const [createPoiDialogOpen, setCreatePoiDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setFloors(floors);
    setBuilding(currentBuilding);

    // POI 목록 불러오기
    if (currentBuilding?.id) {
      fetchPois(currentBuilding.id).catch(console.error);
    }

    return () => {
      viewerReset();
      poiReset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floors, currentBuilding]);

  // POI 배치 위치가 설정되면 다이얼로그 열기
  useEffect(() => {
    if (pendingPoiPosition) {
      setCreatePoiDialogOpen(true);
    }
  }, [pendingPoiPosition]);

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex">
        <PointCloudViewer />
        <div className="absolute top-4 right-4 z-10">
          <ViewerControls
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(false)}
          />
        </div>
        {currentBuilding && (
          <CreatePOIDialog
            buildingId={currentBuilding.id}
            open={createPoiDialogOpen}
            onOpenChange={setCreatePoiDialogOpen}
          />
        )}
        <POIDetailSheet
          poiId={selectedPoiId}
          open={selectedPoiId !== null}
          onOpenChange={(open) => {
            if (!open) selectPoi(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[600px]">
      <PointCloudViewer />
      <ViewerControls
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(true)}
      />
      {currentBuilding && (
        <CreatePOIDialog
          buildingId={currentBuilding.id}
          open={createPoiDialogOpen}
          onOpenChange={setCreatePoiDialogOpen}
        />
      )}
      <POIDetailSheet
        poiId={selectedPoiId}
        open={selectedPoiId !== null}
        onOpenChange={(open) => {
          if (!open) selectPoi(null);
        }}
      />
    </div>
  );
}
