import { useState, useEffect } from "react";
import { Pencil, Trash2, Plus, HardDrive } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useFloorStore, useChunkStore } from "@/stores";
import type { FloorResponse } from "@/types";
import { FloorFormDialog } from "./FloorFormDialog";
import { ChunkManageSheet, MergeBadge } from "@/components/chunk";

interface FloorTableProps {
  buildingId: string;
  floors: FloorResponse[];
}

export function FloorTable({ buildingId, floors }: FloorTableProps) {
  const { deleteFloor } = useFloorStore();
  const { mergeStatuses, fetchAllMergeStatuses } = useChunkStore();
  const [deleteTarget, setDeleteTarget] = useState<FloorResponse | null>(null);
  const [editTarget, setEditTarget] = useState<FloorResponse | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [chunkFloor, setChunkFloor] = useState<FloorResponse | null>(null);

  useEffect(() => {
    if (floors.length > 0) {
      fetchAllMergeStatuses(floors.map((f) => f.id));
    }
  }, [floors]);

  const sortedFloors = [...floors].sort((a, b) => b.level - a.level);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteFloor(deleteTarget.id, buildingId);
    } catch {
      // Error handled by interceptor
    }
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          총 {floors.length}개 층
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          층 추가
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">레벨</TableHead>
              <TableHead>이름</TableHead>
              <TableHead className="w-[100px]">높이 (m)</TableHead>
              <TableHead className="w-[100px]">경로</TableHead>
              <TableHead className="w-[100px]">병합 DB</TableHead>
              <TableHead className="w-[120px] text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFloors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  등록된 층이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              sortedFloors.map((floor) => (
                <TableRow key={floor.id}>
                  <TableCell className="font-medium">
                    {floor.level > 0 ? `${floor.level}F` : `B${Math.abs(floor.level)}F`}
                  </TableCell>
                  <TableCell>{floor.name}</TableCell>
                  <TableCell>{floor.height ? `${floor.height}m` : "-"}</TableCell>
                  <TableCell>
                    <Badge variant={floor.hasPath ? "default" : "secondary"}>
                      {floor.hasPath ? "있음" : "없음"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <MergeBadge status={mergeStatuses[floor.id]?.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setChunkFloor(floor)} title="DB 관리">
                        <HardDrive className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditTarget(floor)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(floor)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <FloorFormDialog
        buildingId={buildingId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
      />

      {editTarget && (
        <FloorFormDialog
          buildingId={buildingId}
          open={!!editTarget}
          onOpenChange={(open) => !open && setEditTarget(null)}
          mode="edit"
          floor={editTarget}
        />
      )}

      {chunkFloor && (
        <ChunkManageSheet
          floorId={chunkFloor.id}
          floorName={chunkFloor.name}
          open={!!chunkFloor}
          onOpenChange={(open) => !open && setChunkFloor(null)}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>층 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; 층을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
