import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MergedScanStatus } from "@/types";

const STATUS_CONFIG: Record<MergedScanStatus, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  spinning?: boolean;
}> = {
  IDLE:         { label: "스캔 필요",      variant: "outline" },
  MERGING:      { label: "층 구성 중",    variant: "secondary",    spinning: true },
  MERGED:       { label: "층 구성됨",     variant: "outline" },
  MERGE_FAILED: { label: "층 구성 실패",   variant: "destructive" },
  EXTRACTING:   { label: "3D 변환 중",    variant: "secondary",    spinning: true },
  PROCESSING:   { label: "경로 생성 중",   variant: "secondary",    spinning: true },
  COMPLETED:    { label: "완료",          variant: "default" },
  FAILED:       { label: "처리 실패",      variant: "destructive" },
};

interface MergeBadgeProps {
  status: MergedScanStatus | undefined;
}

export function MergeBadge({ status }: MergeBadgeProps) {
  const config = status ? STATUS_CONFIG[status] : undefined;
  if (!config) {
    return (
      <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0">
        {status ?? "스캔 필요"}
      </Badge>
    );
  }

  return (
    <Badge variant={config.variant} className="gap-1 text-[10px] px-1.5 py-0">
      {config.spinning && <Loader2 className="h-3 w-3 animate-spin" />}
      {config.label}
    </Badge>
  );
}
