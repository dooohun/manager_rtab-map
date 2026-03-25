import { useState } from "react";
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
import { buildingCreateSchema, type BuildingCreateFormValues } from "@/lib/validations/building";
import { useBuildingStore } from "@/stores";

interface CreateBuildingDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateBuildingDialog({ open: controlledOpen, onOpenChange: controlledOnChange }: CreateBuildingDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const createBuilding = useBuildingStore((s) => s.createBuilding);

  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnChange ?? setInternalOpen;

  const form = useForm<BuildingCreateFormValues>({
    resolver: zodResolver(buildingCreateSchema) as Resolver<BuildingCreateFormValues>,
    defaultValues: { name: "", description: "" },
  });

  async function onSubmit(values: BuildingCreateFormValues) {
    try {
      await createBuilding({
        name: values.name,
        description: values.description || undefined,
      });
      form.reset();
      setOpen(false);
    } catch {
      // Error handled by interceptor
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>새 건물 생성</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>건물 이름 *</FormLabel>
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

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
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
