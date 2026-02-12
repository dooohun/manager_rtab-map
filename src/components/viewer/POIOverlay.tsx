import { useMemo } from "react";
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { MapPin } from "lucide-react";
import { usePoiStore, useViewerStore } from "@/stores";
import type { PoiCategory } from "@/types";

const POI_CATEGORY_COLORS: Record<PoiCategory, string> = {
  CLASSROOM: "#3b82f6", // blue
  OFFICE: "#8b5cf6", // purple
  RESTROOM: "#10b981", // green
  EXIT: "#ef4444", // red
  ELEVATOR: "#f59e0b", // amber
  STAIRCASE: "#06b6d4", // cyan
  OTHER: "#6b7280", // gray
};

export function POIOverlay() {
  const pois = usePoiStore((s) => s.pois);
  const selectedPoiId = usePoiStore((s) => s.selectedPoiId);
  const selectPoi = usePoiStore((s) => s.selectPoi);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const showPOI = useViewerStore((s) => s.showPOI);
  const floors = useViewerStore((s) => s.building?.floors || []);

  const selectedFloor = useMemo(() => {
    return floors.find((f) => f.id === selectedFloorId);
  }, [floors, selectedFloorId]);

  const visiblePois = useMemo(() => {
    if (!selectedFloor) return [];
    return pois.filter((poi) => poi.floorLevel === selectedFloor.level);
  }, [pois, selectedFloor]);

  if (!showPOI || !selectedFloor || visiblePois.length === 0) {
    return null;
  }

  function handlePoiClick(event: ThreeEvent<MouseEvent>, poiId: string) {
    event.stopPropagation();
    selectPoi(poiId);
  }

  return (
    <group>
      {visiblePois.map((poi) => {
        const pos = new THREE.Vector3(poi.x, poi.z, poi.y);
        const color = POI_CATEGORY_COLORS[poi.category];
        const isSelected = selectedPoiId === poi.nodeId;

        return (
          <group key={poi.nodeId} position={pos}>
            {/* POI 마커 */}
            <mesh
              position={[0, 0.5, 0]}
              onClick={(e) => handlePoiClick(e, poi.nodeId)}
              onPointerOver={() => (document.body.style.cursor = "pointer")}
              onPointerOut={() => (document.body.style.cursor = "auto")}
            >
              <cylinderGeometry args={[0.2, 0.2, 1, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isSelected ? 0.8 : 0.3}
              />
            </mesh>

            {/* POI 핀 상단 */}
            <mesh
              position={[0, 1.2, 0]}
              onClick={(e) => handlePoiClick(e, poi.nodeId)}
              onPointerOver={() => (document.body.style.cursor = "pointer")}
              onPointerOut={() => (document.body.style.cursor = "auto")}
            >
              <sphereGeometry args={[isSelected ? 0.35 : 0.3, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isSelected ? 0.9 : 0.5}
              />
            </mesh>

            {/* 선택된 POI 링 */}
            {isSelected && (
              <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.4, 0.5, 32]} />
                <meshBasicMaterial color={color} opacity={0.6} transparent />
              </mesh>
            )}

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
              <div
                className="px-2 py-1 rounded shadow-lg text-xs font-medium whitespace-nowrap"
                style={{
                  backgroundColor: color,
                  color: "#fff",
                  opacity: isSelected ? 1 : 0.9,
                }}
              >
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {poi.name}
                </div>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
