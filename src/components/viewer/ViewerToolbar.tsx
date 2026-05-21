import { useEffect, useState } from "react";
import {
  Orbit,
  Scan,
  Settings2,
  Hand,
  Plus,
  GitBranch,
  Trash2,
  RotateCcw,
  MapPin,
  X,
  HelpCircle,
  Link,
  Square,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateNode } from "@/api/graph";
import {
  useViewerStore,
  usePoiStore,
  useGraphEditorStore,
  usePolygonStore,
  useConnectorStore,
} from "@/stores";
import { FloorSelector } from "./FloorSelector";
import { AreaSelector } from "./AreaSelector";
import type { NodeType } from "@/types";

const PLACEABLE_TYPES: { value: NodeType; label: string }[] = [
  { value: "corridor", label: "복도" },
  { value: "junction", label: "교차" },
  { value: "endpoint", label: "끝점" },
  { value: "poi_attach", label: "POI 부착" },
];

export function ViewerToolbar() {
  const viewMode = useViewerStore((s) => s.viewMode);
  const setViewMode = useViewerStore((s) => s.setViewMode);
  const pointSize = useViewerStore((s) => s.pointSize);
  const setPointSize = useViewerStore((s) => s.setPointSize);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const selectedAreaId = useViewerStore((s) => s.selectedAreaId);

  const isPlacementMode = usePoiStore((s) => s.isPlacementMode);
  const setPlacementMode = usePoiStore((s) => s.setPlacementMode);
  const cancelPlacement = usePoiStore((s) => s.cancelPlacement);

  const editorMode = useGraphEditorStore((s) => s.editorMode);
  const setEditorMode = useGraphEditorStore((s) => s.setEditorMode);
  const autoConnect = useGraphEditorStore((s) => s.autoConnect);
  const setAutoConnect = useGraphEditorStore((s) => s.setAutoConnect);
  const selectedNodeId = useGraphEditorStore((s) => s.selectedNodeId);
  const selectedEdgeId = useGraphEditorStore((s) => s.selectedEdgeId);
  const edgeSourceNodeId = useGraphEditorStore((s) => s.edgeSourceNodeId);
  const deleteSelected = useGraphEditorStore((s) => s.deleteSelected);
  const clearManualGraph = useGraphEditorStore((s) => s.clearManualGraph);
  const setEdgeSource = useGraphEditorStore((s) => s.setEdgeSource);

  const longPressNodeId = useGraphEditorStore((s) => s.longPressNodeId);
  const setLongPressNodeId = useGraphEditorStore((s) => s.setLongPressNodeId);
  const edgeWidthDialogId = useGraphEditorStore((s) => s.edgeWidthDialogId);
  const setEdgeWidthDialogId = useGraphEditorStore((s) => s.setEdgeWidthDialogId);
  const nodes = useGraphEditorStore((s) => s.nodes);
  const edges = useGraphEditorStore((s) => s.edges);
  const updateEdge = useGraphEditorStore((s) => s.updateEdge);
  const fetchGraph = useGraphEditorStore((s) => s.fetchGraph);

  const nodeTypeToPlace = useGraphEditorStore((s) => s.nodeTypeToPlace);
  const setNodeTypeToPlace = useGraphEditorStore((s) => s.setNodeTypeToPlace);
  const draftVertices = usePolygonStore((s) => s.draftVertices);
  const commitDraftAsCorner = usePolygonStore((s) => s.commitDraftAsCorner);
  const clearDraft = usePolygonStore((s) => s.clearDraft);
  const popDraftVertex = usePolygonStore((s) => s.popDraftVertex);
  const selectedPolygonId = usePolygonStore((s) => s.selectedPolygonId);
  const selectPolygon = usePolygonStore((s) => s.selectPolygon);
  const deletePolygon = usePolygonStore((s) => s.deletePolygon);
  const verticalType = useConnectorStore((s) => s.verticalType);
  const verticalKey = useConnectorStore((s) => s.verticalKey);
  const setVerticalType = useConnectorStore((s) => s.setVerticalType);
  const setVerticalKey = useConnectorStore((s) => s.setVerticalKey);

  const [helpOpen, setHelpOpen] = useState(false);
  const [widthInput, setWidthInput] = useState("");
  const hasSelection = !!(selectedNodeId || selectedEdgeId || selectedPolygonId);
  const longPressNode = nodes.find((n) => n.nodeId === longPressNodeId);
  const widthDialogEdge = edges.find((e) => e.edgeId === edgeWidthDialogId);

  useEffect(() => {
    if (widthDialogEdge) {
      setWidthInput(widthDialogEdge.widthM != null ? String(widthDialogEdge.widthM) : "");
    }
  }, [widthDialogEdge?.edgeId]);

  async function handleChangeType(newType: NodeType) {
    if (!longPressNodeId || !selectedFloorId) return;
    try {
      await updateNode(longPressNodeId, { nodeType: newType });
      await fetchGraph(selectedFloorId, selectedAreaId ?? undefined);
      toast.success("노드 타입이 변경되었습니다.");
    } catch {
      /* interceptor */
    }
    setLongPressNodeId(null);
  }

  async function handleApplyWidth() {
    if (!edgeWidthDialogId) return;
    const trimmed = widthInput.trim();
    if (trimmed === "") {
      await updateEdge(edgeWidthDialogId, { clearWidth: true });
    } else {
      const value = Number(trimmed);
      if (!Number.isFinite(value) || value <= 0) {
        toast.error("0보다 큰 숫자를 입력하세요.");
        return;
      }
      await updateEdge(edgeWidthDialogId, { widthM: value });
    }
    setEdgeWidthDialogId(null);
  }

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-1.5 pointer-events-none">
        <div className="w-[120px] sm:w-[160px] pointer-events-auto">
          <FloorSelector />
        </div>
        <div className="w-[120px] sm:w-[160px] pointer-events-auto">
          <AreaSelector />
        </div>
        <div className="flex-1" />
        <div className="flex bg-background/90 backdrop-blur rounded-md border shadow-sm pointer-events-auto">
          <Button
            variant={viewMode === "orbit" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-r-none"
            aria-label="궤도 뷰"
            onClick={() => setViewMode("orbit")}
          >
            <Orbit className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "top-down" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-l-none"
            aria-label="탑뷰"
            onClick={() => setViewMode("top-down")}
          >
            <Scan className="h-4 w-4" />
          </Button>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 shadow-sm pointer-events-auto"
              aria-label="포인트 크기"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52" align="end">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">포인트 크기</Label>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {pointSize.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[pointSize]}
                onValueChange={([v]) => setPointSize(v)}
                min={0.01}
                max={0.2}
                step={0.005}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Left toolbar */}
      {selectedFloorId && (
        <div className="absolute top-14 left-2 z-10 flex flex-col gap-1">
          <div className="flex flex-col bg-background/90 backdrop-blur rounded-md border shadow-sm">
            <ToolIcon
              active={editorMode === "view"}
              onClick={() => setEditorMode("view")}
              aria-label="보기"
            >
              <Hand className="h-4 w-4" />
            </ToolIcon>
            <ToolIcon
              active={editorMode === "add-node"}
              onClick={() => setEditorMode("add-node")}
              aria-label="노드 추가"
            >
              <Plus className="h-4 w-4" />
            </ToolIcon>
            <ToolIcon
              active={editorMode === "add-edge"}
              onClick={() => setEditorMode("add-edge")}
              aria-label="엣지 추가"
            >
              <GitBranch className="h-4 w-4" />
            </ToolIcon>
            <ToolIcon
              active={isPlacementMode}
              onClick={() => (isPlacementMode ? cancelPlacement() : setPlacementMode(true))}
              aria-label="POI 배치"
            >
              {isPlacementMode ? <X className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            </ToolIcon>
            <ToolIcon
              active={editorMode === "add-corner"}
              onClick={() => setEditorMode("add-corner")}
              aria-label="코너"
            >
              <Square className="h-4 w-4" />
            </ToolIcon>
          </div>

          {/* Auto-connect — same width as toolbar, icon toggle */}
          {editorMode === "add-node" && (
            <ToolIcon
              active={autoConnect}
              onClick={() => setAutoConnect(!autoConnect)}
              aria-label="자동 연결"
            >
              <Link className="h-4 w-4" />
            </ToolIcon>
          )}

          {/* nodeType selector — add-node 모드에서만 표시 */}
          {editorMode === "add-node" && (
            <div className="flex flex-col bg-background/90 backdrop-blur rounded-md border shadow-sm mt-2 text-[10px]">
              {(["corridor", "junction", "endpoint", "poi_attach", "vertical"] as const).map(
                (nt) => (
                  <button
                    key={nt}
                    className={`w-9 h-7 transition-colors rounded-sm ${
                      nodeTypeToPlace === nt
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent text-muted-foreground"
                    }`}
                    onClick={() => setNodeTypeToPlace(nt)}
                    aria-label={nt}
                    title={nt}
                  >
                    {nt === "corridor" && "복도"}
                    {nt === "junction" && "교차"}
                    {nt === "endpoint" && "끝점"}
                    {nt === "poi_attach" && "POI"}
                    {nt === "vertical" && "↕"}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      )}

      {/* Help — bottom left floating */}
      <button
        className="absolute bottom-2 left-2 z-10 flex items-center justify-center h-7 w-7 rounded-full bg-background/70 backdrop-blur border text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setHelpOpen(true)}
        aria-label="도움말"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {/* Help dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-[420px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>3D 뷰어 사용법</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <HelpSection
              icon={<Hand className="h-4 w-4" />}
              title="보기 모드"
              items={[
                "드래그하여 카메라를 회전합니다.",
                "두 손가락 핀치 또는 스크롤로 줌인/줌아웃합니다.",
                "노드나 엣지를 탭하면 선택됩니다.",
                "선택된 노드는 드래그하여 위치를 이동할 수 있습니다.",
                "WASD 또는 방향키로 카메라를 이동합니다.",
                "노드 길게 누르면 타입(복도/교차/끝점/POI부착)을 바꿀 수 있습니다.",
              ]}
            />
            <HelpSection
              icon={<Plus className="h-4 w-4" />}
              title="노드 추가"
              items={[
                "포인트클라우드 위를 탭하면 경로 노드가 배치됩니다.",
                "자동 연결이 켜져 있으면 이전 노드와 자동으로 엣지가 생성됩니다.",
                "자동 연결 아이콘(🔗)을 탭하여 켜고 끌 수 있습니다.",
                "스페이스바를 누른 채 드래그하면 노드 배치 중에도 카메라를 움직일 수 있습니다.",
              ]}
            />
            <HelpSection
              icon={<GitBranch className="h-4 w-4" />}
              title="엣지 추가"
              items={[
                "시작 노드를 탭한 후, 도착 노드를 탭하면 두 노드가 연결됩니다.",
                "Esc를 누르면 연결을 취소합니다.",
                "수직 연결(계단/엘리베이터)은 상단의 '수직연결' 탭에서 관리합니다.",
              ]}
            />
            <HelpSection
              icon={<MapPin className="h-4 w-4" />}
              title="POI 배치"
              items={[
                "기존 노드를 탭하면 해당 위치에 POI(관심지점)를 등록합니다.",
                "엣지 위를 탭하면 자동으로 노드가 생성되고 POI가 등록됩니다.",
                "POI는 강의실, 사무실, 화장실 등 장소 정보입니다.",
              ]}
            />
            <HelpSection
              icon={<Trash2 className="h-4 w-4" />}
              title="삭제 / 초기화"
              items={[
                "보기 모드에서 노드나 엣지를 탭하여 선택합니다.",
                "화면 하단에 나타나는 삭제 버튼을 탭합니다.",
                "우하단 '수동 편집 초기화' 버튼으로 사용자가 추가한 노드/엣지만 일괄 삭제할 수 있습니다.",
              ]}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Selection delete */}
      {hasSelection && (
        <div className="absolute bottom-26 left-1/2 -translate-x-1/2 z-10">
          <Button
            variant="destructive"
            size="sm"
            className="shadow-lg text-xs h-9 gap-1.5 px-4"
            onClick={async () => {
              if (selectedPolygonId) {
                if (window.confirm("선택한 폴리곤을 삭제하시겠습니까?")) {
                  await deletePolygon(selectedPolygonId);
                  selectPolygon(null);
                }
              } else {
                deleteSelected();
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {selectedPolygonId ? "폴리곤 삭제" : "선택 항목 삭제"}
          </Button>
        </div>
      )}

      {/* Corner draft hint (add-corner mode) */}
      {editorMode === "add-corner" && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-background/90 backdrop-blur border rounded-md shadow-lg px-3 py-1.5">
          <span className="text-xs text-muted-foreground">
            코너 vertex:{" "}
            <span className="font-mono font-medium text-foreground">{draftVertices.length}</span>
          </span>
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs gap-1"
            disabled={draftVertices.length < 3 || !selectedAreaId}
            onClick={() => selectedAreaId && commitDraftAsCorner(selectedAreaId)}
          >
            <Check className="h-3 w-3" /> 닫기
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={popDraftVertex}
            disabled={draftVertices.length === 0}
          >
            ↶
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={clearDraft}
            disabled={draftVertices.length === 0}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* nodeType=vertical 일 때 type+key 입력 (add-node 모드에서만) */}
      {editorMode === "add-node" && nodeTypeToPlace === "vertical" && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-background/90 backdrop-blur border rounded-md shadow-lg px-3 py-1.5">
          <span className="text-xs text-muted-foreground">type</span>
          <select
            className="h-7 text-xs bg-background border rounded px-1"
            value={verticalType}
            onChange={(e) => setVerticalType(e.target.value)}
          >
            <option value="STAIRCASE">계단</option>
            <option value="ELEVATOR">엘리베이터</option>
            <option value="ESCALATOR">에스컬레이터</option>
          </select>
          <span className="text-xs text-muted-foreground">key</span>
          <Input
            className="h-7 w-28 text-xs"
            value={verticalKey}
            onChange={(e) => setVerticalKey(e.target.value)}
            placeholder="stair-A"
          />
          <span className="text-[10px] text-muted-foreground">같은 key면 자동 묶임</span>
        </div>
      )}

      {/* Edge hint */}
      {editorMode === "add-edge" && edgeSourceNodeId && !hasSelection && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
          <Button
            variant="secondary"
            size="sm"
            className="shadow-lg text-xs h-7 gap-1"
            onClick={() => setEdgeSource(null)}
          >
            도착 노드 탭 · <span className="text-muted-foreground">Esc 취소</span>
          </Button>
        </div>
      )}

      {/* Clear manual graph */}
      {selectedAreaId && (
        <div className="absolute bottom-2 right-2 z-10">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (window.confirm("이 area의 수동 편집분을 모두 삭제하시겠습니까?"))
                clearManualGraph(selectedAreaId);
            }}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            수동 편집 초기화
          </Button>
        </div>
      )}

      {/* Node type change dialog (long press) */}
      <Dialog
        open={!!longPressNodeId}
        onOpenChange={(open) => {
          if (!open) setLongPressNodeId(null);
        }}
      >
        <DialogContent className="sm:max-w-[280px]">
          <DialogHeader>
            <DialogTitle className="text-sm">노드 타입 변경</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              현재:{" "}
              <span className="font-medium text-foreground">
                {longPressNode
                  ? (PLACEABLE_TYPES.find((t) => t.value === longPressNode.nodeType)?.label ??
                    longPressNode.nodeType)
                  : "-"}
              </span>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {PLACEABLE_TYPES.map((t) => (
                <Button
                  key={t.value}
                  variant={longPressNode?.nodeType === t.value ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => handleChangeType(t.value)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setLongPressNodeId(null)}
            >
              취소
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edge corridor width dialog (double click) */}
      <Dialog
        open={!!edgeWidthDialogId}
        onOpenChange={(open) => {
          if (!open) setEdgeWidthDialogId(null);
        }}
      >
        <DialogContent className="sm:max-w-[300px]">
          <DialogHeader>
            <DialogTitle className="text-sm">복도 폭 설정</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">
              엣지 ID: <code className="font-mono">{edgeWidthDialogId?.slice(0, 8)}…</code>
              {widthDialogEdge && (
                <>
                  {" · 길이: "}
                  <span className="font-mono text-foreground">
                    {widthDialogEdge.lengthM.toFixed(2)}m
                  </span>
                </>
              )}
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">폭 (m)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="예: 1.5"
                value={widthInput}
                onChange={(e) => setWidthInput(e.target.value)}
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground">빈 칸으로 두면 폭이 해제됩니다.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setEdgeWidthDialogId(null)}
              >
                취소
              </Button>
              <Button size="sm" className="flex-1 text-xs" onClick={handleApplyWidth}>
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ToolIcon({
  active,
  onClick,
  children,
  "aria-label": ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  "aria-label": string;
}) {
  return (
    <button
      className={`flex items-center justify-center w-9 h-9 transition-colors rounded-md ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-background/90 backdrop-blur border shadow-sm hover:bg-accent text-foreground"
      }`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

function HelpSection({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 font-medium">
        {icon}
        {title}
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground pl-6">
        {items.map((item, i) => (
          <li key={i} className="list-disc">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
