import { useNavigate } from "react-router-dom";
import { Building2, Layers, ArrowUpDown } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "./StatusBadge";
import type { BuildingResponse } from "@/types";

interface BuildingCardProps {
  building: BuildingResponse;
  onSelect?: () => void;
}

export function BuildingCard({ building, onSelect }: BuildingCardProps) {
  const navigate = useNavigate();

  function handleClick() {
    if (onSelect) {
      onSelect();
    } else {
      navigate(`/buildings/${building.id}`);
    }
  }

  return (
    <Card
      className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20"
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{building.name}</CardTitle>
            </div>
          </div>
          <StatusBadge status={building.status} />
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <CardDescription className="line-clamp-2 min-h-10">
          {building.description || "설명이 없습니다."}
        </CardDescription>
      </CardContent>

      <Separator />

      <CardFooter className="pt-3 pb-3">
        <div className="flex w-full items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            <span>{building.floorCount}개 층</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>{building.passageCount}개 통로</span>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {new Date(building.updatedAt).toLocaleDateString("ko-KR")}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
