import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useViewerStore, usePoiStore } from "@/stores";
import { threeToApi } from "@/lib/utils";
import type { Point3D } from "@/types";

interface PathOverlayProps {
  onNodeHover?: (apiCoords: Point3D, screenX: number, screenY: number) => void;
  onNodeLeave?: () => void;
}

export function PathOverlay({ onNodeHover, onNodeLeave }: PathOverlayProps) {
  const floorPath = useViewerStore((s) => s.floorPath);
  const showPath = useViewerStore((s) => s.showPath);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const building = useViewerStore((s) => s.building);
  const isPlacementMode = usePoiStore((s) => s.isPlacementMode);
  const setPendingPosition = usePoiStore((s) => s.setPendingPosition);

  // 경로 세그먼트 (엣지)
  const segments = useMemo(() => {
    if (!floorPath || floorPath.segments.length === 0) return [];

    const sorted = [...floorPath.segments].sort(
      (a, b) => a.sequenceOrder - b.sequenceOrder,
    );

    return sorted.map((seg) => ({
      start: new THREE.Vector3(seg.startPoint.x, seg.startPoint.z, seg.startPoint.y),
      end: new THREE.Vector3(seg.endPoint.x, seg.endPoint.z, seg.endPoint.y),
    }));
  }, [floorPath]);

  // 경로 노드 (중복 제거)
  const nodes = useMemo(() => {
    if (segments.length === 0) return [];

    const nodeSet = new Map<string, THREE.Vector3>();

    segments.forEach((seg) => {
      const startKey = `${seg.start.x},${seg.start.y},${seg.start.z}`;
      const endKey = `${seg.end.x},${seg.end.y},${seg.end.z}`;

      if (!nodeSet.has(startKey)) {
        nodeSet.set(startKey, seg.start);
      }
      if (!nodeSet.has(endKey)) {
        nodeSet.set(endKey, seg.end);
      }
    });

    return Array.from(nodeSet.values());
  }, [segments]);

  // 각 segment가 독립적인 엣지(그래프 구조)이므로 개별 렌더링

  if (!showPath || segments.length === 0) return null;

  // 노드 클릭 핸들러 - 정확한 노드 위치 사용
  function handleNodeClick(e: ThreeEvent<MouseEvent>, nodePos: THREE.Vector3) {
    if (!isPlacementMode) return;

    e.stopPropagation();

    const { x, y, z } = nodePos;

    // 선택된 층의 높이 가져오기
    const selectedFloor = building?.floors.find((f) => f.id === selectedFloorId);
    const floorHeight = selectedFloor?.height ?? 0;

    // Three.js 좌표를 API 좌표로 변환
    const apiCoords = threeToApi(x, y, z);

    console.log("🎯 노드 클릭:", {
      nodePosition: { x, y, z },
      api: apiCoords,
      floorHeight,
    });

    setPendingPosition({ x: apiCoords.x, y: apiCoords.y, z: 0 });
  }

  // 엣지 클릭 핸들러 - raycaster로 정확한 교차점 획득
  function handleEdgeClick(e: ThreeEvent<MouseEvent>) {
    if (!isPlacementMode) return;

    e.stopPropagation();

    const { x, y, z } = e.point;

    // 선택된 층의 높이 가져오기
    const selectedFloor = building?.floors.find((f) => f.id === selectedFloorId);
    const floorHeight = selectedFloor?.height ?? 0;

    // Three.js 좌표를 API 좌표로 변환
    const apiCoords = threeToApi(x, y, z);

    console.log("🎯 엣지 클릭:", {
      intersection: { x, y, z },
      api: apiCoords,
      floorHeight,
    });

    setPendingPosition({ x: apiCoords.x, y: apiCoords.y, z: 0 });
  }

  // 노드 hover 핸들러
  function handleNodePointerEnter(e: ThreeEvent<PointerEvent>, nodePos: THREE.Vector3) {
    if (isPlacementMode) return;
    e.stopPropagation();

    const { x, y, z } = nodePos;
    const apiCoords = threeToApi(x, y, z);
    onNodeHover?.(apiCoords, e.nativeEvent.clientX, e.nativeEvent.clientY);
  }

  function handleNodePointerLeave() {
    if (isPlacementMode) return;
    onNodeLeave?.();
  }

  return (
    <group>
      {/* 시각적 경로 선 - 각 segment를 독립 Line으로 렌더링 */}
      {segments.map((seg, idx) => (
        <Line
          key={`line-${idx}`}
          points={[seg.start, seg.end]}
          color="#22d3ee"
          lineWidth={isPlacementMode ? 5 : 3}
          transparent
          opacity={0.9}
        />
      ))}

      {/* 클릭 가능한 엣지 (cylinder) */}
      {segments.map((seg, idx) => {
        const direction = new THREE.Vector3().subVectors(seg.end, seg.start);
        const length = direction.length();
        const center = new THREE.Vector3().addVectors(seg.start, seg.end).multiplyScalar(0.5);

        // 방향 벡터로 회전 계산
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.normalize(),
        );

        return (
          <mesh
            key={`edge-${idx}`}
            position={center}
            quaternion={quaternion}
            onClick={handleEdgeClick}
            onPointerOver={() => isPlacementMode && (document.body.style.cursor = "crosshair")}
            onPointerOut={() => isPlacementMode && (document.body.style.cursor = "auto")}
          >
            {/* 클릭 영역을 넓게 */}
            <cylinderGeometry args={[0.15, 0.15, length, 8]} />
            <meshBasicMaterial
              transparent
              opacity={isPlacementMode ? 0.2 : 0}
              color="#22d3ee"
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* 클릭/hover 가능한 노드 (sphere) */}
      {nodes.map((pos, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === nodes.length - 1;

        return (
          <mesh
            key={`node-${idx}`}
            position={pos}
            onClick={(e) => handleNodeClick(e, pos)}
            onPointerEnter={(e) => handleNodePointerEnter(e, pos)}
            onPointerLeave={handleNodePointerLeave}
            onPointerOver={() => isPlacementMode && (document.body.style.cursor = "crosshair")}
            onPointerOut={() => isPlacementMode && (document.body.style.cursor = "auto")}
          >
            <sphereGeometry args={[isPlacementMode ? 0.15 : 0.1, 16, 16]} />
            <meshBasicMaterial
              color={isFirst ? "#4ade80" : isLast ? "#f87171" : "#22d3ee"}
            />
          </mesh>
        );
      })}
    </group>
  );
}

