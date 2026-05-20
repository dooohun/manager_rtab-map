import { MapPin, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
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

const POI_CATEGORY_LABELS: Record<string, string> = {
  classroom: "강의실",
  office: "사무실",
  restroom: "화장실",
  entrance: "출구/입구",
  exit: "출구",
  elevator: "엘리베이터",
  staircase: "계단",
  door: "문",
  other: "기타",
};

interface POIDetailSheetProps {
  poiId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function POIDetailSheet({ poiId, open, onOpenChange }: POIDetailSheetProps) {
  const pois = usePoiStore((s) => s.pois);
  const deletePoi = usePoiStore((s) => s.deletePoi);

  const poi = pois.find((p) => p.poiId === poiId) ?? null;

  async function handleDelete() {
    if (!poiId) return;
    await deletePoi(poiId);
    onOpenChange(false);
  }

  function formatPoint(p: { x: number; y: number; z: number } | null): string {
    if (!p) return "-";
    return `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`;
  }

  if (!poi) return null;

  const categoryLabel = POI_CATEGORY_LABELS[poi.category?.toLowerCase()] ?? poi.category;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            POI 상세
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">이름</span>
              <span className="text-sm font-medium">{poi.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">카테고리</span>
              <Badge variant="outline">{categoryLabel}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">라벨</span>
              <span className="text-sm">{poi.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">표시 좌표</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {formatPoint(poi.displayPoint)}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">연결된 노드</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {poi.routeNodeId ? `${poi.routeNodeId.slice(0, 8)}…` : "없음"}
              </code>
            </div>
            {poi.needsReview && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">검토 필요</span>
                <Badge variant="destructive">예</Badge>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" size="sm">
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
