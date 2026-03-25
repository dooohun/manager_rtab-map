import { MousePointer, Plus, GitBranch, Hand, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGraphEditorStore, useViewerStore } from "@/stores";
import type { EditorMode, PlaceableNodeType } from "@/stores/graph-editor-store";

const NODE_TYPE_LABELS: Record<string, string> = {
  WAYPOINT: "일반",
  JUNCTION: "분기점",
  POI: "POI",
  PASSAGE_ENTRY: "통행 진입",
  PASSAGE_EXIT: "통행 출구",
};

const EDGE_TYPE_LABELS: Record<string, string> = {
  HORIZONTAL: "수평",
  VERTICAL_STAIRCASE: "계단",
  VERTICAL_ELEVATOR: "엘리베이터",
};

export function GraphEditorControls() {
  const editorMode = useGraphEditorStore((s) => s.editorMode);
  const setEditorMode = useGraphEditorStore((s) => s.setEditorMode);
  const nodes = useGraphEditorStore((s) => s.nodes);
  const edges = useGraphEditorStore((s) => s.edges);
  const selectedNodeId = useGraphEditorStore((s) => s.selectedNodeId);
  const selectedEdgeId = useGraphEditorStore((s) => s.selectedEdgeId);
  const edgeSourceNodeId = useGraphEditorStore((s) => s.edgeSourceNodeId);
  const deleteSelected = useGraphEditorStore((s) => s.deleteSelected);
  const clearGraph = useGraphEditorStore((s) => s.clearGraph);
  const setEdgeSource = useGraphEditorStore((s) => s.setEdgeSource);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const nodeTypeToPlace = useGraphEditorStore((s) => s.nodeTypeToPlace);
  const setNodeTypeToPlace = useGraphEditorStore((s) => s.setNodeTypeToPlace);
  const autoConnect = useGraphEditorStore((s) => s.autoConnect);
  const setAutoConnect = useGraphEditorStore((s) => s.setAutoConnect);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  return (
    <div className="space-y-3">
      {/* Editor Mode */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">편집 모드</Label>
        <ToggleGroup
          type="single"
          value={editorMode}
          onValueChange={(v) => {
            if (v) setEditorMode(v as EditorMode);
          }}
          className="w-full flex-wrap"
        >
          <ToggleGroupItem value="view" className="flex-1 text-xs gap-1">
            <Hand className="h-3.5 w-3.5" />
            보기
          </ToggleGroupItem>
          <ToggleGroupItem value="add-node" className="flex-1 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />
            노드
          </ToggleGroupItem>
          <ToggleGroupItem value="add-edge" className="flex-1 text-xs gap-1">
            <GitBranch className="h-3.5 w-3.5" />
            엣지
          </ToggleGroupItem>
          <ToggleGroupItem value="select" className="flex-1 text-xs gap-1">
            <MousePointer className="h-3.5 w-3.5" />
            선택
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Node Type Selector (add-node mode only) */}
      {editorMode === "add-node" && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">노드 타입</Label>
          <ToggleGroup
            type="single"
            value={nodeTypeToPlace}
            onValueChange={(v) => {
              if (v) setNodeTypeToPlace(v as PlaceableNodeType);
            }}
            className="w-full"
          >
            <ToggleGroupItem value="WAYPOINT" className="flex-1 text-xs">
              일반
            </ToggleGroupItem>
            <ToggleGroupItem value="STAIRCASE" className="flex-1 text-xs">
              계단
            </ToggleGroupItem>
            <ToggleGroupItem value="ELEVATOR" className="flex-1 text-xs">
              E/V
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {/* Auto Connect (add-node mode only) */}
      {editorMode === "add-node" && (
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-connect" className="text-xs">
            자동 연결 (연속 배치)
          </Label>
          <Switch
            id="auto-connect"
            checked={autoConnect}
            onCheckedChange={setAutoConnect}
          />
        </div>
      )}

      {/* Mode Hint */}
      <p className="text-[10px] text-muted-foreground">
        {editorMode === "add-node" && autoConnect && "클릭할 때마다 이전 노드와 자동 연결됩니다"}
        {editorMode === "add-node" && !autoConnect && "클릭하여 독립 노드를 배치합니다"}
        {editorMode === "add-node" && (nodeTypeToPlace === "STAIRCASE" || nodeTypeToPlace === "ELEVATOR") && " (연결할 층 선택)"}
        {editorMode === "add-edge" &&
          (edgeSourceNodeId
            ? "도착 노드를 클릭하세요"
            : "시작 노드를 클릭하세요")}
        {editorMode === "select" && "노드 또는 엣지를 클릭하여 선택하세요"}
      </p>

      {/* Edge source cancel */}
      {editorMode === "add-edge" && edgeSourceNodeId && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => setEdgeSource(null)}
        >
          엣지 연결 취소 (Esc)
        </Button>
      )}

      {/* Stats */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          노드: <span className="font-mono font-medium text-foreground">{nodes.length}개</span>
        </p>
        <p>
          엣지: <span className="font-mono font-medium text-foreground">{edges.length}개</span>
        </p>
      </div>

      {/* Selected Info */}
      {selectedNode && (
        <>
          <Separator />
          <div className="space-y-1 text-xs">
            <p className="font-medium">선택된 노드</p>
            <p className="text-muted-foreground">
              타입: <span className="text-foreground">{NODE_TYPE_LABELS[selectedNode.type] ?? selectedNode.type}</span>
            </p>
            <p className="text-muted-foreground font-mono">
              ({selectedNode.x.toFixed(2)}, {selectedNode.y.toFixed(2)}, {selectedNode.z.toFixed(2)})
            </p>
            {selectedNode.poiName && (
              <p className="text-muted-foreground">
                POI: <span className="text-foreground">{selectedNode.poiName}</span>
              </p>
            )}
          </div>
        </>
      )}

      {selectedEdge && (
        <>
          <Separator />
          <div className="space-y-1 text-xs">
            <p className="font-medium">선택된 엣지</p>
            <p className="text-muted-foreground">
              거리: <span className="font-mono text-foreground">{selectedEdge.distance.toFixed(2)}m</span>
            </p>
            <p className="text-muted-foreground">
              타입: <span className="text-foreground">{EDGE_TYPE_LABELS[selectedEdge.edgeType] ?? selectedEdge.edgeType}</span>
            </p>
            <p className="text-muted-foreground">
              양방향: <span className="text-foreground">{selectedEdge.isBidirectional ? "예" : "아니오"}</span>
            </p>
          </div>
        </>
      )}

      {/* Actions */}
      {(selectedNodeId || selectedEdgeId) && selectedFloorId && (
        <>
          <Separator />
          <Button
            variant="destructive"
            size="sm"
            className="w-full text-xs"
            onClick={() => deleteSelected(selectedFloorId)}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            선택 항목 삭제 (Del)
          </Button>
        </>
      )}

      <Separator />
      {selectedFloorId && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs text-destructive hover:text-destructive"
          onClick={() => {
            if (window.confirm("이 층의 모든 노드와 엣지를 삭제하시겠습니까?")) {
              clearGraph(selectedFloorId);
            }
          }}
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          그래프 초기화
        </Button>
      )}

      {/* Keyboard Shortcuts */}
      <Separator />
      <div className="space-y-1">
        <Label className="text-[10px] font-medium text-muted-foreground">단축키</Label>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
          <span><kbd className="bg-muted px-1 rounded text-[9px]">1</kbd> 보기</span>
          <span><kbd className="bg-muted px-1 rounded text-[9px]">2</kbd> 노드(일반)</span>
          <span><kbd className="bg-muted px-1 rounded text-[9px]">3</kbd> 엣지</span>
          <span><kbd className="bg-muted px-1 rounded text-[9px]">4</kbd> 선택</span>
          <span><kbd className="bg-muted px-1 rounded text-[9px]">5</kbd> 계단</span>
          <span><kbd className="bg-muted px-1 rounded text-[9px]">6</kbd> E/V</span>
          <span><kbd className="bg-muted px-1 rounded text-[9px]">Del</kbd> 삭제</span>
          <span><kbd className="bg-muted px-1 rounded text-[9px]">Esc</kbd> 취소</span>
        </div>
      </div>
    </div>
  );
}
