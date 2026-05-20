import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Point3D } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * API world frame(x,y=floor / z=up) ↔ Three.js(y=up).
 * 서버 노드/엣지/PLY 모두 z=up rtabmap world frame을 그대로 씀.
 */
export function apiToThree(p: Point3D): [number, number, number] {
  return [-p.x, p.z, p.y];
}

export function threeToApi(x: number, y: number, z: number): Point3D {
  return { x: -x, y: z, z: y };
}
