import { useState, useEffect, useRef } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
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
  const [editTarget, setEditTarget] = useState<FloorResponse | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [chunkFloor, setChunkFloor] = useState<FloorResponse | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (floors.length > 0) fetchAllMergeStatuses(floors.map((f) => f.id));
  }, [floors]);

  const sortedFloors = [...floors].sort((a, b) => b.level - a.level);
  const allSelected = sortedFloors.length > 0 && selectedIds.size === sortedFloors.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(sortedFloors.map((f) => f.id)));
  }

  function handleLongPress(id: string) {
    if (selectMode) return;
    setSelectMode(true);
    setSelectedIds(new Set([id]));
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleBatchDelete() {
    for (const id of selectedIds) {
      try { await deleteFloor(id, buildingId); } catch { /* interceptor */ }
    }
    exitSelectMode();
    setDeleteConfirmOpen(false);
  }

  return (
    <div className="space-y-2">
      {selectMode && (
        <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs" onClick={toggleSelectAll}>
              {allSelected ? "전체 해제" : "전체 선택"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size}개 선택됨` : "삭제할 층을 선택하세요"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="destructive" size="sm" className="text-xs" disabled={selectedIds.size === 0} onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />삭제
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={exitSelectMode}>취소</Button>
          </div>
        </div>
      )}

      {sortedFloors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">등록된 층이 없습니다.</p>
          <p className="text-xs mt-1">+ 버튼으로 층을 추가하세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedFloors.map((floor) => (
            <FloorCard
              key={floor.id}
              floor={floor}
              mergeStatus={mergeStatuses[floor.id]?.status}
              selectMode={selectMode}
              isSelected={selectedIds.has(floor.id)}
              onToggleSelect={() => toggleSelect(floor.id)}
              onLongPress={() => handleLongPress(floor.id)}
              onEdit={() => setEditTarget(floor)}
              onManageDb={() => setChunkFloor(floor)}
            />
          ))}
        </div>
      )}

      <Button size="icon" className="fixed bottom-16 right-4 z-20 h-12 w-12 rounded-full shadow-lg" onClick={() => setCreateOpen(true)} aria-label="층 추가">
        <Plus className="h-5 w-5" />
      </Button>

      <FloorFormDialog buildingId={buildingId} open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      {editTarget && <FloorFormDialog buildingId={buildingId} open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)} mode="edit" floor={editTarget} />}
      {chunkFloor && <ChunkManageSheet floorId={chunkFloor.id} floorName={chunkFloor.name} open={!!chunkFloor} onOpenChange={(o) => !o && setChunkFloor(null)} />}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>층 삭제</AlertDialogTitle>
            <AlertDialogDescription>{selectedIds.size}개 층을 삭제하시겠습니까?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDelete} className="bg-destructive text-white hover:bg-destructive/90">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FloorCard({
  floor, mergeStatus, selectMode, isSelected, onToggleSelect, onLongPress, onEdit, onManageDb,
}: {
  floor: FloorResponse;
  mergeStatus: string | undefined;
  selectMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onLongPress: () => void;
  onEdit: () => void;
  onManageDb: () => void;
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  function handlePointerDown() {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => { didLongPress.current = true; onLongPress(); }, 500);
  }
  function handlePointerUp() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }
  function handleClick() {
    if (didLongPress.current) { didLongPress.current = false; return; }
    if (selectMode) onToggleSelect();
  }

  const level = floor.level > 0 ? `${floor.level}F` : `B${Math.abs(floor.level)}F`;

  return (
    <div
      className={`rounded-lg border p-3 transition-colors cursor-pointer ${isSelected ? "ring-2 ring-destructive bg-destructive/5" : "bg-background hover:bg-muted/30"}`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-9 w-9 rounded-md bg-primary/10 shrink-0">
          <span className="text-xs font-bold text-primary">{level}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{floor.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {floor.height && <span className="text-[11px] text-muted-foreground">{floor.height}m</span>}
            <MergeBadge status={mergeStatus as any} />
          </div>
        </div>

        {!selectMode && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="outline" size="sm" className="h-7 text-[11px] px-2" onClick={(e) => { e.stopPropagation(); onManageDb(); }}>
              스캔 업로드
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[11px] px-2" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              수정
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
