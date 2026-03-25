import { useEffect, useRef, useState } from "react";
import {
  Upload, Trash2, Loader2, FileUp, Merge,
  CheckCircle2, XCircle, Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
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
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

const MERGE_STATUS_CONFIG: Record<
  MergedScanStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }
> = {
  MERGING: { label: "층 구성 중", variant: "secondary", icon: Clock },
  MERGED: { label: "층 구성됨", variant: "default", icon: CheckCircle2 },
  MERGE_FAILED: { label: "층 구성 실패", variant: "destructive", icon: XCircle },
  EXTRACTING: { label: "3D 변환 중", variant: "secondary", icon: Clock },
  PROCESSING: { label: "경로 생성 중", variant: "secondary", icon: Clock },
  COMPLETED: { label: "완료", variant: "default", icon: CheckCircle2 },
  FAILED: { label: "처리 실패", variant: "destructive", icon: XCircle },
};

export function ChunkManageSheet({ floorId, floorName, open, onOpenChange }: ChunkManageSheetProps) {
  const {
    chunks, isLoading, isUploading, mergeStatuses, isMerging,
    fetchChunks, uploadChunk, deleteChunk, mergeChunks, fetchMergeStatus, resetSheet,
  } = useChunkStore();

  const mergeStatus = mergeStatuses[floorId] ?? null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChunkResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && floorId) { fetchChunks(floorId); fetchMergeStatus(floorId); }
    return () => { resetSheet(); setSelectedIds(new Set()); };
  }, [open, floorId]);

  useEffect(() => {
    if (!open || mergeStatus?.status !== "MERGING") return;
    const interval = setInterval(() => fetchMergeStatus(floorId), 5000);
    return () => clearInterval(interval);
  }, [open, mergeStatus?.status, floorId]);

  function toggleSelect(chunkId: string) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(chunkId)) next.delete(chunkId); else next.add(chunkId); return next; });
  }

  function toggleSelectAll() {
    const uploaded = chunks.filter((c) => c.status === "UPLOADED");
    setSelectedIds(selectedIds.size === uploaded.length ? new Set() : new Set(uploaded.map((c) => c.id)));
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.name.endsWith(".db")) return;
    await uploadChunk(floorId, file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteChunk(floorId, deleteTarget.id);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(deleteTarget.id); return next; });
    } catch { /* interceptor */ }
    setDeleteTarget(null);
  }

  async function handleMerge() {
    if (selectedIds.size === 0) return;
    await mergeChunks(floorId, Array.from(selectedIds));
    setSelectedIds(new Set());
  }

  const sortedChunks = [...chunks].sort((a, b) => a.uploadOrder - b.uploadOrder);
  const uploadedChunks = chunks.filter((c) => c.status === "UPLOADED");
  const allSelected = uploadedChunks.length > 0 && selectedIds.size === uploadedChunks.length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>스캔파일 관리 - {floorName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Step indicator */}
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className={sortedChunks.length > 0 ? "text-primary font-medium" : ""}>1. 스캔파일 추가</span>
              <span>→</span>
              <span className={mergeStatus && ["MERGED","MERGING"].includes(mergeStatus.status) ? "text-primary font-medium" : ""}>2. 층 구성</span>
              <span>→</span>
              <span className={mergeStatus?.status === "COMPLETED" ? "text-primary font-medium" : ""}>3. 완료</span>
            </div>

            {/* Upload + Build */}
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".db" className="hidden" onChange={handleFileSelect} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex-1" variant="outline" size="sm">
                {isUploading ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />업로드 중...</> : <><Upload className="mr-1.5 h-3.5 w-3.5" />스캔파일 추가</>}
              </Button>
              <Button onClick={handleMerge} disabled={selectedIds.size === 0 || isMerging} size="sm">
                {isMerging ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Merge className="mr-1.5 h-3.5 w-3.5" />}
                층 구성 ({selectedIds.size})
              </Button>
            </div>

            {/* Merge Status */}
            {mergeStatus && <MergeStatusCard status={mergeStatus.status} updatedAt={mergeStatus.updatedAt} errorMessage={mergeStatus.errorMessage} />}

            {/* Chunk List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sortedChunks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileUp className="h-8 w-8 mb-2" />
                <p className="text-xs">스캔파일을 추가하세요.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[36px]"><Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} /></TableHead>
                      <TableHead>파일명</TableHead>
                      <TableHead className="w-[60px]">크기</TableHead>
                      <TableHead className="w-[36px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedChunks.map((chunk) => (
                      <TableRow key={chunk.id} data-state={selectedIds.has(chunk.id) ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox checked={selectedIds.has(chunk.id)} onCheckedChange={() => toggleSelect(chunk.id)} disabled={chunk.status !== "UPLOADED"} />
                        </TableCell>
                        <TableCell>
                          <p className="text-xs truncate max-w-[200px]">{chunk.fileName}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDate(chunk.createdAt)}</p>
                        </TableCell>
                        <TableCell className="text-[11px]">{formatFileSize(chunk.fileSize)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(chunk)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>청크 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.fileName}&rdquo; 파일을 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MergeStatusCard({ status, updatedAt, errorMessage }: { status: MergedScanStatus; updatedAt: string; errorMessage: string | null }) {
  const config = MERGE_STATUS_CONFIG[status];
  const Icon = config.icon;
  const isInProgress = status === "MERGING" || status === "EXTRACTING" || status === "PROCESSING";

  return (
    <div className="rounded-md border p-2.5 space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {isInProgress ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
          처리 상태
        </div>
        <Badge variant={config.variant} className="text-[10px]">{config.label}</Badge>
      </div>
      <p className="text-[10px] text-muted-foreground">{formatDate(updatedAt)}</p>
      {errorMessage && <><Separator /><p className="text-[10px] text-destructive">{errorMessage}</p></>}
    </div>
  );
}
