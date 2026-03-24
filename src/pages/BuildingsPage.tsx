import { useEffect, useState } from "react";
import { Building2, Loader2, Trash2, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useBuildingStore } from "@/stores";
import { BuildingCard, CreateBuildingDialog } from "@/components/building";
import { deleteMultipleBuildings } from "@/api/buildings";
import type { BuildingStatus } from "@/types";

const statusTabs: { value: string; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "DRAFT", label: "초안" },
  { value: "PROCESSING", label: "처리 중" },
  { value: "ACTIVE", label: "활성" },
];

export default function BuildingsPage() {
  const { buildings, isLoading, statusFilter, fetchBuildings, setStatusFilter } = useBuildingStore();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchBuildings(statusFilter);
  }, []);

  function handleTabChange(value: string) {
    const status = value === "ALL" ? undefined : (value as BuildingStatus);
    setStatusFilter(status);
  }

  function enterSelectMode() {
    setSelectMode(true);
    setSelectedIds(new Set());
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(buildings.map((b) => b.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(`${count}개 건물을 삭제하시겠습니까?\n관련된 모든 데이터가 함께 삭제됩니다.`)) return;

    setIsDeleting(true);
    try {
      await deleteMultipleBuildings(Array.from(selectedIds));
      toast.success(`${count}개 건물이 삭제되었습니다.`);
      exitSelectMode();
      fetchBuildings(statusFilter);
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">건물 관리</h1>
          <p className="text-muted-foreground">등록된 건물을 관리하고 실내 구조를 설정합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                전체 선택
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                해제
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                disabled={isDeleting || selectedIds.size === 0}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                {selectedIds.size > 0 ? `${selectedIds.size}개 삭제` : "삭제"}
              </Button>
              <Button variant="outline" size="sm" onClick={exitSelectMode}>
                취소
              </Button>
            </>
          ) : (
            <>
              {buildings.length > 0 && (
                <Button variant="outline" size="sm" onClick={enterSelectMode}>
                  <CheckSquare className="h-4 w-4 mr-1" />
                  선택
                </Button>
              )}
              <CreateBuildingDialog />
            </>
          )}
        </div>
      </div>

      <Tabs value={statusFilter || "ALL"} onValueChange={handleTabChange}>
        <TabsList>
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
          <p className="mt-1 text-sm text-muted-foreground">
            새 건물을 추가하여 실내 네비게이션을 시작하세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buildings.map((building) => (
            <div key={building.id} className="relative">
              {selectMode && (
                <div
                  className="absolute top-3 left-3 z-10"
                  onClick={(e) => { e.stopPropagation(); toggleSelect(building.id); }}
                >
                  <Checkbox
                    checked={selectedIds.has(building.id)}
                    onCheckedChange={() => toggleSelect(building.id)}
                    className="bg-background/80 backdrop-blur"
                  />
                </div>
              )}
              <div className={selectedIds.has(building.id) ? "ring-2 ring-destructive rounded-lg" : ""}>
                <BuildingCard
                  building={building}
                  onSelect={selectMode ? () => toggleSelect(building.id) : undefined}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
