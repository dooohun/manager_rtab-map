import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import type { ThreeEvent } from "@react-three/fiber";
import { toast } from "sonner";
import { useGraphEditorStore, useViewerStore, usePoiStore, usePolygonStore, useConnectorStore, useBuildingStore } from "@/stores";
import { threeToApi } from "@/lib/utils";
import * as graphApi from "@/api/graph";
import { setFloorY } from "./PointCloudViewer";
import type { PathNodeResponse, PathEdgeResponse } from "@/types";

interface PointcloudMeshProps {
  plyUrl: string | null;
}

function findNearestEdge(
  apiX: number, apiY: number,
  nodes: PathNodeResponse[],
  edges: PathEdgeResponse[],
) {
  let bestEdge: PathEdgeResponse | null = null;
  let bestProj = { x: 0, y: 0 };
  let bestDist = Infinity;

  for (const edge of edges) {
    if (edge.edgeType !== "rtabmap_link") continue;
    const from = nodes.find((n) => n.nodeId === edge.fromNodeId);
    const to = nodes.find((n) => n.nodeId === edge.toNodeId);
    if (!from || !to) continue;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;

    const t = Math.max(0.05, Math.min(0.95, ((apiX - from.x) * dx + (apiY - from.y) * dy) / lenSq));
    const projX = from.x + t * dx;
    const projY = from.y + t * dy;
    const dist = Math.hypot(projX - apiX, projY - apiY);

    if (dist < bestDist) {
      bestDist = dist;
      bestEdge = edge;
      bestProj = { x: projX, y: projY };
    }
  }

  return bestEdge && bestDist < 0.3
    ? { edge: bestEdge, projectedX: bestProj.x, projectedY: bestProj.y, distance: bestDist }
    : null;
}

