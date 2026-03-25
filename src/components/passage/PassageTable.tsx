import { useState } from "react";
import { Footprints, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePassageStore } from "@/stores";
import type { VerticalPassageResponse, VerticalPassageType } from "@/types";
import { PassageDetailSheet } from "./PassageDetailSheet";

interface PassageTableProps {
  buildingId: string;
  passages: VerticalPassageResponse[];
}

export function PassageTable({ buildingId, passages }: PassageTableProps) {
  const { typeFilter, setTypeFilter, fetchPassages } = usePassageStore();
  const [selectedPassageId, setSelectedPassageId] = useState<string | null>(null);

  function handleTypeChange(value: string) {
    const type = value === "ALL" ? undefined : (value as VerticalPassageType);
    setTypeFilter(type);
    fetchPassages(buildingId, type);
  }

  const typeLabel: Record<VerticalPassageType, string> = {
    STAIRCASE: "계단",
    ELEVATOR: "엘리베이터",
  };

  function formatPoint(point: { x: number; y: number; z: number }): string {
    return `(${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          총 {passages.length}개 통로
        </p>
        <Select value={typeFilter || "ALL"} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[140px] sm:w-[180px]">
            <SelectValue placeholder="타입 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            <SelectItem value="STAIRCASE">계단</SelectItem>
            <SelectItem value="ELEVATOR">엘리베이터</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">타입</TableHead>
              <TableHead>출발 층</TableHead>
              <TableHead>도착 층</TableHead>
              <TableHead className="hidden sm:table-cell">진입점</TableHead>
              <TableHead className="hidden sm:table-cell">출구점</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {passages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  등록된 수직 통로가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              passages.map((passage) => (
                <TableRow
                  key={passage.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedPassageId(passage.id)}
                >
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      {passage.type === "STAIRCASE" ? (
                        <Footprints className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                      {typeLabel[passage.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {passage.fromFloorLevel > 0
                      ? `${passage.fromFloorLevel}F`
                      : `B${Math.abs(passage.fromFloorLevel)}F`}
                  </TableCell>
                  <TableCell>
                    {passage.toFloorLevel > 0
                      ? `${passage.toFloorLevel}F`
                      : `B${Math.abs(passage.toFloorLevel)}F`}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Tooltip>
                      <TooltipTrigger className="text-sm text-muted-foreground underline decoration-dotted">
                        좌표 보기
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono text-xs">{formatPoint(passage.entryPoint)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Tooltip>
                      <TooltipTrigger className="text-sm text-muted-foreground underline decoration-dotted">
                        좌표 보기
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono text-xs">{formatPoint(passage.exitPoint)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PassageDetailSheet
        passageId={selectedPassageId}
        open={!!selectedPassageId}
        onOpenChange={(open) => !open && setSelectedPassageId(null)}
      />
    </div>
  );
}
