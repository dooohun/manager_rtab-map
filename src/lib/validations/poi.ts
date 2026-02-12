import { z } from "zod";

export const poiCategorySchema = z.enum([
  "CLASSROOM",
  "OFFICE",
  "RESTROOM",
  "EXIT",
  "ELEVATOR",
  "STAIRCASE",
  "OTHER",
]);

export const poiCreateSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  category: poiCategorySchema,
  floorLevel: z.number(),
  x: z.number(),
  y: z.number(),
  z: z.number().optional(),
});

export const poiRegisterSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  category: poiCategorySchema,
});

export type PoiCreateFormValues = z.infer<typeof poiCreateSchema>;
export type PoiRegisterFormValues = z.infer<typeof poiRegisterSchema>;
