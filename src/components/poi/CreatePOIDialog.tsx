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
import { usePoiStore, useViewerStore } from "@/stores";
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
  const createPoi = usePoiStore((s) => s.createPoi);
  const pendingPosition = usePoiStore((s) => s.pendingPosition);
  const cancelPlacement = usePoiStore((s) => s.cancelPlacement);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const building = useViewerStore((s) => s.building);

  const selectedFloor = building?.floors.find((f) => f.id === selectedFloorId);

  const form = useForm({
    defaultValues: {
      name: "",
      category: "OTHER" as PoiCategory,
      floorLevel: 1,
      x: 0,
      y: 0,
      z: 0,
    },
  });

  // 다이얼로그가 열릴 때마다 form 초기화
  useEffect(() => {
    if (open) {
      const x = pendingPosition?.x ?? 0;
      const y = pendingPosition?.y ?? 0;
      const floorLevel = selectedFloor?.level ?? 1;
      const z = selectedFloor?.height ?? 0;

      console.log("🔧 Form 초기화:", { x, y, z, floorLevel, selectedFloor });

      form.reset({
        name: "",
        category: "OTHER",
        floorLevel,
        x,
        y,
        z,
      });
    }
  }, [open, selectedFloor, pendingPosition, form]);

  async function onSubmit(values: any) {
    console.log("📤 제출 값:", values);
    console.log("📍 선택된 층:", selectedFloor);

    if (!values.name || values.name.trim() === "") {
      alert("이름을 입력해주세요!");
      return;
    }

    try {
      const payload = {
        name: values.name,
        category: values.category,
        floorLevel: Number(values.floorLevel),
        x: Number(values.x),
        y: Number(values.y),
        z: Number(values.z),
      };

      console.log("✅ API 호출:", payload);

      await createPoi(buildingId, payload);

      form.reset();
      cancelPlacement();
      onOpenChange(false);
    } catch (error) {
      console.error("❌ POI 생성 실패:", error);
    }
  }

  function handleCancel() {
    form.reset();
    cancelPlacement();
    onOpenChange(false);
  }

  const currentZ = form.watch("z");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            POI 생성
          </DialogTitle>
          <DialogDescription>
            클릭한 위치에 POI를 생성합니다.
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
                    <Input placeholder="예: C101강의실" {...field} />
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

            <FormField
              control={form.control}
              name="floorLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>층</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => {
                        const level = Number(e.target.value);
                        field.onChange(level);
                        // 층이 변경되면 해당 층의 높이로 z값 업데이트
                        const floor = building?.floors.find((f) => f.level === level);
                        if (floor) {
                          form.setValue("z", floor.height);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>좌표</FormLabel>
              <div className="text-xs bg-blue-50 dark:bg-blue-950 p-2 rounded border">
                현재 Z 값: <strong>{currentZ}</strong> (층 높이)
              </div>
              <div className="grid grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name="x"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="X"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="y"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Y"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="z"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Z"
                          {...field}
                          value={field.value}
                          readOnly
                          className="bg-muted"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
              >
                취소
              </Button>
              <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "생성 중..." : "생성"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
