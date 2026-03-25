import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  floorCreateSchema,
  floorUpdateSchema,
  type FloorCreateFormValues,
  type FloorUpdateFormValues,
} from "@/lib/validations/building";
import { useFloorStore } from "@/stores";
import type { FloorResponse } from "@/types";

interface FloorFormDialogBaseProps {
  buildingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreateFloorFormDialogProps extends FloorFormDialogBaseProps {
  mode: "create";
  floor?: undefined;
}

interface EditFloorFormDialogProps extends FloorFormDialogBaseProps {
  mode: "edit";
  floor: FloorResponse;
}

type FloorFormDialogProps = CreateFloorFormDialogProps | EditFloorFormDialogProps;

function CreateFloorForm({ buildingId, onOpenChange }: { buildingId: string; onOpenChange: (open: boolean) => void }) {
  const { createFloor } = useFloorStore();

  const form = useForm<FloorCreateFormValues>({
    resolver: zodResolver(floorCreateSchema) as Resolver<FloorCreateFormValues>,
    defaultValues: { name: "", level: 1, height: undefined },
  });

  async function onSubmit(values: FloorCreateFormValues) {
    try {
      await createFloor(buildingId, { name: values.name, level: values.level, height: values.height });
      form.reset();
      onOpenChange(false);
    } catch {
      // Error handled by interceptor
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>층 이름 *</FormLabel>
            <FormControl><Input placeholder="예: 1층" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="level" render={({ field }) => (
          <FormItem>
            <FormLabel>레벨 *</FormLabel>
            <FormControl>
              <Input type="number" placeholder="1" {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="height" render={({ field }) => (
          <FormItem>
            <FormLabel>높이 (m)</FormLabel>
            <FormControl>
              <Input type="number" step="any" placeholder="3.5" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>취소</Button>
          <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "처리 중..." : "추가"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function EditFloorForm({ buildingId, floor, onOpenChange }: { buildingId: string; floor: FloorResponse; onOpenChange: (open: boolean) => void }) {
  const { updateFloor } = useFloorStore();

  const form = useForm<FloorUpdateFormValues>({
    resolver: zodResolver(floorUpdateSchema) as Resolver<FloorUpdateFormValues>,
    defaultValues: { name: floor.name, height: floor.height },
  });

  async function onSubmit(values: FloorUpdateFormValues) {
    try {
      await updateFloor(floor.id, { name: values.name || undefined, height: values.height }, buildingId);
      onOpenChange(false);
    } catch {
      // Error handled by interceptor
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>층 이름</FormLabel>
            <FormControl><Input placeholder="예: 1층" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="height" render={({ field }) => (
          <FormItem>
            <FormLabel>높이 (m)</FormLabel>
            <FormControl>
              <Input type="number" step="any" placeholder="3.5" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>취소</Button>
          <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "처리 중..." : "저장"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function FloorFormDialog({ buildingId, open, onOpenChange, mode, floor }: FloorFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "층 추가" : "층 정보 수정"}</DialogTitle>
        </DialogHeader>
        {mode === "create" ? (
          <CreateFloorForm buildingId={buildingId} onOpenChange={onOpenChange} />
        ) : (
          <EditFloorForm buildingId={buildingId} floor={floor} onOpenChange={onOpenChange} />
        )}
      </DialogContent>
    </Dialog>
  );
}
