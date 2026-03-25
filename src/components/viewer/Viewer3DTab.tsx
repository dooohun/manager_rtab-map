import { useEffect, useState } from "react";
import { useViewerStore, useBuildingStore, usePoiStore, useGraphEditorStore } from "@/stores";
import { PointCloudViewer } from "./PointCloudViewer";
import { ViewerToolbar } from "./ViewerToolbar";
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
  const setShowPOI = useViewerStore((s) => s.setShowPOI);
  const setShowPointcloud = useViewerStore((s) => s.setShowPointcloud);
  const setEditorActive = useGraphEditorStore((s) => s.setEditorActive);
  const fetchGraph = useGraphEditorStore((s) => s.fetchGraph);
  const graphReset = useGraphEditorStore((s) => s.reset);
  const setPlyUrl = useViewerStore((s) => s.setPlyUrl);

  const [createPoiDialogOpen, setCreatePoiDialogOpen] = useState(false);

  useEffect(() => {
    setFloors(floors);
    setBuilding(currentBuilding);
    setShowPOI(true);
    setShowPointcloud(true);
    setEditorActive(true);
    if (currentBuilding?.id) fetchPois(currentBuilding.id).catch(console.error);
    return () => { viewerReset(); poiReset(); graphReset(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floors, currentBuilding]);

  useEffect(() => {
    if (!selectedFloorId) { setPlyUrl(null); return; }
    setPlyUrl(getFloorPlyUrl(selectedFloorId));
  }, [selectedFloorId, setPlyUrl]);

  useEffect(() => {
    if (selectedFloorId) fetchGraph(selectedFloorId).catch(console.error);
  }, [selectedFloorId, fetchGraph]);

  useEffect(() => {
    if (pendingPoiTarget) setCreatePoiDialogOpen(true);
  }, [pendingPoiTarget]);

  return (
    <div className="absolute inset-0">
      <PointCloudViewer />
      <ViewerToolbar />
      {currentBuilding && (
        <CreatePOIDialog buildingId={currentBuilding.id} open={createPoiDialogOpen} onOpenChange={setCreatePoiDialogOpen} />
      )}
      <POIDetailSheet poiId={selectedPoiId} open={selectedPoiId !== null} onOpenChange={(open) => { if (!open) selectPoi(null); }} />
      <PassageNodeDialog />
    </div>
  );
}
