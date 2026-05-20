export type BuildingStatus = "DRAFT" | "PROCESSING" | "ACTIVE";

export interface BuildingResponse {
  buildingId: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  status: BuildingStatus;
  floorCount?: number;
  passageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BuildingDetailResponse {
  buildingId: string;
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
  floorId: string;
  buildingId: string;
  name: string;
  level: number;
  height: number | null;
  hasPath: boolean;
  hasPly: boolean;
  activeScanId?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

// Area (Floor 하위 sub-region)
export interface AreaResponse {
  areaId: string;
  floorId: string;
  areaIndex: number;
  label: string;
  isDefault: boolean;
  createdAt: string;
}

// POI (canonical) — 서버 PoiResult 기반
export type PoiCategory = string; // 서버에서 자유형 string. UI label 매핑은 별도.

export interface PoiResponse {
  poiId: string;
  buildingId: string | null;
  floorId: string | null;
  name: string;
  label: string;
  category: string;
  routeNodeId: string | null;
  displayPoint: { x: number; y: number; z: number } | null;
  needsReview: boolean;
  llmConfidence: number | null;
}

export interface PoiCreateRequest {
  areaId: string;
  name: string;
  category: string;
  x: number;
  y: number;
  z: number;
  displayX?: number;
  displayY?: number;
  displayZ?: number;
  routeNodeId?: string;
}

export interface PoiUpdateRequest {
  name?: string;
  category?: string;
  label?: string;
  x?: number;
  y?: number;
  z?: number;
  displayX?: number;
  displayY?: number;
  displayZ?: number;
  routeNodeId?: string;
  detachRouteNode?: boolean;
  markReviewed?: boolean;
}

export interface PoiAttachRequest {
  routeNodeId: string;
}

// Graph — 서버 enum 정렬
export type NodeType = "junction" | "endpoint" | "corridor" | "poi" | "poi_attach";
export type EdgeType = "rtabmap_link" | "poi_spur" | "vertical_connector";

export interface PathNodeResponse {
  nodeId: string;
  areaId: string;
  nodeType: NodeType;
  x: number;
  y: number;
  z: number;
  label: string | null;
  stale: boolean;
  origin: string; // "scan" | "manual_edit"
}

export interface PathEdgeResponse {
  edgeId: string;
  areaId: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: EdgeType;
  lengthM: number;
  widthM: number | null;
}

export interface FloorGraphResponse {
  floorId: string;
  nodes: PathNodeResponse[];
  edges: PathEdgeResponse[];
}

export interface NodeCreateRequest {
  x: number;
  y: number;
  z: number;
  nodeType: NodeType;
  label?: string;
}

export interface NodeUpdateRequest {
  x?: number;
  y?: number;
  z?: number;
  nodeType?: NodeType;
  label?: string;
}

export interface EdgeCreateRequest {
  fromNodeId: string;
  toNodeId: string;
  edgeType?: EdgeType;
}

export interface EdgeUpdateRequest {
  edgeType?: EdgeType;
  widthM?: number;
  clearWidth?: boolean;
}

// Vertical Connector (수직 연결 — 옛 passage 대체)
export interface ConnectorStopResponse {
  stopId: string;
  areaId: string;
  areaLabel: string;
  floorId: string;
  floorLevel: number;
  routeNodeId: string | null;
}

export interface ConnectorResponse {
  connectorId: string;
  buildingId: string;
  connectorType: string; // "STAIRCASE" | "ELEVATOR" | ...
  connectorKey: string;
  name: string | null;
  mock: boolean;
  stops: ConnectorStopResponse[];
}

export interface ConnectorCreateRequest {
  connectorType: string;
  connectorKey: string;
  name?: string;
}

export interface ConnectorUpdateRequest {
  connectorType?: string;
  connectorKey?: string;
  name?: string;
  mock?: boolean;
}

export interface ConnectorStopRequest {
  areaId?: string;
  routeNodeId?: string;
  detachRouteNode?: boolean;
}

// Lobby Polygon (코너 — floor_area_polygon)
export interface PolygonResponse {
  polygonId: string;
  floorAreaId: string;
  markSessionId: string;
  vertices: Point3D[];
}

export interface PolygonRequest {
  exterior: Point3D[];
}

// Chunk / merge — 기존 유지
export type ChunkStatus = "UPLOADED" | "FAILED";

export interface ChunkResponse {
  id: string;
  floorId: string;
  fileName: string;
  fileSize: number;
  status: ChunkStatus;
  active: boolean;
  uploadOrder: number;
  errorMessage: string | null;
  createdAt: string;
}

export type MergedScanStatus =
  | "IDLE"
  | "MERGING"
  | "MERGED"
  | "MERGE_FAILED"
  | "EXTRACTING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface MergedScanResponse {
  id: string;
  floorId: string;
  status: MergedScanStatus;
  plyFileId: string | null;
  totalNodes: number | null;
  totalDistance: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}
