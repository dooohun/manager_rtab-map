import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { Line } from "@react-three/drei";
import { useViewerStore, useGraphEditorStore } from "@/stores";
import { getFloorPlyUrl } from "@/api/floors";
import * as graphApi from "@/api/graph";
import { apiToThree } from "@/lib/utils";
import type { FloorResponse, PathNodeResponse, PathEdgeResponse } from "@/types";

interface FloorData {
  floor: FloorResponse;
  geometry: THREE.BufferGeometry | null;
  nodes: PathNodeResponse[];
  edges: PathEdgeResponse[];
  yOffset: number;
}

/** 다층 3D 뷰: 모든 층의 PLY + 노드를 수직으로 쌓아서 표시 */
export function MultiFloorView() {
  const floors = useViewerStore((s) => s.floors);
  const [floorDataList, setFloorDataList] = useState<FloorData[]>([]);
  const verticalSource = useGraphEditorStore((s) => s.edgeSourceNodeId);

  // 모든 층의 PLY + 그래프 로드
  useEffect(() => {
    if (floors.length === 0) return;

    let cancelled = false;
    const loader = new PLYLoader();

    async function loadAll() {
      const results: FloorData[] = [];
      let yOffset = 0;

      for (const floor of floors) {
        // 그래프 로드
        let nodes: PathNodeResponse[] = [];
        let edges: PathEdgeResponse[] = [];
        try {
          const graph = await graphApi.getFloorGraph(floor.id);
          nodes = graph.nodes;
          edges = graph.edges;
        } catch { /* 그래프 없는 층은 빈 배열 */ }

        // PLY 로드
        const plyUrl = getFloorPlyUrl(floor.id);
        let geometry: THREE.BufferGeometry | null = null;
        try {
          geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
            loader.load(plyUrl, (geo) => {
              // API → Three.js 좌표 변환 (Y↔Z 스왑)
              const positions = geo.getAttribute("position");
              if (positions) {
                const array = positions.array as Float32Array;
                for (let i = 0; i < array.length; i += 3) {
                  const apiY = array[i + 1];
                  const apiZ = array[i + 2];
                  array[i + 1] = apiZ;
                  array[i + 2] = apiY;
                }
                positions.needsUpdate = true;
              }
              geo.computeBoundingBox();
              geo.computeBoundingSphere();
              resolve(geo);
            }, undefined, reject);
          });
        } catch { /* PLY 없는 층 */ }

        const height = geometry?.boundingBox
          ? geometry.boundingBox.max.y - geometry.boundingBox.min.y
          : 3;

        results.push({ floor, geometry, nodes, edges, yOffset });
        yOffset += height + 2; // 층 간 2m 간격
      }

      if (!cancelled) setFloorDataList(results);
    }

    loadAll();
    return () => { cancelled = true; };
  }, [floors]);

  if (floorDataList.length === 0) return null;

  return (
    <group>
      {floorDataList.map((fd) => (
        <FloorLayer key={fd.floor.id} data={fd} />
      ))}
    </group>
  );
}

/** 개별 층 레이어 */
function FloorLayer({ data }: { data: FloorData }) {
  const { floor, geometry, nodes, edges, yOffset } = data;
  const editorMode = useGraphEditorStore((s) => s.editorMode);
  const edgeSourceNodeId = useGraphEditorStore((s) => s.edgeSourceNodeId);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);

  const handleNodeClick = (node: PathNodeResponse) => {
    const gs = useGraphEditorStore.getState();

    if (editorMode === "add-edge") {
      if (!gs.edgeSourceNodeId) {
        gs.setEdgeSource(node.id);
      } else {
        // 수직 엣지 생성 (연속 연결)
        const edgeType = gs.nodeTypeToPlace === "ELEVATOR"
          ? "VERTICAL_ELEVATOR" as const
          : "VERTICAL_STAIRCASE" as const;
        gs.createEdge(floor.id, gs.edgeSourceNodeId, node.id, edgeType, true);
        gs.setEdgeSource(node.id); // 체이닝
      }
    } else if (editorMode === "select") {
      gs.selectNode(node.id);
    }
  };

  return (
    <group position={[0, yOffset, 0]}>
      {/* 층 라벨 */}
      {/* PLY */}
      {geometry && (
        <points frustumCulled={false}>
          <primitive object={geometry} attach="geometry" />
          <pointsMaterial
            size={0.04}
            vertexColors={!!geometry.getAttribute("color")}
            opacity={0.6}
            transparent
            sizeAttenuation
          />
        </points>
      )}

      {/* 노드 */}
      {nodes.map((node) => {
        const [x, y, z] = apiToThree(node);
        const isSource = edgeSourceNodeId === node.id;
        return (
          <mesh
            key={node.id}
            position={[x, y, z]}
            onClick={(e) => { e.stopPropagation(); handleNodeClick(node); }}
          >
            <sphereGeometry args={[isSource ? 0.25 : 0.15, 12, 12]} />
            <meshBasicMaterial color={isSource ? "#ffffff" : "#22d3ee"} />
          </mesh>
        );
      })}

      {/* 엣지 */}
      {edges.map((edge) => {
        const from = nodes.find((n) => n.id === edge.fromNodeId);
        const to = nodes.find((n) => n.id === edge.toNodeId);
        if (!from || !to) return null;
        const color = edge.edgeType === "VERTICAL_STAIRCASE" ? "#f59e0b"
          : edge.edgeType === "VERTICAL_ELEVATOR" ? "#8b5cf6"
          : "#22d3ee";
        return (
          <Line
            key={edge.id}
            points={[apiToThree(from), apiToThree(to)]}
            color={color}
            lineWidth={2}
          />
        );
      })}
    </group>
  );
}
