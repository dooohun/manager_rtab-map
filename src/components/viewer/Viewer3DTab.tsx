import { useEffect, useState } from "react";
import { useViewerStore, useBuildingStore, usePoiStore, useGraphEditorStore } from "@/stores";
import { PointCloudViewer } from "./PointCloudViewer";
import { ViewerControls } from "./ViewerControls";
import { CreatePOIDialog, POIDetailSheet } from "@/components/poi";
import { PassageNodeDialog } from "./PassageNodeDialog";
import { getFloorPlyUrl } from "@/api/floors";
import type { FloorResponse } from "@/types";

interface Viewer3DTabProps {
  floors: FloorResponse[];
}

export function Viewer3DTab({ floors }: Viewer3DTabProps) {
  const setFloors = useViewerStore((s) => s.setFloors);
  const setBuilding = useViewerStore((s) => s.setBuilding);
  const viewerReset = useViewerStore((s) => s.reset);
  const currentBuilding = useBuildingStore((s) => s.currentBuilding);
  const pendingPoiTarget = usePoiStore((s) => s.pendingPoiTarget);
  const selectedPoiId = usePoiStore((s) => s.selectedPoiId);
  const selectPoi = usePoiStore((s) => s.selectPoi);
  const fetchPois = usePoiStore((s) => s.fetchPois);
  const poiReset = usePoiStore((s) => s.reset);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const isEditorActive = useGraphEditorStore((s) => s.isEditorActive);
  const fetchGraph = useGraphEditorStore((s) => s.fetchGraph);
  const graphReset = useGraphEditorStore((s) => s.reset);
  const showPointcloud = useViewerStore((s) => s.showPointcloud);
  const setPlyUrl = useViewerStore((s) => s.setPlyUrl);

  const [createPoiDialogOpen, setCreatePoiDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setFloors(floors);
    setBuilding(currentBuilding);

    if (currentBuilding?.id) {
      fetchPois(currentBuilding.id).catch(console.error);
    }

    return () => {
      viewerReset();
      poiReset();
      graphReset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floors, currentBuilding]);

  // 포인트클라우드: 선택된 층의 PLY 로드
  useEffect(() => {
    if (!showPointcloud || !selectedFloorId) {
      setPlyUrl(null);
      return;
    }

    // 층별 PLY 엔드포인트 사용
    const url = getFloorPlyUrl(selectedFloorId);
    setPlyUrl(url);
  }, [showPointcloud, selectedFloorId, setPlyUrl]);

  // 그래프 에디터 활성 시 + 층 선택 시 그래프 로드
  useEffect(() => {
    if (isEditorActive && selectedFloorId) {
      fetchGraph(selectedFloorId).catch(console.error);
    }
  }, [isEditorActive, selectedFloorId, fetchGraph]);

  // POI 배치 대상이 설정되면 다이얼로그 열기
  useEffect(() => {
    if (pendingPoiTarget) {
      setCreatePoiDialogOpen(true);
    }
  }, [pendingPoiTarget]);

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
        <PassageNodeDialog />
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
      <PassageNodeDialog />
    </div>
  );
}
