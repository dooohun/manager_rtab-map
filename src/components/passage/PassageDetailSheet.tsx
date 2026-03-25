import { useEffect } from "react";
import { Footprints, ArrowUpDown, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePassageStore } from "@/stores";

interface PassageDetailSheetProps {
  passageId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PassageDetailSheet({ passageId, open, onOpenChange }: PassageDetailSheetProps) {
  const { currentPassage, isLoading, fetchPassageDetail, clearCurrentPassage } = usePassageStore();

  useEffect(() => {
    if (passageId && open) {
      fetchPassageDetail(passageId);
    }
    return () => clearCurrentPassage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageId, open]);

  const typeLabel = {
    STAIRCASE: "계단",
    ELEVATOR: "엘리베이터",
  } as const;

  function formatPoint(point: { x: number; y: number; z: number }): string {
    return `(${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {currentPassage?.type === "STAIRCASE" ? (
              <Footprints className="h-5 w-5" />
            ) : (
              <ArrowUpDown className="h-5 w-5" />
            )}
            수직 통로 상세
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : currentPassage ? (
          <div className="space-y-6 mt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">타입</span>
                <Badge variant="outline">
                  {typeLabel[currentPassage.type]}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">출발 층</span>
                <span className="text-sm font-medium">
                  {currentPassage.fromFloorLevel > 0
                    ? `${currentPassage.fromFloorLevel}F`
                    : `B${Math.abs(currentPassage.fromFloorLevel)}F`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">도착 층</span>
                <span className="text-sm font-medium">
                  {currentPassage.toFloorLevel > 0
                    ? `${currentPassage.toFloorLevel}F`
                    : `B${Math.abs(currentPassage.toFloorLevel)}F`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">진입점</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {formatPoint(currentPassage.entryPoint)}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">출구점</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {formatPoint(currentPassage.exitPoint)}
                </code>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold">
                세그먼트 ({currentPassage.segments.length}개)
              </h4>

              {currentPassage.segments.length === 0 ? (
                <p className="text-sm text-muted-foreground">세그먼트가 없습니다.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">#</TableHead>
                        <TableHead>시작점</TableHead>
                        <TableHead>끝점</TableHead>
                        <TableHead className="w-[80px]">길이</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentPassage.segments
                        .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                        .map((segment) => (
                          <TableRow key={segment.sequenceOrder}>
                            <TableCell className="font-mono text-xs">{segment.sequenceOrder}</TableCell>
                            <TableCell>
                              <code className="text-xs">{formatPoint(segment.startPoint)}</code>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs">{formatPoint(segment.endPoint)}</code>
                            </TableCell>
                            <TableCell className="text-xs">{segment.length.toFixed(2)}m</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
