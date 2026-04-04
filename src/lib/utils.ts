import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Point3D } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** API 좌표(x,y,z) → Three.js 좌표(-x,z,y) */
export function apiToThree(p: Point3D): [number, number, number] {
  return [-p.x, p.z, p.y];
}

/** Three.js 좌표(x,y,z) → API 좌표(-x,z,y) */
export function threeToApi(x: number, y: number, z: number): Point3D {
  return { x: -x, y: z, z: y };
}
