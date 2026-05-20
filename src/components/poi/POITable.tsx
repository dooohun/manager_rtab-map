import { useState, useEffect, useRef } from "react";
import { MapPin, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePoiStore, useViewerStore } from "@/stores";
import type { PoiResponse } from "@/types";

const POI_CATEGORY_LABELS: Record<string, string> = {
  classroom: "강의실", office: "사무실", restroom: "화장실",
  entrance: "출구/입구", exit: "출구", elevator: "엘리베이터",
  staircase: "계단", door: "문", other: "기타",
};

const POI_CATEGORY_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  classroom: "default", office: "secondary", restroom: "outline",
  entrance: "destructive", exit: "destructive", elevator: "default",
  staircase: "default", door: "secondary", other: "outline",
};

interface POITableProps {
  buildingId: string;
}

export function POITable({ buildingId }: POITableProps) {
  const pois = usePoiStore((s) => s.pois);
  const fetchPois = usePoiStore((s) => s.fetchPois);
  const searchPois = usePoiStore((s) => s.searchPois);
  const deletePoi = usePoiStore((s) => s.deletePoi);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => { fetchPois(buildingId); }, [buildingId]);

  async function handleSearch(query: string) {
    setSearchQuery(query);
    await searchPois(buildingId, query || undefined);
  }

  function handleLongPress(id: string) {
    if (selectMode) return;
    setSelectMode(true);
    setSelectedIds(new Set([id]));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  function toggleSelectAll() {
    const allSelected = pois.length > 0 && selectedIds.size === pois.length;
    setSelectedIds(allSelected ? new Set() : new Set(pois.map((p) => p.poiId)));
  }

  async function handleBatchDelete() {
    for (const id of selectedIds) {
      try { await deletePoi(id); } catch { /* interceptor */ }
    }
    setSelectMode(false);
    setSelectedIds(new Set());
    setDeleteConfirmOpen(false);
    fetchPois(buildingId);
  }

  const allSelected = pois.length > 0 && selectedIds.size === pois.length;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="POI 검색..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="pl-9 h-9" />
      </div>

      {selectMode && (
        <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs" onClick={toggleSelectAll}>
              {allSelected ? "전체 해제" : "전체 선택"}
            </Button>
            <span className="text-xs text-muted-foreground">{selectedIds.size}개 선택됨</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="destructive" size="sm" className="text-xs" disabled={selectedIds.size === 0} onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />삭제
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>취소</Button>
          </div>
        </div>
      )}

      {pois.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <MapPin className="h-10 w-10 mb-2" />
          <p className="text-sm">등록된 POI가 없습니다.</p>
          <p className="text-xs mt-1">3D 뷰에서 POI를 배치하세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pois.map((poi) => (
            <POICard
              key={poi.poiId}
              poi={poi}
              selectMode={selectMode}
              isSelected={selectedIds.has(poi.poiId)}
              onToggleSelect={() => toggleSelect(poi.poiId)}
              onLongPress={() => handleLongPress(poi.poiId)}
            />
          ))}
        </div>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>POI 삭제</AlertDialogTitle>
            <AlertDialogDescription>{selectedIds.size}개 POI를 삭제하시겠습니까?</AlertDialogDescription>
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

function POICard({ poi, selectMode, isSelected, onToggleSelect, onLongPress }: {
  poi: PoiResponse; selectMode: boolean; isSelected: boolean;
  onToggleSelect: () => void; onLongPress: () => void;
}) {
  const building = useViewerStore((s) => s.building);
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

  const floor = building?.floors.find((f) => f.floorId === poi.floorId);
  const categoryKey = poi.category?.toLowerCase() ?? "other";
  const categoryLabel = POI_CATEGORY_LABELS[categoryKey] ?? poi.category;
  const categoryColor = POI_CATEGORY_COLORS[categoryKey] ?? "outline";

  return (
    <div
      className={`rounded-lg border p-3 transition-colors cursor-pointer ${isSelected ? "ring-2 ring-destructive bg-destructive/5" : "bg-background hover:bg-muted/30"}`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-9 w-9 rounded-md bg-amber-500/10 shrink-0">
          <MapPin className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{poi.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant={categoryColor} className="text-[10px] px-1.5 py-0">
              {categoryLabel}
            </Badge>
            {floor && (
              <span className="text-[11px] text-muted-foreground">
                {floor.level > 0 ? `${floor.level}F` : `B${Math.abs(floor.level)}F`} {floor.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
