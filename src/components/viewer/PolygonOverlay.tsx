import { useEffect, useMemo, useState, useCallback } from "react";
import { Line } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useGraphEditorStore, usePolygonStore, useViewerStore } from "@/stores";
import { apiToThree, threeToApi } from "@/lib/utils";

/**
 * area의 saved corner polygons + 코너 작성 중 draft vertices를 3D 위에 표시.
 * - saved: 폐곡선(호박색) + 각 vertex sphere — sphere를 드래그하면 polygon vertex 위치
 *   조정 후 PUT으로 통째 교체.
 * - draft: 노란 vertex sphere + 연결선 + 닫힘 점선.
 *
 * R3F native `<line>`은 OS-dependent linewidth(1px)라 안 보임. drei `<Line>`은
 * lineWidth 인자가 실제 pixel로 동작.
 */
export function PolygonOverlay() {
  const editorMode = useGraphEditorStore((s) => s.editorMode);
  const selectedAreaId = useViewerStore((s) => s.selectedAreaId);
  const polygons = usePolygonStore((s) => s.polygons);
  const draftVertices = usePolygonStore((s) => s.draftVertices);
  const fetchPolygons = usePolygonStore((s) => s.fetchPolygons);
  const updatePolygon = usePolygonStore((s) => s.updatePolygon);

  const { camera, raycaster, pointer } = useThree();

  useEffect(() => {
    if (selectedAreaId) fetchPolygons(selectedAreaId);
  }, [selectedAreaId, fetchPolygons]);

  // Drag state — saved polygon vertex 위치 미세조정
  const [dragRef, setDragRef] = useState<{ polygonId: string; vertexIdx: number } | null>(null);
  const [dragPos, setDragPos] = useState<THREE.Vector3 | null>(null);

  // 드래그 평면: 첫 polygon의 평균 z를 floor 평면으로 가정
  const floorY = useMemo(() => {
    if (polygons.length === 0) return 0;
    const zs: number[] = [];
    polygons.forEach((p) => p.vertices.forEach((v) => zs.push(v.z)));
    if (zs.length === 0) return 0;
    zs.sort((a, b) => a - b);
    return zs[Math.floor(zs.length / 2)] ?? 0;
  }, [polygons]);

  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY), [floorY]);

  useFrame(() => {
    if (!dragRef) return;
    raycaster.setFromCamera(pointer, camera);
    const out = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, out)) {
      setDragPos(out.clone());
    }
  });

  const handleVertexDown = useCallback((e: ThreeEvent<PointerEvent>, polygonId: string, vertexIdx: number) => {
    if (editorMode !== "view" && editorMode !== "select" && editorMode !== "add-corner") return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragRef({ polygonId, vertexIdx });
  }, [editorMode]);

  const handleVertexUp = useCallback(async () => {
    if (!dragRef || !dragPos) {
      setDragRef(null);
      setDragPos(null);
      return;
    }
    const apiCoords = threeToApi(dragPos.x, dragPos.y, dragPos.z);
    const polygon = polygons.find((p) => p.polygonId === dragRef.polygonId);
    if (polygon) {
      const next = polygon.vertices.slice();
      next[dragRef.vertexIdx] = { x: apiCoords.x, y: apiCoords.y, z: apiCoords.z };
      try {
        await updatePolygon(dragRef.polygonId, { exterior: next });
      } catch { /* toast in store */ }
    }
    setDragRef(null);
    setDragPos(null);
  }, [dragRef, dragPos, polygons, updatePolygon]);

  const savedPolygons = useMemo(() => {
    return polygons
      .map((p) => {
        if (p.vertices.length === 0) return null;
        const pts = p.vertices.map((v, idx) => {
          // 드래그 중인 vertex는 dragPos로 임시 표시
          if (dragRef?.polygonId === p.polygonId && dragRef.vertexIdx === idx && dragPos) {
            return [dragPos.x, dragPos.y, dragPos.z] as [number, number, number];
          }
          return apiToThree(v);
        });
        return { polygonId: p.polygonId, vertices: p.vertices, points: [...pts, pts[0]], rawPoints: pts };
      })
      .filter(Boolean) as Array<{
        polygonId: string;
        vertices: typeof polygons[number]["vertices"];
        points: [number, number, number][];
        rawPoints: [number, number, number][];
      }>;
  }, [polygons, dragRef, dragPos]);

  const draftPoints = useMemo(() => draftVertices.map((v) => apiToThree(v)), [draftVertices]);

  const closingSegment = useMemo(() => {
    if (draftPoints.length < 3) return null;
    return [draftPoints[draftPoints.length - 1], draftPoints[0]] as [
      [number, number, number],
      [number, number, number],
    ];
  }, [draftPoints]);

  return (
    <group>
      {savedPolygons.map(({ polygonId, points, rawPoints }) => (
        <group key={polygonId}>
          <Line points={points} color="#f59e0b" lineWidth={2.5} depthTest={false} />
          {rawPoints.map((pt, idx) => (
            <mesh
              key={`${polygonId}-v-${idx}`}
              position={pt}
              renderOrder={998}
              onPointerDown={(e) => handleVertexDown(e, polygonId, idx)}
              onPointerUp={handleVertexUp}
              onPointerOver={() => { document.body.style.cursor = "grab"; }}
              onPointerOut={() => { document.body.style.cursor = "auto"; }}
            >
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshBasicMaterial color="#f59e0b" depthTest={false} transparent opacity={0.95} />
            </mesh>
          ))}
        </group>
      ))}

      {editorMode === "add-corner" && draftPoints.length >= 2 && (
        <Line points={draftPoints} color="#facc15" lineWidth={3} depthTest={false} />
      )}

      {editorMode === "add-corner" && closingSegment && (
        <Line points={closingSegment} color="#facc15" lineWidth={2} dashed dashSize={0.15} gapSize={0.08} depthTest={false} />
      )}

      {editorMode === "add-corner" && draftPoints.map((pt, idx) => (
        <mesh key={`draft-${idx}`} position={pt} renderOrder={999}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshBasicMaterial color="#facc15" depthTest={false} transparent opacity={0.95} />
        </mesh>
      ))}
    </group>
  );
}
