import { Orbit, Scan, Eye, Route, MapPin, Layers, Plus, X, Maximize2, Minimize2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useViewerStore, usePoiStore } from "@/stores";
import { FloorSelector } from "./FloorSelector";

interface ViewerControlsProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function ViewerControls({ isFullscreen = false, onToggleFullscreen }: ViewerControlsProps = {}) {
  const showPath = useViewerStore((s) => s.showPath);
  const setShowPath = useViewerStore((s) => s.setShowPath);
  const showPOI = useViewerStore((s) => s.showPOI);
  const setShowPOI = useViewerStore((s) => s.setShowPOI);
  const viewMode = useViewerStore((s) => s.viewMode);
  const setViewMode = useViewerStore((s) => s.setViewMode);
  const floorPath = useViewerStore((s) => s.floorPath);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const building = useViewerStore((s) => s.building);
  const pois = usePoiStore((s) => s.pois);
  const isPlacementMode = usePoiStore((s) => s.isPlacementMode);
  const setPlacementMode = usePoiStore((s) => s.setPlacementMode);
  const cancelPlacement = usePoiStore((s) => s.cancelPlacement);

  const selectedFloor = building?.floors.find((f) => f.id === selectedFloorId);
  const visiblePois = pois.filter((poi) => poi.floorLevel === selectedFloor?.level);

  return (
    <Card className="w-72 shrink-0">
      <CardHeader className="pb-3">
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
      <CardContent className="space-y-5">
        {/* Floor Selector */}
        <div className="space-y-2">
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
            <Label htmlFor="show-path" className="flex items-center gap-2 text-xs">
              <Route className="h-3.5 w-3.5 text-cyan-400" />
              경로 표시
            </Label>
            <Switch
              id="show-path"
              checked={showPath}
              onCheckedChange={setShowPath}
            />
          </div>

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
        </div>

        <Separator />

        {/* View Mode */}
        <div className="space-y-2">
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

        {/* Path Info */}
        {floorPath && floorPath.segments.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>총 거리: <span className="font-mono font-medium text-foreground">{floorPath.totalDistance.toFixed(2)}m</span></p>
              <p>세그먼트: <span className="font-mono font-medium text-foreground">{floorPath.segments.length}개</span></p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
