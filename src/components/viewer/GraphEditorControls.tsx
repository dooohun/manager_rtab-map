import { useState } from "react";
import { MousePointer, Plus, GitBranch, Hand, Trash2, RotateCcw, Square, MoveVertical, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGraphEditorStore, useViewerStore, usePolygonStore, useConnectorStore, useBuildingStore } from "@/stores";
import type { EditorMode, PlaceableNodeType } from "@/stores/graph-editor-store";
import { NewConnectorDialog } from "./NewConnectorDialog";

const NODE_TYPE_LABELS: Record<string, string> = {
  corridor: "복도",
  junction: "교차",
  endpoint: "끝점",
  poi: "POI",
  poi_attach: "POI 부착",
};

const EDGE_TYPE_LABELS: Record<string, string> = {
  rtabmap_link: "자동",
  poi_spur: "POI 가지",
  vertical_connector: "수직",
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
  const clearManualGraph = useGraphEditorStore((s) => s.clearManualGraph);
  const setEdgeSource = useGraphEditorStore((s) => s.setEdgeSource);
  const selectedAreaId = useViewerStore((s) => s.selectedAreaId);
  const nodeTypeToPlace = useGraphEditorStore((s) => s.nodeTypeToPlace);
  const setNodeTypeToPlace = useGraphEditorStore((s) => s.setNodeTypeToPlace);
  const autoConnect = useGraphEditorStore((s) => s.autoConnect);
  const setAutoConnect = useGraphEditorStore((s) => s.setAutoConnect);
  const draftVertices = usePolygonStore((s) => s.draftVertices);
  const commitDraftAsCorner = usePolygonStore((s) => s.commitDraftAsCorner);
  const clearDraft = usePolygonStore((s) => s.clearDraft);
  const popDraftVertex = usePolygonStore((s) => s.popDraftVertex);
  const activeConnectorId = useConnectorStore((s) => s.activeConnectorId);
  const activeConnectorType = useConnectorStore((s) => s.activeConnectorType);
  const finishActiveConnector = useConnectorStore((s) => s.finishActiveConnector);
  const activeConnector = useConnectorStore((s) =>
    s.connectors.find((c) => c.connectorId === s.activeConnectorId),
  );
  const selectedBuildingId = useBuildingStore((s) => s.currentBuilding?.buildingId ?? null);
  const [connectorDialogOpen, setConnectorDialogOpen] = useState(false);

  const selectedNode = nodes.find((n) => n.nodeId === selectedNodeId);
  const selectedEdge = edges.find((e) => e.edgeId === selectedEdgeId);

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
          <ToggleGroupItem value="add-corner" className="flex-1 text-xs gap-1">
            <Square className="h-3.5 w-3.5" />
            코너
          </ToggleGroupItem>
          <ToggleGroupItem value="add-vertical-stop" className="flex-1 text-xs gap-1">
            <MoveVertical className="h-3.5 w-3.5" />
            층간
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Corner draft panel */}
      {editorMode === "add-corner" && (
        <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
          <p className="text-[11px] text-muted-foreground">
            클릭으로 코너 vertex 누적: <span className="font-mono font-medium text-foreground">{draftVertices.length}</span>
          </p>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="default"
              className="flex-1 text-xs"
              disabled={draftVertices.length < 3 || !selectedAreaId}
              onClick={() => selectedAreaId && commitDraftAsCorner(selectedAreaId)}
            >
              <Check className="mr-1 h-3 w-3" />
              닫기 / 저장
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={popDraftVertex} disabled={draftVertices.length === 0}>
              ↶
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={clearDraft} disabled={draftVertices.length === 0}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Vertical connector progress panel */}
      {editorMode === "add-vertical-stop" && (
        <div className="space-y-2 rounded-md border border-indigo-500/30 bg-indigo-500/5 p-2">
          {activeConnectorId && activeConnector ? (
            <>
              <p className="text-[11px] text-muted-foreground">
                활성 connector: <span className="font-mono font-medium text-foreground">{activeConnector.connectorKey}</span>
                <span className="ml-1 text-[10px] text-muted-foreground">({activeConnectorType})</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                stops <span className="font-mono font-medium text-foreground">{activeConnector.stops.length}</span> / 층 전환 후 클릭으로 추가
              </p>
              <Button size="sm" variant="outline" className="w-full text-xs" onClick={finishActiveConnector}>
                <Check className="mr-1 h-3 w-3" />
                완료
              </Button>
            </>
          ) : (
            <>
              <p className="text-[11px] text-muted-foreground">connector를 먼저 생성하세요</p>
              <Button
                size="sm"
                variant="default"
                className="w-full text-xs"
                onClick={() => setConnectorDialogOpen(true)}
                disabled={!selectedBuildingId}
              >
                <Plus className="mr-1 h-3 w-3" />
                새 connector
              </Button>
            </>
          )}
        </div>
      )}

      {selectedBuildingId && (
        <NewConnectorDialog
          open={connectorDialogOpen}
          onOpenChange={setConnectorDialogOpen}
          buildingId={selectedBuildingId}
        />
      )}

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
            className="w-full flex-wrap"
          >
            <ToggleGroupItem value="corridor" className="flex-1 text-xs">복도</ToggleGroupItem>
            <ToggleGroupItem value="junction" className="flex-1 text-xs">교차</ToggleGroupItem>
            <ToggleGroupItem value="endpoint" className="flex-1 text-xs">끝점</ToggleGroupItem>
            <ToggleGroupItem value="poi_attach" className="flex-1 text-xs">POI 부착</ToggleGroupItem>
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
              타입: <span className="text-foreground">{NODE_TYPE_LABELS[selectedNode.nodeType] ?? selectedNode.nodeType}</span>
            </p>
            <p className="text-muted-foreground font-mono">
              ({selectedNode.x.toFixed(2)}, {selectedNode.y.toFixed(2)}, {selectedNode.z.toFixed(2)})
            </p>
            {selectedNode.label && (
              <p className="text-muted-foreground">
                라벨: <span className="text-foreground">{selectedNode.label}</span>
              </p>
            )}
            <p className="text-muted-foreground">
              출처: <span className="text-foreground">{selectedNode.origin === "manual_edit" ? "수동" : "스캔"}</span>
            </p>
          </div>
        </>
      )}

      {selectedEdge && (
        <>
          <Separator />
          <div className="space-y-1 text-xs">
            <p className="font-medium">선택된 엣지</p>
            <p className="text-muted-foreground">
              거리: <span className="font-mono text-foreground">{selectedEdge.lengthM.toFixed(2)}m</span>
            </p>
            <p className="text-muted-foreground">
              타입: <span className="text-foreground">{EDGE_TYPE_LABELS[selectedEdge.edgeType] ?? selectedEdge.edgeType}</span>
            </p>
          </div>
        </>
      )}

      {/* Actions */}
      {(selectedNodeId || selectedEdgeId) && (
        <>
          <Separator />
          <Button
            variant="destructive"
            size="sm"
            className="w-full text-xs"
            onClick={() => deleteSelected()}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            선택 항목 삭제 (Del)
          </Button>
        </>
      )}

      <Separator />
      {selectedAreaId && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs text-destructive hover:text-destructive"
          onClick={() => {
            if (window.confirm("이 area의 수동 편집분(노드/엣지)을 모두 삭제하시겠습니까?")) {
              clearManualGraph(selectedAreaId);
            }
          }}
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          수동 편집 초기화
        </Button>
      )}

      {/* Keyboard Shortcuts */}
      <Separator />
      <div className="space-y-1">
        <Label className="text-[10px] font-medium text-muted-foreground">단축키</Label>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
          <span><kbd className="bg-muted px-1 rounded text-[9px]">1</kbd> 보기</span>
          <span><kbd className="bg-muted px-1 rounded text-[9px]">2</kbd> 노드</span>
          <span><kbd className="bg-muted px-1 rounded text-[9px]">3</kbd> 엣지</span>
          <span><kbd className="bg-muted px-1 rounded text-[9px]">4</kbd> 선택</span>
          <span><kbd className="bg-muted px-1 rounded text-[9px]">5</kbd> POI 배치</span>
          <span><kbd className="bg-muted px-1 rounded text-[9px]">Del</kbd> 삭제</span>
          <span><kbd className="bg-muted px-1 rounded text-[9px]">Esc</kbd> 취소</span>
        </div>
      </div>
    </div>
  );
}
