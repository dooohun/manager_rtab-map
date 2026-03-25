import { z } from "zod";

export const buildingCreateSchema = z.object({
  name: z.string().min(1, "건물 이름을 입력해주세요").max(100, "최대 100자까지 입력 가능합니다"),
  description: z.string().max(1000, "최대 1000자까지 입력 가능합니다").optional(),
});

export type BuildingCreateFormValues = z.infer<typeof buildingCreateSchema>;

export const buildingUpdateSchema = z.object({
  name: z.string().max(100, "최대 100자까지 입력 가능합니다").optional(),
  description: z.string().max(1000, "최대 1000자까지 입력 가능합니다").optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type BuildingUpdateFormValues = z.infer<typeof buildingUpdateSchema>;

export const floorCreateSchema = z.object({
  name: z.string().min(1, "층 이름을 입력해주세요").max(50, "최대 50자까지 입력 가능합니다"),
  level: z.number().int("정수를 입력해주세요"),
  height: z.number().positive("양수를 입력해주세요").optional(),
});

export type FloorCreateFormValues = z.infer<typeof floorCreateSchema>;

export const floorUpdateSchema = z.object({
  name: z.string().max(50, "최대 50자까지 입력 가능합니다").optional(),
  height: z.number().positive("양수를 입력해주세요").optional(),
});

export type FloorUpdateFormValues = z.infer<typeof floorUpdateSchema>;
