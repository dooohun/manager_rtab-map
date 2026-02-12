import { useState } from "react";
import { MapPin, Search, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { usePoiStore } from "@/stores";
import type { PoiResponse, PoiCategory } from "@/types";

const POI_CATEGORY_LABELS: Record<PoiCategory, string> = {
  CLASSROOM: "강의실",
  OFFICE: "사무실",
  RESTROOM: "화장실",
  EXIT: "출구",
  ELEVATOR: "엘리베이터",
  STAIRCASE: "계단",
  OTHER: "기타",
};

const POI_CATEGORY_COLORS: Record<PoiCategory, "default" | "secondary" | "destructive" | "outline"> = {
  CLASSROOM: "default",
  OFFICE: "secondary",
  RESTROOM: "outline",
  EXIT: "destructive",
  ELEVATOR: "default",
  STAIRCASE: "default",
  OTHER: "outline",
};

interface POITableProps {
  buildingId: string;
}

export function POITable({ buildingId }: POITableProps) {
  const pois = usePoiStore((s) => s.pois);
  const searchPois = usePoiStore((s) => s.searchPois);
  const deletePoi = usePoiStore((s) => s.deletePoi);
  const [searchQuery, setSearchQuery] = useState("");

  async function handleSearch(query: string) {
    setSearchQuery(query);
    await searchPois(buildingId, query || undefined);
  }

  async function handleDelete(poi: PoiResponse) {
    await deletePoi(poi.nodeId);
  }

  function formatPoint(x: number, y: number, z: number): string {
    return `(${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="POI 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {pois.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <MapPin className="h-12 w-12 mb-4" />
          <p className="text-sm">등록된 POI가 없습니다.</p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>층</TableHead>
                <TableHead>좌표</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pois.map((poi) => (
                <TableRow key={poi.nodeId}>
                  <TableCell className="font-medium">{poi.name}</TableCell>
                  <TableCell>
                    <Badge variant={POI_CATEGORY_COLORS[poi.category]}>
                      {POI_CATEGORY_LABELS[poi.category]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {poi.floorLevel}층 ({poi.floorName})
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {formatPoint(poi.x, poi.y, poi.z)}
                    </code>
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
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
                          <AlertDialogAction onClick={() => handleDelete(poi)}>
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
