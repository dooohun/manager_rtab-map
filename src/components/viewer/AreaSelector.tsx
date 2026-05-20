import { useViewerStore } from "@/stores";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export function AreaSelector() {
  const areas = useViewerStore((s) => s.areas);
  const selectedAreaId = useViewerStore((s) => s.selectedAreaId);
  const selectArea = useViewerStore((s) => s.selectArea);

  if (areas.length === 0) return null;

  const sortedAreas = [...areas].sort((a, b) => a.areaIndex - b.areaIndex);

  return (
    <Select value={selectedAreaId || ""} onValueChange={selectArea}>
      <SelectTrigger className="w-full h-8 text-xs bg-white text-black" aria-label="구역 선택">
        <SelectValue placeholder="구역 선택" />
      </SelectTrigger>
      <SelectContent className="bg-white text-black">
        {sortedAreas.map((area) => (
          <SelectItem key={area.areaId} value={area.areaId} className="text-xs">
            {area.label || `Area ${area.areaIndex}`}
            {area.isDefault && " (기본)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
