import { Orbit, Scan, Eye, MapPin, Layers, Plus, X, Maximize2, Minimize2, Box, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useViewerStore, usePoiStore, useGraphEditorStore } from "@/stores";
import { FloorSelector } from "./FloorSelector";
import { GraphEditorControls } from "./GraphEditorControls";

interface ViewerControlsProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  variant?: "card" | "inline";
}

export function ViewerControls({ isFullscreen = false, onToggleFullscreen, variant = "card" }: ViewerControlsProps) {
  const showPOI = useViewerStore((s) => s.showPOI);
  const setShowPOI = useViewerStore((s) => s.setShowPOI);
  const viewMode = useViewerStore((s) => s.viewMode);
  const setViewMode = useViewerStore((s) => s.setViewMode);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const building = useViewerStore((s) => s.building);
  const showPointcloud = useViewerStore((s) => s.showPointcloud);
  const setShowPointcloud = useViewerStore((s) => s.setShowPointcloud);
  const pointSize = useViewerStore((s) => s.pointSize);
  const setPointSize = useViewerStore((s) => s.setPointSize);
  const pois = usePoiStore((s) => s.pois);
  const isPlacementMode = usePoiStore((s) => s.isPlacementMode);
  const setPlacementMode = usePoiStore((s) => s.setPlacementMode);
  const cancelPlacement = usePoiStore((s) => s.cancelPlacement);
  const isEditorActive = useGraphEditorStore((s) => s.isEditorActive);
  const setEditorActive = useGraphEditorStore((s) => s.setEditorActive);

  const selectedFloor = building?.floors.find((f) => f.id === selectedFloorId);
  const visiblePois = pois.filter((poi) => poi.floorLevel === selectedFloor?.level);

  const controls = (
    <div className="space-y-4">
      {/* Floor Selector */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Layers className="h-3.5 w-3.5" />
          층 선택
        </Label>
        <FloorSelector />
      </div>

      <Separator />

      {/* Visibility Toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="show-poi" className="flex items-center gap-2 text-xs">
            <MapPin className="h-3.5 w-3.5 text-amber-400" />
            POI 표시
          </Label>
          <Switch
            id="show-poi"
            checked={showPOI}
            onCheckedChange={(checked) => {
              setShowPOI(checked);
              if (!checked) cancelPlacement();
            }}
          />
        </div>

        {showPOI && (
          <div className="space-y-2 pl-5">
            <p className="text-[11px] text-muted-foreground">
              현재 층 POI: <span className="font-mono font-medium text-foreground">{visiblePois.length}개</span>
            </p>
            {isPlacementMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={cancelPlacement}
                >
                  <X className="mr-1 h-3 w-3" />
                  배치 취소
                </Button>
                <p className="text-[10px] text-amber-500">
                  포인트클라우드를 클릭하여 POI를 배치하세요
                </p>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setPlacementMode(true)}
              >
                <Plus className="mr-1 h-3 w-3" />
                POI 배치
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label htmlFor="show-pointcloud" className="flex items-center gap-2 text-xs">
            <Box className="h-3.5 w-3.5 text-emerald-400" />
            포인트클라우드
          </Label>
          <Switch
            id="show-pointcloud"
            checked={showPointcloud}
            onCheckedChange={setShowPointcloud}
          />
        </div>

        {showPointcloud && (
          <div className="space-y-1 pl-5">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-muted-foreground">점 크기</Label>
              <span className="text-[10px] font-mono text-muted-foreground">{pointSize.toFixed(2)}</span>
            </div>
            <Slider
              value={[pointSize]}
              onValueChange={([v]) => setPointSize(v)}
              min={0.01}
              max={0.2}
              step={0.005}
              className="w-full"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label htmlFor="graph-editor" className="flex items-center gap-2 text-xs">
            <Network className="h-3.5 w-3.5 text-violet-400" />
            그래프 에디터
          </Label>
          <Switch
            id="graph-editor"
            checked={isEditorActive}
            onCheckedChange={setEditorActive}
          />
        </div>
      </div>

      {/* Graph Editor Controls */}
      {isEditorActive && (
        <>
          <Separator />
          <GraphEditorControls />
        </>
      )}

      <Separator />

      {/* View Mode */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          뷰 모드
        </Label>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => {
            if (v) setViewMode(v as "orbit" | "top-down" | "first-person");
          }}
          className="w-full"
        >
          <ToggleGroupItem value="orbit" className="flex-1 text-xs gap-1">
            <Orbit className="h-3.5 w-3.5" />
            궤도
          </ToggleGroupItem>
          <ToggleGroupItem value="top-down" className="flex-1 text-xs gap-1">
            <Scan className="h-3.5 w-3.5" />
            탑뷰
          </ToggleGroupItem>
          <ToggleGroupItem value="first-person" className="flex-1 text-xs gap-1">
            <Eye className="h-3.5 w-3.5" />
            1인칭
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );

  if (variant === "inline") {
    return controls;
  }

  return (
    <Card className="w-72 shrink-0 overflow-y-auto">
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">뷰어 설정</CardTitle>
          {onToggleFullscreen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFullscreen}
              className="h-7 w-7 p-0"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {controls}
      </CardContent>
    </Card>
  );
}
