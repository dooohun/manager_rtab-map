import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Trash2,
  Loader2,
  FileUp,
  HardDrive,
  Merge,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useChunkStore } from "@/stores";
import type { ChunkResponse, MergedScanStatus } from "@/types";

interface ChunkManageSheetProps {
  floorId: string;
  floorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const MERGE_STATUS_CONFIG: Record<
  MergedScanStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }
> = {
  MERGING: { label: "병합 중", variant: "secondary", icon: Clock },
  MERGED: { label: "병합 완료", variant: "default", icon: CheckCircle2 },
  MERGE_FAILED: { label: "병합 실패", variant: "destructive", icon: XCircle },
  EXTRACTING: { label: "추출 중", variant: "secondary", icon: Clock },
  PROCESSING: { label: "처리 중", variant: "secondary", icon: Clock },
  COMPLETED: { label: "처리 완료", variant: "default", icon: CheckCircle2 },
  FAILED: { label: "처리 실패", variant: "destructive", icon: XCircle },
};

export function ChunkManageSheet({
  floorId,
  floorName,
  open,
  onOpenChange,
}: ChunkManageSheetProps) {
  const {
    chunks,
    isLoading,
    isUploading,
    mergeStatuses,
    isMerging,
    fetchChunks,
    uploadChunk,
    deleteChunk,
    mergeChunks,
    fetchMergeStatus,
    resetSheet,
  } = useChunkStore();

  const mergeStatus = mergeStatuses[floorId] ?? null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChunkResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && floorId) {
      fetchChunks(floorId);
      fetchMergeStatus(floorId);
    }
    return () => {
      resetSheet();
      setSelectedIds(new Set());
    };
  }, [open, floorId]);

  // Poll merge status while MERGING
  useEffect(() => {
    if (!open || mergeStatus?.status !== "MERGING") return;

    const interval = setInterval(() => fetchMergeStatus(floorId), 5000);
    return () => clearInterval(interval);
  }, [open, mergeStatus?.status, floorId]);

  function toggleSelect(chunkId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(chunkId)) {
        next.delete(chunkId);
      } else {
        next.add(chunkId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    const uploadedChunks = chunks.filter((c) => c.status === "UPLOADED");
    if (selectedIds.size === uploadedChunks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(uploadedChunks.map((c) => c.id)));
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".db")) return;

    await uploadChunk(floorId, file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteChunk(floorId, deleteTarget.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
    } catch {
      // Error handled by interceptor
    }
    setDeleteTarget(null);
  }

  async function handleMerge() {
    if (selectedIds.size === 0) return;
    await mergeChunks(floorId, Array.from(selectedIds));
    setSelectedIds(new Set());
  }

  const sortedChunks = [...chunks].sort(
    (a, b) => a.uploadOrder - b.uploadOrder,
  );
  const uploadedChunks = chunks.filter((c) => c.status === "UPLOADED");
  const allSelected =
    uploadedChunks.length > 0 && selectedIds.size === uploadedChunks.length;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              DB 관리 - {floorName}
            </SheetTitle>
            <SheetDescription>
              RTAB-Map 스캔 데이터(.db)를 업로드하고 병합합니다.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            {/* Upload */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".db"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1"
                variant="outline"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    .db 파일 업로드
                  </>
                )}
              </Button>
              <Button
                onClick={handleMerge}
                disabled={selectedIds.size === 0 || isMerging}
              >
                {isMerging ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Merge className="mr-2 h-4 w-4" />
                )}
                병합 ({selectedIds.size})
              </Button>
            </div>

            {/* Merge Status */}
            {mergeStatus && <MergeStatusCard status={mergeStatus.status} updatedAt={mergeStatus.updatedAt} errorMessage={mergeStatus.errorMessage} />}

            {/* Chunk List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sortedChunks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileUp className="h-10 w-10 mb-2" />
                <p className="text-sm">업로드된 청크가 없습니다.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>파일명</TableHead>
                      <TableHead className="w-[70px]">크기</TableHead>
                      <TableHead className="w-[70px]">상태</TableHead>
                      <TableHead className="w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedChunks.map((chunk) => (
                      <TableRow
                        key={chunk.id}
                        data-state={selectedIds.has(chunk.id) ? "selected" : undefined}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(chunk.id)}
                            onCheckedChange={() => toggleSelect(chunk.id)}
                            disabled={chunk.status !== "UPLOADED"}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {chunk.uploadOrder}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm truncate max-w-[160px]">
                              {chunk.fileName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(chunk.createdAt)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatFileSize(chunk.fileSize)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              chunk.status === "UPLOADED"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {chunk.status === "UPLOADED" ? "완료" : "실패"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(chunk)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              총 {chunks.length}개 청크
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>청크 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.fileName}&rdquo; 파일을 삭제하시겠습니까?
              <br />
              서버 디스크의 파일도 함께 삭제되며, 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MergeStatusCard({
  status,
  updatedAt,
  errorMessage,
}: {
  status: MergedScanStatus;
  updatedAt: string;
  errorMessage: string | null;
}) {
  const config = MERGE_STATUS_CONFIG[status];
  const Icon = config.icon;
  const isInProgress = status === "MERGING" || status === "EXTRACTING" || status === "PROCESSING";

  return (
    <div className="rounded-lg border p-3 space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {isInProgress ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
          병합 상태
        </div>
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {formatDate(updatedAt)}
      </p>
      {errorMessage && (
        <>
          <Separator />
          <p className="text-xs text-destructive">{errorMessage}</p>
        </>
      )}
    </div>
  );
}
