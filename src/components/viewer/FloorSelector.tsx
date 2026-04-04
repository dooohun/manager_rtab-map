import { useViewerStore } from "@/stores";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export function FloorSelector() {
  const floors = useViewerStore((s) => s.floors);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const loadFloorData = useViewerStore((s) => s.loadFloorData);

  const sortedFloors = [...floors].sort((a, b) => b.level - a.level);

  function formatLevel(level: number): string {
    return level > 0 ? `${level}F` : `B${Math.abs(level)}F`;
  }

  return (
    <Select value={selectedFloorId || ""} onValueChange={loadFloorData}>
      <SelectTrigger className="w-full h-8 text-xs bg-white text-black" aria-label="층 선택">
        <SelectValue placeholder="층 선택" />
      </SelectTrigger>
      <SelectContent className="bg-white text-black">
        {sortedFloors.map((floor) => (
          <SelectItem key={floor.id} value={floor.id} className="text-xs">
            {formatLevel(floor.level)} {floor.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