export function PointcloudMesh({ plyUrl }: PointcloudMeshProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const editorMode = useGraphEditorStore((s) => s.editorMode);
  const createNode = useGraphEditorStore((s) => s.createNode);
  const nodeTypeToPlace = useGraphEditorStore((s) => s.nodeTypeToPlace);
  const selectedAreaId = useViewerStore((s) => s.selectedAreaId);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const pointSize = useViewerStore((s) => s.pointSize);
  const isPlacementMode = usePoiStore((s) => s.isPlacementMode);

  // PLY 로드 (백엔드가 이미 층별로 분리해서 줌)
  useEffect(() => {
    if (!plyUrl) {
      setGeometry(null);
      return;
    }

    const loader = new PLYLoader();
    loader.load(
      plyUrl,
      (geo) => {
        // PLY는 rtabmap world frame(z=up). Three.js 기본은 y=up이라 (x,y,z) →
        // (-x, z, y)로 swap해야 정상 세움. -x는 ROS REP-103 right-handed ↔
        // Three left-handed 보정.
        const pos = geo.getAttribute("position");
        if (pos) {
          const arr = pos.array as Float32Array;
          for (let i = 0; i < arr.length; i += 3) {
            const x = arr[i];
            const y = arr[i + 1];
            const z = arr[i + 2];
            arr[i] = -x;
            arr[i + 1] = z;
            arr[i + 2] = y;
          }
          pos.needsUpdate = true;
        }
        geo.computeBoundingBox();
        geo.computeBoundingSphere();
        setGeometry(geo);
      },
      undefined,
      (err) => {
        console.warn("PLY 로드 실패:", err);
        setGeometry(null);
      },
    );

    return () => {
      setGeometry((prev) => {
        prev?.dispose();
        return null;
      });
    };
  }, [plyUrl]);

  // 층 변경 시 카메라 자동 센터링
  useEffect(() => {
    if (!geometry?.boundingBox) return;
    const box = geometry.boundingBox;
    const cx = (box.max.x + box.min.x) / 2;
    const cy = (box.max.y + box.min.y) / 2;
    const cz = (box.max.z + box.min.z) / 2;
    useViewerStore.getState().setOrbitTarget({ x: cx, y: cy, z: cz });
  }, [geometry]);

  // 바닥 클릭 평면 높이 계산
  const floorPlane = useMemo(() => {
    if (!geometry?.boundingBox) return null;
    const box = geometry.boundingBox;
    const positions = geometry.getAttribute("position");

    let floorY = box.min.y;
    if (positions) {
      const array = positions.array as Float32Array;
      const yVals: number[] = [];
      for (let i = 1; i < array.length; i += 30) {
        yVals.push(array[i]);
      }
      yVals.sort((a, b) => a - b);
      floorY = yVals[Math.floor(yVals.length * 0.15)] ?? box.min.y;
    }

    return {
      sizeX: box.max.x - box.min.x + 20,
      sizeZ: box.max.z - box.min.z + 20,
      centerX: (box.max.x + box.min.x) / 2,
      centerZ: (box.max.z + box.min.z) / 2,
      floorY: floorY + 0.1,
    };
  }, [geometry]);

  // 바닥 Y값 전역 공유 (Space 배치에서 사용)
  useEffect(() => {
    if (floorPlane) setFloorY(floorPlane.floorY);
  }, [floorPlane]);

  // Track space key to suppress clicks during camera navigation
  const spaceHeldRef = useRef(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === "Space") spaceHeldRef.current = true; };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") spaceHeldRef.current = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  async function handlePlaneClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();

    // Space held → camera navigation, don't place anything
    if (spaceHeldRef.current) return;

    // 빈 공간 클릭 → 항상 선택 해제
    const store = useGraphEditorStore.getState();
    if (store.selectedNodeId || store.selectedEdgeId) {
      store.selectNode(null);
      store.selectEdge(null);
    }

    const { x, y, z } = e.point;
    const apiCoords = threeToApi(x, y, z);

    // 뷰 모드: 선택 해제만
    if (editorMode === "view" && !isPlacementMode) {
      return;
    }

    // POI 배치
    if (isPlacementMode) {
      const { nodes, edges, isEditorActive } = useGraphEditorStore.getState();
      if (!isEditorActive || nodes.length === 0) {
        toast.error("그래프 에디터를 켜고 노드를 먼저 배치하세요.");
        return;
      }
      const setPendingPoiTarget = usePoiStore.getState().setPendingPoiTarget;

      let nearestNode: PathNodeResponse | null = null;
      let nearestNodeDist = Infinity;
      for (const node of nodes) {
        const dist = Math.hypot(node.x - apiCoords.x, node.y - apiCoords.y);
        if (dist < nearestNodeDist) { nearestNodeDist = dist; nearestNode = node; }
      }
      if (nearestNode && nearestNodeDist < 0.5) {
        setPendingPoiTarget({
          x: nearestNode.x, y: nearestNode.y, z: nearestNode.z,
          existingNodeId: nearestNode.nodeId,
        });
        return;
      }
      const edgeHit = findNearestEdge(apiCoords.x, apiCoords.y, nodes, edges);
      if (edgeHit) {
        setPendingPoiTarget({
          x: edgeHit.projectedX, y: edgeHit.projectedY, z: apiCoords.z,
          splitEdge: { edgeId: edgeHit.edge.edgeId, fromNodeId: edgeHit.edge.fromNodeId, toNodeId: edgeHit.edge.toNodeId },
        });
        return;
      }
      toast.error("근처에 노드나 엣지가 없습니다.");
      return;
    }

    // 코너 (add-corner): area에 폴리곤 row 1개 추가. draft 누적은 store에. 닫기는 별도 버튼.
    if (editorMode === "add-corner") {
      if (!selectedAreaId) { toast.error("Area를 먼저 선택하세요."); return; }
      usePolygonStore.getState().addDraftVertex({ x: apiCoords.x, y: apiCoords.y, z: apiCoords.z });
      return;
    }

    // 노드 배치
    if (editorMode !== "add-node" || !selectedAreaId) {
      if (editorMode === "add-node" && !selectedAreaId) {
        toast.error("Area를 먼저 선택하세요.");
      }
      return;
    }

    const { nodes, edges, autoConnect, lastPlacedNodeId } = useGraphEditorStore.getState();
    const edgeHit = findNearestEdge(apiCoords.x, apiCoords.y, nodes, edges);

    if (edgeHit && nodeTypeToPlace !== "vertical") {
      try {
        const newNode = await graphApi.createNode(selectedAreaId, {
          x: edgeHit.projectedX, y: edgeHit.projectedY, z: apiCoords.z, nodeType: nodeTypeToPlace,
        });
        await graphApi.deleteEdge(edgeHit.edge.edgeId);
        await graphApi.createEdge(selectedAreaId, { fromNodeId: edgeHit.edge.fromNodeId, toNodeId: newNode.nodeId });
        await graphApi.createEdge(selectedAreaId, { fromNodeId: newNode.nodeId, toNodeId: edgeHit.edge.toNodeId });
        if (autoConnect && lastPlacedNodeId) {
          try { await graphApi.createEdge(selectedAreaId, { fromNodeId: lastPlacedNodeId, toNodeId: newNode.nodeId }); } catch { /* ignore */ }
        }
        useGraphEditorStore.setState({ lastPlacedNodeId: newNode.nodeId });
        if (selectedFloorId) {
          await useGraphEditorStore.getState().fetchGraph(selectedFloorId, selectedAreaId);
        }
        return;
      } catch { toast.error("엣지 분할 실패"); return; }
    }

    // vertical: corridor 노드로 생성한 뒤 같은 (type, key)의 connector에 stop attach.
    // 다른 floor에서 같은 key로 또 찍으면 connector가 이미 있어 stop만 추가 → 서버
    // BuildingRouteGraphProvider가 같은 connector_id stops 페어 사이에 가상 edge 자동 생성.
    if (nodeTypeToPlace === "vertical") {
      const connectorStore = useConnectorStore.getState();
      const { verticalType, verticalKey } = connectorStore;
      if (!verticalKey.trim()) { toast.error("key를 먼저 입력하세요"); return; }
      const buildingId = useBuildingStore.getState().currentBuilding?.buildingId;
      if (!buildingId) { toast.error("빌딩 정보 없음"); return; }
      try {
        const newNode = await graphApi.createNode(selectedAreaId, {
          x: apiCoords.x, y: apiCoords.y, z: apiCoords.z, nodeType: "corridor",
          label: `${verticalType}:${verticalKey}`,
        });
        useGraphEditorStore.setState({ nodes: [...nodes, newNode], lastPlacedNodeId: newNode.nodeId });
        const connectorId = await connectorStore.ensureConnector(buildingId, verticalType, verticalKey.trim());
        await connectorStore.addStop(connectorId, { areaId: selectedAreaId, routeNodeId: newNode.nodeId });
      } catch { toast.error("층간연결 노드 추가 실패"); }
      return;
    }

    createNode(selectedAreaId, apiCoords.x, apiCoords.y, apiCoords.z, nodeTypeToPlace);
  }

  if (!geometry) return null;

  const showClickPlane =
    editorMode === "add-node" ||
    editorMode === "add-corner" ||
    isPlacementMode;

  return (
    <group>
      <points>
        <primitive object={geometry} attach="geometry" />
        <pointsMaterial
          size={pointSize}
          vertexColors={geometry.hasAttribute("color")}
          transparent
          opacity={0.85}
          sizeAttenuation
        />
      </points>
      {showClickPlane && floorPlane && (
        <mesh
          position={[floorPlane.centerX, floorPlane.floorY, floorPlane.centerZ]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handlePlaneClick}
          onPointerOver={() => { if (showClickPlane) document.body.style.cursor = "crosshair"; }}
          onPointerOut={() => { document.body.style.cursor = "auto"; }}
          renderOrder={-1}
        >
          <planeGeometry args={[floorPlane.sizeX, floorPlane.sizeZ]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
        </mesh>
      )}
    </group>
  );
}
