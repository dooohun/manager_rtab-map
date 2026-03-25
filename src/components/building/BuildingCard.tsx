import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, ArrowUpDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import type { BuildingResponse } from "@/types";

interface BuildingCardProps {
  building: BuildingResponse;
  onSelect?: () => void;
  onEdit?: () => void;
  onLongPress?: () => void;
}

export function BuildingCard({ building, onSelect, onEdit, onLongPress }: BuildingCardProps) {
  const navigate = useNavigate();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  function handleClick() {
    if (didLongPress.current) { didLongPress.current = false; return; }
    if (onSelect) onSelect();
    else navigate(`/buildings/${building.id}`);
  }

  function handlePointerDown() {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      if (onLongPress) onLongPress();
      else if (onEdit) onEdit();
    }, 500);
  }

  function handlePointerUp() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20 p-3"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-sm truncate">{building.name}</p>
        <StatusBadge status={building.status} />
      </div>
      <p className="text-xs text-muted-foreground truncate mt-1 min-h-[16px]">
        {building.description || "\u00A0"}
      </p>
      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{building.floorCount}층</span>
        <span className="flex items-center gap-1"><ArrowUpDown className="h-3 w-3" />{building.passageCount}통로</span>
        <span className="ml-auto">{new Date(building.updatedAt).toLocaleDateString("ko-KR")}</span>
      </div>
    </Card>
  );
}
