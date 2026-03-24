import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePoiStore, useViewerStore, useGraphEditorStore } from "@/stores";
import * as graphApi from "@/api/graph";
import type { PoiCategory } from "@/types";

const POI_CATEGORY_OPTIONS: { value: PoiCategory; label: string }[] = [
  { value: "CLASSROOM", label: "강의실" },
  { value: "OFFICE", label: "사무실" },
  { value: "RESTROOM", label: "화장실" },
  { value: "EXIT", label: "출구" },
  { value: "ELEVATOR", label: "엘리베이터" },
  { value: "STAIRCASE", label: "계단" },
  { value: "OTHER", label: "기타" },
];

interface CreatePOIDialogProps {
  buildingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePOIDialog({
  buildingId,
  open,
  onOpenChange,
}: CreatePOIDialogProps) {
  void buildingId; // used by parent for context
  const registerPoiToNode = usePoiStore((s) => s.registerPoiToNode);
  const pendingPoiTarget = usePoiStore((s) => s.pendingPoiTarget);
  const cancelPlacement = usePoiStore((s) => s.cancelPlacement);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const fetchGraph = useGraphEditorStore((s) => s.fetchGraph);

  const form = useForm({
    defaultValues: {
      name: "",
      category: "OTHER" as PoiCategory,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: "", category: "OTHER" });
    }
  }, [open, form]);

  async function onSubmit(values: { name: string; category: PoiCategory }) {
    if (!values.name.trim()) return;
    if (!pendingPoiTarget || !selectedFloorId) return;

    try {
      if (pendingPoiTarget.targetNodeId) {
        // 기존 노드에 POI 등록
        await registerPoiToNode(pendingPoiTarget.targetNodeId, {
          name: values.name,
          category: values.category,
        });
      } else if (pendingPoiTarget.splitEdge) {
        // 1. 엣지 위에 새 노드 생성
        const newNode = await graphApi.createNode(selectedFloorId, {
          x: pendingPoiTarget.x,
          y: pendingPoiTarget.y,
          z: pendingPoiTarget.z,
          type: "POI",
        });

        // 2. 기존 엣지 삭제
        await graphApi.deleteEdge(pendingPoiTarget.splitEdge.edgeId);

        // 3. 분할된 엣지 2개 생성 (fromNode → newNode, newNode → toNode)
        await graphApi.createEdge(selectedFloorId, {
          fromNodeId: pendingPoiTarget.splitEdge.fromNodeId,
          toNodeId: newNode.id,
          isBidirectional: true,
        });
        await graphApi.createEdge(selectedFloorId, {
          fromNodeId: newNode.id,
          toNodeId: pendingPoiTarget.splitEdge.toNodeId,
          isBidirectional: true,
        });

        // 4. 새 노드에 POI 등록
        await registerPoiToNode(newNode.id, {
          name: values.name,
          category: values.category,
        });

        // 5. 그래프 새로고침
        await fetchGraph(selectedFloorId);
      }

      form.reset();
      cancelPlacement();
      onOpenChange(false);
    } catch (error) {
      console.error("POI 생성 실패:", error);
    }
  }

  function handleCancel() {
    form.reset();
    cancelPlacement();
    onOpenChange(false);
  }

  const isOnNode = !!pendingPoiTarget?.targetNodeId;
  const isOnEdge = !!pendingPoiTarget?.splitEdge;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            POI 등록
          </DialogTitle>
          <DialogDescription>
            {isOnNode && "선택한 노드에 POI를 등록합니다."}
            {isOnEdge && "엣지 위에 새 노드를 생성하고 POI를 등록합니다."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름 *</FormLabel>
                  <FormControl>
                    <Input placeholder="예: C101강의실" {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>카테고리</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {POI_CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isOnEdge && (
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                엣지가 자동 분할됩니다 (A→B → A→POI→B)
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={handleCancel}>
                취소
              </Button>
              <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "등록 중..." : "등록"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
