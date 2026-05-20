import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
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

const POI_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "classroom", label: "강의실" },
  { value: "office", label: "사무실" },
  { value: "restroom", label: "화장실" },
  { value: "entrance", label: "출구/입구" },
  { value: "elevator", label: "엘리베이터" },
  { value: "staircase", label: "계단" },
  { value: "door", label: "문" },
  { value: "other", label: "기타" },
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
  const createPoi = usePoiStore((s) => s.createPoi);
  const pendingPoiTarget = usePoiStore((s) => s.pendingPoiTarget);
  const cancelPlacement = usePoiStore((s) => s.cancelPlacement);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const selectedAreaId = useViewerStore((s) => s.selectedAreaId);
  const fetchGraph = useGraphEditorStore((s) => s.fetchGraph);

  const form = useForm({
    defaultValues: {
      name: "",
      category: "other",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: "", category: "other" });
    }
  }, [open, form]);

  async function onSubmit(values: { name: string; category: string }) {
    if (!values.name.trim()) return;
    if (!pendingPoiTarget || !selectedAreaId) return;

    try {
      let routeNodeId = pendingPoiTarget.existingNodeId;

      if (pendingPoiTarget.splitEdge) {
        // 1. 엣지 위에 새 poi_attach 노드 생성
        const newNode = await graphApi.createNode(selectedAreaId, {
          x: pendingPoiTarget.x,
          y: pendingPoiTarget.y,
          z: pendingPoiTarget.z,
          nodeType: "poi_attach",
        });

        // 2. 기존 엣지 삭제
        await graphApi.deleteEdge(pendingPoiTarget.splitEdge.edgeId);

        // 3. 분할된 엣지 2개
        await graphApi.createEdge(selectedAreaId, {
          fromNodeId: pendingPoiTarget.splitEdge.fromNodeId,
          toNodeId: newNode.nodeId,
        });
        await graphApi.createEdge(selectedAreaId, {
          fromNodeId: newNode.nodeId,
          toNodeId: pendingPoiTarget.splitEdge.toNodeId,
        });

        routeNodeId = newNode.nodeId;
      }

      await createPoi(buildingId, {
        areaId: selectedAreaId,
        name: values.name,
        category: values.category,
        x: pendingPoiTarget.x,
        y: pendingPoiTarget.y,
        z: pendingPoiTarget.z,
        routeNodeId,
      });

      if (selectedFloorId) {
        await fetchGraph(selectedFloorId, selectedAreaId);
      }

      form.reset();
      usePoiStore.getState().setPendingPoiTarget(null);
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

  const isOnEdge = !!pendingPoiTarget?.splitEdge;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            POI 등록
          </DialogTitle>
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
