export type BuildingStatus = "DRAFT" | "PROCESSING" | "ACTIVE";

export interface BuildingResponse {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  status: BuildingStatus;
  floorCount: number;
  passageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BuildingDetailResponse {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  status: BuildingStatus;
  createdAt: string;
  updatedAt: string;
  floors: FloorResponse[];
  verticalPassages: VerticalPassageResponse[];
}

export interface FloorResponse {
  id: string;
  name: string;
  level: number;
  height: number;
  hasPath: boolean;
}

export type VerticalPassageType = "STAIRCASE" | "ELEVATOR";

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface VerticalPassageResponse {
  id: string;
  type: VerticalPassageType;
  fromFloorId: string;
  fromFloorLevel: number;
  toFloorId: string;
  toFloorLevel: number;
  entryPoint: Point3D;
  exitPoint: Point3D;
}

export interface SegmentResponse {
  sequenceOrder: number;
  startPoint: Point3D;
  endPoint: Point3D;
  length: number;
}

export interface VerticalPassageDetailResponse extends VerticalPassageResponse {
  segments: SegmentResponse[];
}

export interface ErrorResponse {
  timestamp: string;
  code: string;
  message: string;
  status: number;
}

export interface BuildingCreateRequest {
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export interface BuildingUpdateRequest {
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export interface FloorCreateRequest {
  name: string;
  level: number;
  height?: number;
}

export interface FloorUpdateRequest {
  name?: string;
  height?: number;
}

export interface Bounds2D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface FloorPathResponse {
  floorId: string;
  totalDistance: number;
  bounds: Bounds2D;
  segments: SegmentResponse[];
}

// POI 관련 타입
export type PoiCategory =
  | "CLASSROOM"
  | "OFFICE"
  | "RESTROOM"
  | "EXIT"
  | "ELEVATOR"
  | "STAIRCASE"
  | "OTHER";

export interface PoiResponse {
  nodeId: string;
  name: string;
  category: PoiCategory;
  floorLevel: number;
  floorName: string;
  x: number;
  y: number;
  z: number;
}

export interface PoiCreateRequest {
  name: string;
  category: PoiCategory;
  floorLevel: number;
  x: number;
  y: number;
  z?: number;
}

export interface PoiRegisterRequest {
  name: string;
  category: PoiCategory;
}
