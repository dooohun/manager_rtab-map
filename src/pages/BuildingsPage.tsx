import { useEffect, useState, useMemo } from "react";
import { Building2, Loader2, Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBuildingStore } from "@/stores";
import { BuildingCard, CreateBuildingDialog, EditBuildingDialog } from "@/components/building";
import { deleteMultipleBuildings } from "@/api/buildings";
import { useHeader } from "@/hooks/use-header";
import type { BuildingResponse } from "@/types";

export default function BuildingsPage() {
  const { buildings, isLoading, fetchBuildings } = useBuildingStore();
  const { setHeader, resetHeader } = useHeader();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BuildingResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setHeader({ title: "건물 관리" });
    fetchBuildings();
    return () => resetHeader();
  }, []);

  const filteredBuildings = useMemo(() => {
    if (!searchQuery.trim()) return buildings;
    const q = searchQuery.toLowerCase();
    return buildings.filter((b) => b.name.toLowerCase().includes(q) || (b.description && b.description.toLowerCase().includes(q)));
  }, [buildings, searchQuery]);

  const allSelected = filteredBuildings.length > 0 && selectedIds.size === filteredBuildings.length;

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(filteredBuildings.map((b) => b.id)));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  function handleLongPress(id: string) {
    if (selectMode) return;
    setSelectMode(true);
    setSelectedIds(new Set([id]));
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(`${count}개 건물을 삭제하시겠습니까?\n관련된 모든 데이터가 함께 삭제됩니다.`)) return;
    setIsDeleting(true);
    try {
      await deleteMultipleBuildings(Array.from(selectedIds));
      toast.success(`${count}개 건물이 삭제되었습니다.`);
      setSelectMode(false); setSelectedIds(new Set());
      fetchBuildings();
    } catch { toast.error("삭제 중 오류가 발생했습니다."); }
    finally { setIsDeleting(false); }
  }

  return (
    <div className="space-y-3 pb-20">
      {buildings.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="건물 이름 또는 키워드로 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
        </div>
      )}

      {selectMode && (
        <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs" onClick={toggleSelectAll}>
              {allSelected ? "전체 해제" : "전체 선택"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size}개 선택됨` : "삭제할 건물을 선택하세요"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="destructive" size="sm" className="text-xs" onClick={handleBatchDelete} disabled={isDeleting || selectedIds.size === 0}>
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
              삭제
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>
              취소
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : buildings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">건물이 없습니다</h3>
          <p className="mt-1 text-sm text-muted-foreground">+ 버튼으로 건물을 추가하세요.</p>
        </div>
      ) : filteredBuildings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">&ldquo;{searchQuery}&rdquo;에 대한 검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBuildings.map((building) => (
            <div key={building.id} className={selectedIds.has(building.id) ? "ring-2 ring-destructive rounded-lg" : ""}>
              <BuildingCard
                building={building}
                onSelect={selectMode ? () => toggleSelect(building.id) : undefined}
                onEdit={() => setEditTarget(building)}
                onLongPress={() => handleLongPress(building.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Floating add button */}
      <Button
        size="icon"
        className="fixed bottom-6 right-4 z-30 h-14 w-14 rounded-full shadow-xl"
        onClick={() => setCreateOpen(true)}
        aria-label="건물 추가"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <CreateBuildingDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editTarget && (
        <EditBuildingDialog building={editTarget} open={!!editTarget} onOpenChange={(o) => { if (!o) { setEditTarget(null); fetchBuildings(); } }} />
      )}
    </div>
  );
}
