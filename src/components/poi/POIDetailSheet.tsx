import { MapPin, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePoiStore } from "@/stores";
import type { PoiCategory } from "@/types";

const POI_CATEGORY_LABELS: Record<PoiCategory, string> = {
  CLASSROOM: "강의실",
  OFFICE: "사무실",
  RESTROOM: "화장실",
  EXIT: "출구",
  ELEVATOR: "엘리베이터",
  STAIRCASE: "계단",
  OTHER: "기타",
};

interface POIDetailSheetProps {
  poiId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function POIDetailSheet({ poiId, open, onOpenChange }: POIDetailSheetProps) {
  const pois = usePoiStore((s) => s.pois);
  const deletePoi = usePoiStore((s) => s.deletePoi);

  const poi = pois.find((p) => p.nodeId === poiId) ?? null;

  async function handleDelete() {
    if (!poiId) return;
    await deletePoi(poiId);
    onOpenChange(false);
  }

  function formatPoint(x: number, y: number, z: number): string {
    return `(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`;
  }

  if (!poi) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            POI 상세
          </SheetTitle>
          <SheetDescription>POI 정보를 확인합니다.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">이름</span>
              <span className="text-sm font-medium">{poi.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">카테고리</span>
              <Badge variant="outline">{POI_CATEGORY_LABELS[poi.category]}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">층</span>
              <span className="text-sm">
                {poi.floorLevel}층 ({poi.floorName})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">좌표</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {formatPoint(poi.x, poi.y, poi.z)}
              </code>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex-1">
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>POI 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{poi.name}" POI를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
