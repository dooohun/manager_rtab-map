import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MergedScanStatus } from "@/types";

const LABEL: Record<MergedScanStatus, string> = {
  MERGING: "병합 중",
  MERGED: "병합됨",
  MERGE_FAILED: "병합 실패",
  EXTRACTING: "추출 중",
  PROCESSING: "처리 중",
  COMPLETED: "완료",
  FAILED: "실패",
};

const VARIANT: Record<MergedScanStatus, "default" | "secondary" | "destructive"> = {
  MERGING: "secondary",
  MERGED: "default",
  MERGE_FAILED: "destructive",
  EXTRACTING: "secondary",
  PROCESSING: "secondary",
  COMPLETED: "default",
  FAILED: "destructive",
};

interface MergeBadgeProps {
  status: MergedScanStatus | undefined;
}

export function MergeBadge({ status }: MergeBadgeProps) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        없음
      </Badge>
    );
  }

  const isInProgress = status === "MERGING" || status === "EXTRACTING" || status === "PROCESSING";

  return (
    <Badge variant={VARIANT[status]} className="gap-1">
      {isInProgress && <Loader2 className="h-3 w-3 animate-spin" />}
      {LABEL[status]}
    </Badge>
  );
}
