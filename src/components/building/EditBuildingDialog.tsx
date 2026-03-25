import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { buildingUpdateSchema, type BuildingUpdateFormValues } from "@/lib/validations/building";
import { useBuildingStore } from "@/stores";
import type { BuildingDetailResponse, BuildingResponse } from "@/types";

interface EditBuildingDialogProps {
  building: BuildingDetailResponse | BuildingResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBuildingDialog({ building, open, onOpenChange }: EditBuildingDialogProps) {
  const updateBuilding = useBuildingStore((s) => s.updateBuilding);

  const form = useForm<BuildingUpdateFormValues>({
    resolver: zodResolver(buildingUpdateSchema) as Resolver<BuildingUpdateFormValues>,
    defaultValues: {
      name: building.name,
      description: building.description || "",
      latitude: building.latitude,
      longitude: building.longitude,
    },
  });

  async function onSubmit(values: BuildingUpdateFormValues) {
    try {
      await updateBuilding(building.id, {
        name: values.name || undefined,
        description: values.description || undefined,
        latitude: typeof values.latitude === "number" ? values.latitude : undefined,
        longitude: typeof values.longitude === "number" ? values.longitude : undefined,
      });
      onOpenChange(false);
    } catch {
      // Error handled by interceptor
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>건물 정보 수정</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>건물 이름</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 2공학관" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    설명
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] text-xs">
                        <p>여기에 키워드를 넣으면 사용자가 건물을 검색할 때 활용됩니다.</p>
                        <p className="mt-1 text-muted-foreground">예: 컴공, 2공, 학부 사무실</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="예: 컴공, 2공, 학부 사무실" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>위도</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="37.5665"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>경도</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="126.9780"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "저장 중..." : "저장"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
