import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useGraphEditorStore, useViewerStore, usePoiStore } from "@/stores";
import { threeToApi } from "@/lib/utils";
import { updateNode } from "@/api/graph";

const NODE_COLORS: Record<string, string> = {
  WAYPOINT: "#22d3ee",
  JUNCTION: "#f59e0b",
  POI: "#3b82f6",
  PASSAGE_ENTRY: "#4ade80",
  PASSAGE_EXIT: "#f87171",
};

const EDGE_COLORS: Record<string, string> = {
  HORIZONTAL: "#22d3ee",
  VERTICAL_STAIRCASE: "#f59e0b",
  VERTICAL_ELEVATOR: "#8b5cf6",
};

function projectPointOnEdge(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: ax, y: ay };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return { x: ax + t * dx, y: ay + t * dy };
}


export function GraphEditorOverlay() {
  const nodes = useGraphEditorStore((s) => s.nodes);
  const edges = useGraphEditorStore((s) => s.edges);
  const editorMode = useGraphEditorStore((s) => s.editorMode);
  const selectedNodeId = useGraphEditorStore((s) => s.selectedNodeId);
  const selectedEdgeId = useGraphEditorStore((s) => s.selectedEdgeId);
  const edgeSourceNodeId = useGraphEditorStore((s) => s.edgeSourceNodeId);
  const selectNode = useGraphEditorStore((s) => s.selectNode);
  const selectEdge = useGraphEditorStore((s) => s.selectEdge);
  const setEdgeSource = useGraphEditorStore((s) => s.setEdgeSource);
  const createEdge = useGraphEditorStore((s) => s.createEdge);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const isPlacementMode = usePoiStore((s) => s.isPlacementMode);
  const setPendingPoiTarget = usePoiStore((s) => s.setPendingPoiTarget);

  // 노드 드래그 상태
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<THREE.Vector3 | null>(null);
  const { raycaster, camera, pointer } = useThree();

  const nodePositions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    nodes.forEach((node) => {
      map.set(node.id, new THREE.Vector3(-node.x, node.z, node.y));
    });
    return map;
  }, [nodes]);

  // 드래그 시 바닥 평면에 투영
  const floorY = useMemo(() => {
    if (nodes.length === 0) return 0;
    const zValues = nodes.map((n) => n.z);
    zValues.sort((a, b) => a - b);
    return zValues[Math.floor(zValues.length * 0.5)] ?? 0;
  }, [nodes]);

  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY), [floorY]);

  const handleDragMove = useCallback(() => {
    if (!dragNodeId) return;
    raycaster.setFromCamera(pointer, camera);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, intersection);
    if (intersection) {
      setDragPos(intersection.clone());
    }
  }, [dragNodeId, raycaster, camera, pointer, dragPlane]);

  const handleDragEnd = useCallback(() => {
    if (!dragNodeId || !dragPos) {
      setDragNodeId(null);
      setDragPos(null);
      return;
    }
    const apiCoords = threeToApi(dragPos.x, dragPos.y, dragPos.z);
    updateNode(dragNodeId, { x: apiCoords.x, y: apiCoords.y, z: apiCoords.z })
      .then(() => {
        useGraphEditorStore.getState().fetchGraph(selectedFloorId!);
      })
      .catch(() => {});
    setDragNodeId(null);
    setDragPos(null);
  }, [dragNodeId, dragPos, selectedFloorId]);

  // Track space key to suppress clicks during camera navigation
  const spaceHeldRef = useRef(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === "Space") spaceHeldRef.current = true; };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") spaceHeldRef.current = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const isInteractive = editorMode === "view" || editorMode === "select" || editorMode === "add-edge" || isPlacementMode;
  const showEdgeHitArea = editorMode === "view" || editorMode === "select" || isPlacementMode;

  function handleNodeClick(e: ThreeEvent<MouseEvent>, nodeId: string) {
    e.stopPropagation();
    if (spaceHeldRef.current) return;

    if (isPlacementMode) {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setPendingPoiTarget({
          x: node.x, y: node.y, z: node.z,
          targetNodeId: node.id,
        });
      }
      return;
    }

    if (editorMode === "view" || editorMode === "select") {
      selectNode(nodeId);
      return;
    }

    if (editorMode === "add-edge") {
      if (!edgeSourceNodeId) {
        setEdgeSource(nodeId);
      } else if (edgeSourceNodeId !== nodeId && selectedFloorId) {
        const verticalEdgeType = useGraphEditorStore.getState().verticalEdgeType;
        if (verticalEdgeType) {
          // 수직 연결: 엣지 생성 + 양쪽 노드 타입 변경
          createEdge(selectedFloorId, edgeSourceNodeId, nodeId, verticalEdgeType, true);
          updateNode(edgeSourceNodeId, { type: "PASSAGE_ENTRY" }).catch(() => {});
          updateNode(nodeId, { type: "PASSAGE_EXIT" }).catch(() => {});
        } else {
          createEdge(selectedFloorId, edgeSourceNodeId, nodeId);
        }
        setEdgeSource(nodeId); // 체이닝: 현재 노드가 다음 시작점
      }
      return;
    }
  }

  function handleEdgeClick(e: ThreeEvent<MouseEvent>, edgeId: string) {
    e.stopPropagation();
    if (spaceHeldRef.current) return;

    if (isPlacementMode) {
      const clickApi = threeToApi(e.point.x, e.point.y, e.point.z);
      const edge = edges.find((ed) => ed.id === edgeId);
      if (edge) {
        const fromNode = nodes.find((n) => n.id === edge.fromNodeId);
        const toNode = nodes.find((n) => n.id === edge.toNodeId);
        if (fromNode && toNode) {
          const proj = projectPointOnEdge(clickApi.x, clickApi.y, fromNode.x, fromNode.y, toNode.x, toNode.y);
          setPendingPoiTarget({
            x: proj.x, y: proj.y, z: clickApi.z,
            splitEdge: {
              edgeId: edge.id,
              fromNodeId: edge.fromNodeId,
              toNodeId: edge.toNodeId,
            },
          });
        }
      }
      return;
    }

    if (editorMode === "view" || editorMode === "select") {
      selectEdge(edgeId);
    }
  }

  // Long press for node type change (only on unselected nodes)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  function cancelLongPress() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleNodePointerDown(e: ThreeEvent<PointerEvent>, nodeId: string) {
    if ((editorMode !== "view" && editorMode !== "select") || isPlacementMode) return;
    e.stopPropagation();
    didLongPressRef.current = false;

    if (nodeId === selectedNodeId) {
      // Already selected → drag, no long press
      setDragNodeId(nodeId);
    } else {
      // Not selected → long press for type change
      longPressTimerRef.current = setTimeout(() => {
        didLongPressRef.current = true;
        useGraphEditorStore.getState().setLongPressNodeId(nodeId);
      }, 600);
    }
  }

  function handleNodePointerUp() {
    cancelLongPress();
  }

  // Cancel long press if pointer moves (user is panning)
  function handleNodePointerMove() {
    cancelLongPress();
  }

  const isPassageNode = (type: string) => type === "PASSAGE_ENTRY" || type === "PASSAGE_EXIT";

  return (
    <group
      onPointerMove={dragNodeId ? handleDragMove : undefined}
      onPointerUp={dragNodeId ? handleDragEnd : undefined}
    >
      {/* Drag plane (invisible, active during drag) */}
      {dragNodeId && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, 0]}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
        >
          <planeGeometry args={[500, 500]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
        </mesh>
      )}

      {/* Edges */}
      {edges.map((edge) => {
        const fromPos = nodePositions.get(edge.fromNodeId);
        const toPos = nodePositions.get(edge.toNodeId);
        if (!fromPos || !toPos) return null;

        const isSelected = edge.id === selectedEdgeId;
        const color = isSelected ? "#ffffff" : EDGE_COLORS[edge.edgeType] ?? "#22d3ee";

        const direction = new THREE.Vector3().subVectors(toPos, fromPos);
        const length = direction.length();
        const center = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());

        return (
          <group key={`edge-${edge.id}`}>
            <Line
              points={[fromPos, toPos]}
              color={color}
              lineWidth={isSelected ? 4 : 2.5}
              dashed={!edge.isBidirectional}
              dashScale={5}
              transparent
              opacity={0.9}
            />
            {showEdgeHitArea && (
              <mesh
                position={center}
                quaternion={quaternion}
                onClick={(e) => handleEdgeClick(e, edge.id)}
              >
                <cylinderGeometry args={[0.25, 0.25, length, 8]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const isDragging = node.id === dragNodeId;
        const pos = isDragging && dragPos ? dragPos : nodePositions.get(node.id);
        if (!pos) return null;

        const isSelected = node.id === selectedNodeId;
        const isEdgeSource = node.id === edgeSourceNodeId;
        const color = isSelected
          ? "#ffffff"
          : isEdgeSource
            ? "#fbbf24"
            : NODE_COLORS[node.type] ?? "#22d3ee";

        const radius = isSelected || isEdgeSource
          ? 0.45
          : isPassageNode(node.type)
            ? 0.4
            : node.type === "JUNCTION"
              ? 0.35
              : 0.3;

        return (
          <group key={`node-${node.id}`}>
            <mesh
              position={pos}
              onClick={(e) => { if (didLongPressRef.current) { didLongPressRef.current = false; return; } handleNodeClick(e, node.id); }}
              onPointerDown={(e) => handleNodePointerDown(e, node.id)}
              onPointerUp={handleNodePointerUp}
              onPointerMove={handleNodePointerMove}
              onPointerLeave={handleNodePointerUp}
              onPointerOver={() => {
                if (isInteractive) document.body.style.cursor = isSelected ? "grab" : "pointer";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "auto";
              }}
            >
              {isPassageNode(node.type) ? (
                <octahedronGeometry args={[radius]} />
              ) : (
                <sphereGeometry args={[radius, 16, 16]} />
              )}
              <meshBasicMaterial color={color} />
            </mesh>
            {isSelected && !isDragging && (
              <mesh position={pos}>
                {isPassageNode(node.type) ? (
                  <octahedronGeometry args={[radius + 0.08]} />
                ) : (
                  <sphereGeometry args={[radius + 0.08, 16, 16]} />
                )}
                <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
