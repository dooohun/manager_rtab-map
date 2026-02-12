import { Html } from "@react-three/drei";
import * as THREE from "three";
import { MapPin } from "lucide-react";
import { usePoiStore, useViewerStore } from "@/stores";

export function PendingPOIMarker() {
  const pendingPosition = usePoiStore((s) => s.pendingPosition);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const building = useViewerStore((s) => s.building);

  if (!pendingPosition) return null;

  // 선택된 층의 높이 가져오기
  const selectedFloor = building?.floors.find((f) => f.id === selectedFloorId);
  const floorHeight = selectedFloor?.height ?? 0;

  // Three.js 좌표계: (x, z, y) - API의 (x, y, z)에서 변환
  const pos = new THREE.Vector3(pendingPosition.x, floorHeight, pendingPosition.y);

  return (
    <group position={pos}>
      {/* 임시 마커 */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 1, 16]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} opacity={0.8} transparent />
      </mesh>

      {/* 임시 마커 상단 */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={1.0} opacity={0.8} transparent />
      </mesh>

      {/* 바닥 링 애니메이션 */}
      <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.4, 32]} />
        <meshBasicMaterial color="#f59e0b" opacity={0.5} transparent />
      </mesh>

      {/* HTML 라벨 */}
      <Html
        position={[0, 1.8, 0]}
        center
        distanceFactor={8}
        style={{
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div className="px-2 py-1 rounded shadow-lg text-xs font-medium whitespace-nowrap bg-amber-500 text-white">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            POI 배치 위치
          </div>
        </div>
      </Html>
    </group>
  );
}
