import { useState } from "react";
import {
  Orbit, Scan, Settings2,
  Hand, Plus, GitBranch, Trash2, RotateCcw, MapPin, X, HelpCircle, Link,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { updateNode } from "@/api/graph";
import { useViewerStore, usePoiStore, useGraphEditorStore } from "@/stores";
import { FloorSelector } from "./FloorSelector";

export function ViewerToolbar() {
  const viewMode = useViewerStore((s) => s.viewMode);
  const setViewMode = useViewerStore((s) => s.setViewMode);
  const pointSize = useViewerStore((s) => s.pointSize);
  const setPointSize = useViewerStore((s) => s.setPointSize);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);

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
  const clearGraph = useGraphEditorStore((s) => s.clearGraph);
  const setEdgeSource = useGraphEditorStore((s) => s.setEdgeSource);

  const longPressNodeId = useGraphEditorStore((s) => s.longPressNodeId);
  const setLongPressNodeId = useGraphEditorStore((s) => s.setLongPressNodeId);
  const pendingPassageLink = useGraphEditorStore((s) => s.pendingPassageLink);
  const setPendingPassageLink = useGraphEditorStore((s) => s.setPendingPassageLink);
  const nodes = useGraphEditorStore((s) => s.nodes);
  const fetchGraph = useGraphEditorStore((s) => s.fetchGraph);

  const [helpOpen, setHelpOpen] = useState(false);
  const hasSelection = !!(selectedNodeId || selectedEdgeId);
  const longPressNode = nodes.find((n) => n.id === longPressNodeId);
  const isPassageType = longPressNode?.type === "PASSAGE_ENTRY" || longPressNode?.type === "PASSAGE_EXIT";

  async function handleToWaypoint() {
    if (!longPressNodeId || !selectedFloorId) return;
    try {
      await updateNode(longPressNodeId, { type: "WAYPOINT" });
      await fetchGraph(selectedFloorId);
      toast.success("일반 노드로 변경되었습니다.");
    } catch { /* interceptor */ }
    setLongPressNodeId(null);
  }

  function handleStartPassageLink() {
    if (!longPressNodeId || !selectedFloorId) return;
    setPendingPassageLink({ nodeId: longPressNodeId, floorId: selectedFloorId });
    setLongPressNodeId(null);
    toast("다른 층으로 이동 후 연결할 노드를 탭하세요.");
  }

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-1.5 pointer-events-none">
        <div className="w-[120px] sm:w-[160px] pointer-events-auto">
          <FloorSelector />
        </div>
        <div className="flex-1" />
        <div className="flex bg-background/90 backdrop-blur rounded-md border shadow-sm pointer-events-auto">
          <Button variant={viewMode === "orbit" ? "default" : "ghost"} size="icon" className="h-8 w-8 rounded-r-none" aria-label="궤도 뷰" onClick={() => setViewMode("orbit")}>
            <Orbit className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "top-down" ? "default" : "ghost"} size="icon" className="h-8 w-8 rounded-l-none" aria-label="탑뷰" onClick={() => setViewMode("top-down")}>
            <Scan className="h-4 w-4" />
          </Button>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="icon" className="h-8 w-8 shadow-sm pointer-events-auto" aria-label="포인트 크기">
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52" align="end">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">포인트 크기</Label>
                <span className="text-[10px] font-mono text-muted-foreground">{pointSize.toFixed(2)}</span>
              </div>
              <Slider value={[pointSize]} onValueChange={([v]) => setPointSize(v)} min={0.01} max={0.2} step={0.005} />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Left toolbar */}
      {selectedFloorId && (
        <div className="absolute top-14 left-2 z-10 flex flex-col gap-1">
          <div className="flex flex-col bg-background/90 backdrop-blur rounded-md border shadow-sm">
            <ToolIcon active={editorMode === "view"} onClick={() => setEditorMode("view")} aria-label="보기">
              <Hand className="h-4 w-4" />
            </ToolIcon>
            <ToolIcon active={editorMode === "add-node"} onClick={() => setEditorMode("add-node")} aria-label="노드 추가">
              <Plus className="h-4 w-4" />
            </ToolIcon>
            <ToolIcon active={editorMode === "add-edge"} onClick={() => setEditorMode("add-edge")} aria-label="엣지 추가">
              <GitBranch className="h-4 w-4" />
            </ToolIcon>
            <ToolIcon active={isPlacementMode} onClick={() => isPlacementMode ? cancelPlacement() : setPlacementMode(true)} aria-label="POI 배치">
              {isPlacementMode ? <X className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            </ToolIcon>
          </div>

          {/* Auto-connect — same width as toolbar, icon toggle */}
          {editorMode === "add-node" && (
            <ToolIcon active={autoConnect} onClick={() => setAutoConnect(!autoConnect)} aria-label="자동 연결">
              <Link className="h-4 w-4" />
            </ToolIcon>
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
                "엣지는 사용자가 이동할 수 있는 경로를 나타냅니다.",
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
              title="삭제"
              items={[
                "보기 모드에서 노드나 엣지를 탭하여 선택합니다.",
                "화면 하단에 나타나는 삭제 버튼을 탭합니다.",
                "우하단 '초기화' 버튼으로 해당 층의 모든 노드와 엣지를 삭제할 수 있습니다.",
              ]}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Selection delete */}
      {hasSelection && selectedFloorId && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
          <Button variant="destructive" size="sm" className="shadow-lg text-xs h-9 gap-1.5 px-4" onClick={() => deleteSelected(selectedFloorId)}>
            <Trash2 className="h-3.5 w-3.5" />
            선택 항목 삭제
          </Button>
        </div>
      )}

      {/* Edge hint */}
      {editorMode === "add-edge" && edgeSourceNodeId && !hasSelection && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
          <Button variant="secondary" size="sm" className="shadow-lg text-xs h-7 gap-1" onClick={() => setEdgeSource(null)}>
            도착 노드 탭 · <span className="text-muted-foreground">Esc 취소</span>
          </Button>
        </div>
      )}

      {/* Clear graph */}
      {selectedFloorId && (
        <div className="absolute bottom-2 right-2 z-10">
          <Button
            variant="ghost" size="sm"
            className="h-7 text-[10px] text-muted-foreground hover:text-destructive"
            onClick={() => { if (window.confirm("이 층의 모든 노드와 엣지를 삭제하시겠습니까?")) clearGraph(selectedFloorId); }}
          >
            <RotateCcw className="h-3 w-3 mr-1" />초기화
          </Button>
        </div>
      )}

      {/* Pending passage link hint */}
      {pendingPassageLink && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-2 bg-amber-500/90 text-white rounded-md px-3 py-1.5 shadow-lg">
            <span className="text-xs font-medium">다른 층에서 연결할 노드를 탭하세요</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-white hover:text-white hover:bg-white/20" onClick={() => setPendingPassageLink(null)}>
              취소
            </Button>
          </div>
        </div>
      )}

      {/* Node type change dialog (long press) */}
      <Dialog open={!!longPressNodeId} onOpenChange={(open) => { if (!open) setLongPressNodeId(null); }}>
        <DialogContent className="sm:max-w-[280px]">
          <DialogHeader>
            <DialogTitle className="text-sm">노드 설정</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              현재: <span className="font-medium text-foreground">{isPassageType ? "통로" : "일반"}</span>
            </p>
            {isPassageType ? (
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleToWaypoint}>
                일반 노드로 변경
              </Button>
            ) : (
              <Button size="sm" className="w-full text-xs" onClick={handleStartPassageLink}>
                통로 연결 시작
              </Button>
            )}
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setLongPressNodeId(null)}>
              취소
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ToolIcon({ active, onClick, children, "aria-label": ariaLabel }: {
  active: boolean; onClick: () => void; children: React.ReactNode; "aria-label": string;
}) {
  return (
    <button
      className={`flex items-center justify-center w-9 h-9 transition-colors rounded-md ${
        active ? "bg-primary text-primary-foreground" : "bg-background/90 backdrop-blur border shadow-sm hover:bg-accent text-foreground"
      }`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

function HelpSection({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 font-medium">
        {icon}
        {title}
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground pl-6">
        {items.map((item, i) => (
          <li key={i} className="list-disc">{item}</li>
        ))}
      </ul>
    </div>
  );
}
