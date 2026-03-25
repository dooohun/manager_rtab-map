import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGraphEditorStore, useViewerStore } from "@/stores";
import type { NodeType } from "@/types";

export function PassageNodeDialog() {
  const pendingPassageInfo = useGraphEditorStore((s) => s.pendingPassageInfo);
  const confirmPassageConnection = useGraphEditorStore((s) => s.confirmPassageConnection);
  const setPendingPassageInfo = useGraphEditorStore((s) => s.setPendingPassageInfo);
  const createNode = useGraphEditorStore((s) => s.createNode);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const floors = useViewerStore((s) => s.floors);

  const [targetFloorId, setTargetFloorId] = useState<string>("");

  const isOpen = pendingPassageInfo !== null;
  const availableFloors = floors.filter((f) => f.id !== selectedFloorId);
  const sortedFloors = [...availableFloors].sort((a, b) => b.level - a.level);
  const passageTypeLabel = pendingPassageInfo?.passageType === "STAIRCASE" ? "계단" : "엘리베이터";

  function formatLevel(level: number): string {
    return level > 0 ? `${level}F` : `B${Math.abs(level)}F`;
  }

  function handleConfirm() {
    if (!selectedFloorId || !targetFloorId) return;
    confirmPassageConnection(selectedFloorId, targetFloorId);
    setTargetFloorId("");
  }

  function handleCreateStandalone() {
    if (!selectedFloorId || !pendingPassageInfo) return;

    const nodeType: NodeType = "PASSAGE_ENTRY";
    createNode(
      selectedFloorId,
      pendingPassageInfo.x,
      pendingPassageInfo.y,
      pendingPassageInfo.z,
      nodeType,
    );
    setPendingPassageInfo(null);
    setTargetFloorId("");
  }

  function handleCancel() {
    setPendingPassageInfo(null);
    setTargetFloorId("");
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>{passageTypeLabel} 노드 생성</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {sortedFloors.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">연결할 층 선택 (선택사항)</Label>
              <Select value={targetFloorId} onValueChange={setTargetFloorId}>
                <SelectTrigger>
                  <SelectValue placeholder="층을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {sortedFloors.map((floor) => (
                    <SelectItem key={floor.id} value={floor.id}>
                      {formatLevel(floor.level)} — {floor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {sortedFloors.length > 0
              ? "층을 선택하면 양쪽에 노드가 생성됩니다. 또는 먼저 노드만 생성하고 나중에 연결할 수 있습니다."
              : "다른 층이 없어도 노드를 먼저 생성할 수 있습니다. 나중에 층을 추가한 후 연결하세요."}
          </p>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {targetFloorId && (
            <Button size="sm" onClick={handleConfirm} className="w-full">
              층 연결 생성
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleCreateStandalone} className="w-full">
            연결 없이 노드만 생성
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel} className="w-full">
            취소
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
