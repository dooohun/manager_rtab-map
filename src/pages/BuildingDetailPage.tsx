import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  MapPin,
  Layers,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBuildingStore, usePoiStore } from "@/stores";
import { EditBuildingDialog } from "@/components/building";
import { FloorTable } from "@/components/floor";
import { Viewer3DTab } from "@/components/viewer";
import { POITable } from "@/components/poi";
import { useHeader } from "@/hooks/use-header";

type TabId = "floors" | "pois" | "viewer3d";

const TABS: { id: TabId; label: string; icon: typeof Layers }[] = [
  { id: "floors", label: "층", icon: Layers },
  { id: "pois", label: "POI", icon: MapPin },
  { id: "viewer3d", label: "3D", icon: Box },
];

export default function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setHeader, resetHeader } = useHeader();
  const { currentBuilding, isLoading, fetchBuildingDetail, deleteBuilding, clearCurrentBuilding } =
    useBuildingStore();
  const { fetchPois } = usePoiStore();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("floors");

  useEffect(() => {
    if (id) {
      fetchBuildingDetail(id);
      fetchPois(id);
    }
    return () => {
      clearCurrentBuilding();
      resetHeader();
    };
  }, [id]);

  useEffect(() => {
    if (currentBuilding) {
      setHeader({
        backTo: "/",
        title: currentBuilding.name,
        actions: (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                건물 정보 수정
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                건물 삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      });
    }
  }, [currentBuilding?.id]);

  async function handleDelete() {
    if (!id) return;
    try {
      await deleteBuilding(id);
      navigate("/");
    } catch {
      // interceptor
    }
  }

  if (isLoading || !currentBuilding) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Content area — between header and bottom nav */}
      <div className="fixed inset-0 top-[44px] bottom-[48px] overflow-y-auto">
        {activeTab === "viewer3d" && (
          <div className="h-full">
            <Viewer3DTab floors={currentBuilding.floors} />
          </div>
        )}
        {activeTab === "floors" && (
          <div className="p-3 sm:p-4 max-w-3xl mx-auto">
            <FloorTable buildingId={currentBuilding.id} floors={currentBuilding.floors} />
          </div>
        )}
        {activeTab === "pois" && (
          <div className="p-3 sm:p-4 max-w-3xl mx-auto">
            <POITable buildingId={currentBuilding.id} />
          </div>
        )}
      </div>

      {/* Bottom navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex items-stretch border-t bg-background">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors ${
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dialogs */}
      <EditBuildingDialog
        building={currentBuilding}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>건물 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{currentBuilding.name}&rdquo; 건물과 관련된 모든 데이터가 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
