import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { poiRegisterSchema, type PoiRegisterFormValues } from "@/lib/validations/poi";
import { usePoiStore } from "@/stores";
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

interface RegisterPOIDialogProps {
  nodeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegisterPOIDialog({ nodeId, open, onOpenChange }: RegisterPOIDialogProps) {
  const registerPoiToNode = usePoiStore((s) => s.registerPoiToNode);

  const form = useForm<PoiRegisterFormValues>({
    resolver: zodResolver(poiRegisterSchema) as Resolver<PoiRegisterFormValues>,
    defaultValues: {
      name: "",
      category: "OTHER",
    },
  });

  async function onSubmit(values: PoiRegisterFormValues) {
    if (!nodeId) return;
    try {
      await registerPoiToNode(nodeId, values);
      form.reset();
      onOpenChange(false);
    } catch {
      // Error handled by interceptor
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            POI 등록
          </DialogTitle>
          <DialogDescription>
            기존 노드에 POI 정보를 등록합니다.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름</FormLabel>
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

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
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
