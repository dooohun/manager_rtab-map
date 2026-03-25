import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  MapPin,
  Calendar,
  Layers,
  ArrowUpDown,
  Box,
  Plus,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBuildingStore, usePassageStore, usePoiStore, useChunkStore } from "@/stores";
import { StatusBadge, EditBuildingDialog } from "@/components/building";
import { FloorTable } from "@/components/floor";
import { PassageTable } from "@/components/passage";
import { Viewer3DTab } from "@/components/viewer";
import { POITable, CreatePOIDialog } from "@/components/poi";
import { ChunkManageSheet, MergeBadge } from "@/components/chunk";
import type { BuildingStatus, FloorResponse } from "@/types";

export default function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentBuilding, isLoading, fetchBuildingDetail, deleteBuilding, updateBuildingStatus, clearCurrentBuilding } =
    useBuildingStore();
  const { fetchPassages, typeFilter } = usePassageStore();
  const { fetchPois } = usePoiStore();
  const { mergeStatuses, fetchAllMergeStatuses, reset: resetChunkStore } = useChunkStore();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createPoiDialogOpen, setCreatePoiDialogOpen] = useState(false);
  const [chunkFloor, setChunkFloor] = useState<FloorResponse | null>(null);

  useEffect(() => {
    if (id) {
      fetchBuildingDetail(id);
      fetchPassages(id, typeFilter);
      fetchPois(id);
    }
    return () => {
      clearCurrentBuilding();
      resetChunkStore();
    };
  }, [id]);

  useEffect(() => {
    if (currentBuilding && currentBuilding.floors.length > 0) {
      fetchAllMergeStatuses(currentBuilding.floors.map((f) => f.id));
    }
  }, [currentBuilding?.id]);

  async function handleDelete() {
    if (!id) return;
    try {
      await deleteBuilding(id);
      navigate("/");
    } catch {
      // Error handled by interceptor
    }
  }

  async function handleStatusChange(status: string) {
    if (!id) return;
    try {
      await updateBuildingStatus(id, status as BuildingStatus);
    } catch {
      // Error handled by interceptor
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{currentBuilding.name}</h1>
            <StatusBadge status={currentBuilding.status} />
          </div>
          <p className="text-muted-foreground mt-1">
            {currentBuilding.description || "설명이 없습니다."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={currentBuilding.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">초안</SelectItem>
              <SelectItem value="PROCESSING">처리 중</SelectItem>
              <SelectItem value="ACTIVE">활성</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                정보 수정
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
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="h-4 w-4" />
            층 수
          </div>
          <p className="mt-1 text-2xl font-bold">{currentBuilding.floors.length}</p>
        </div>
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowUpDown className="h-4 w-4" />
            수직 통로
          </div>
          <p className="mt-1 text-2xl font-bold">{currentBuilding.verticalPassages.length}</p>
        </div>
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            위치
          </div>
          <p className="mt-1 text-sm font-medium">
            {currentBuilding.latitude && currentBuilding.longitude
              ? `${currentBuilding.latitude.toFixed(4)}, ${currentBuilding.longitude.toFixed(4)}`
              : "미설정"}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            마지막 수정
          </div>
          <p className="mt-1 text-sm font-medium">
            {new Date(currentBuilding.updatedAt).toLocaleDateString("ko-KR")}
          </p>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="floors">
        <TabsList>
          <TabsTrigger value="floors">
            <Layers className="mr-2 h-4 w-4" />
            층 목록
          </TabsTrigger>
          <TabsTrigger value="passages">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            수직 통로
          </TabsTrigger>
          <TabsTrigger value="pois">
            <MapPin className="mr-2 h-4 w-4" />
            POI 관리
          </TabsTrigger>
          <TabsTrigger value="db">
            <HardDrive className="mr-2 h-4 w-4" />
            DB 관리
          </TabsTrigger>
          <TabsTrigger value="viewer3d">
            <Box className="mr-2 h-4 w-4" />
            3D 뷰
          </TabsTrigger>
        </TabsList>

        <TabsContent value="floors" className="mt-4">
          <FloorTable buildingId={currentBuilding.id} floors={currentBuilding.floors} />
        </TabsContent>

        <TabsContent value="passages" className="mt-4">
          <PassageTable buildingId={currentBuilding.id} passages={currentBuilding.verticalPassages} />
        </TabsContent>

        <TabsContent value="pois" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">관심지점 (POI)</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  건물 내 주요 위치를 등록하고 관리합니다.
                </p>
              </div>
              <Button onClick={() => setCreatePoiDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                POI 생성
              </Button>
            </div>
            <POITable buildingId={currentBuilding.id} />
          </div>
        </TabsContent>

        <TabsContent value="db" className="mt-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">스캔 DB 관리</h3>
              <p className="text-sm text-muted-foreground mt-1">
                각 층의 RTAB-Map 스캔 데이터(.db)를 업로드하고 관리합니다.
              </p>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">레벨</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead className="w-[100px]">병합 DB</TableHead>
                    <TableHead className="w-[120px] text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentBuilding.floors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        등록된 층이 없습니다. 먼저 층을 추가해주세요.
                      </TableCell>
                    </TableRow>
                  ) : (
                    [...currentBuilding.floors]
                      .sort((a, b) => b.level - a.level)
                      .map((floor) => (
                        <TableRow key={floor.id}>
                          <TableCell className="font-medium">
                            {floor.level > 0 ? `${floor.level}F` : `B${Math.abs(floor.level)}F`}
                          </TableCell>
                          <TableCell>{floor.name}</TableCell>
                          <TableCell>
                            <MergeBadge status={mergeStatuses[floor.id]?.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => setChunkFloor(floor)}>
                              <HardDrive className="mr-2 h-4 w-4" />
                              DB 관리
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="viewer3d" className="mt-4">
          <Viewer3DTab floors={currentBuilding.floors} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EditBuildingDialog
        building={currentBuilding}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <CreatePOIDialog
        buildingId={currentBuilding.id}
        open={createPoiDialogOpen}
        onOpenChange={setCreatePoiDialogOpen}
      />

      {chunkFloor && (
        <ChunkManageSheet
          floorId={chunkFloor.id}
          floorName={chunkFloor.name}
          open={!!chunkFloor}
          onOpenChange={(open) => !open && setChunkFloor(null)}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>건물 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{currentBuilding.name}&rdquo; 건물을 삭제하시겠습니까?
              <br />
              관련된 모든 층, 수직 통로 데이터가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
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
    </div>
  );
}
