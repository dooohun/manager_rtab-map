import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { Skeleton } from "@/components/ui/skeleton";
import { useViewerStore, usePoiStore, useGraphEditorStore } from "@/stores";
import { threeToApi } from "@/lib/utils";
import { POIOverlay } from "./POIOverlay";
import { PendingPOIMarker } from "./PendingPOIMarker";
import { PointcloudMesh } from "./PointcloudMesh";
import { GraphEditorOverlay } from "./GraphEditorOverlay";

/* ── 상수 ──────────────────────────────────────────────────────── */
const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"]);
const MOUSE_SENSITIVITY = 0.002;
const MOVE_SPEED = 5;
const BOOST_MULTIPLIER = 3;
const MAX_PITCH = Math.PI / 2 - 0.05;

/* ── 전역 키 상태 (컴포넌트 마운트/언마운트와 무관하게 유지) ──── */
const globalKeys = new Set<string>();
(() => {
  const onDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (MOVE_KEYS.has(e.code)) { e.preventDefault(); globalKeys.add(e.code); }
  };
  const onUp = (e: KeyboardEvent) => globalKeys.delete(e.code);
  const onBlur = () => globalKeys.clear();
  window.addEventListener("keydown", onDown, true);
  window.addEventListener("keyup", onUp, true);
  window.addEventListener("blur", onBlur);
})();

/* ── FPS 카메라 위치 공유 (Space 배치에서 사용) ──────────────────── */
let _fpsCameraPos: { x: number; y: number; z: number } | null = null;
/** PointcloudMesh에서 계산한 바닥 Y값 공유 */
export let _floorY = 0;
export function setFloorY(y: number) { _floorY = y; }

/* ── FPS Camera Controller ─────────────────────────────────────── */
function FPSCameraController() {
  const { camera, gl, raycaster } = useThree();
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const initRef = useRef(false);

  // FPS 진입 시 현재 카메라 방향에서 yaw/pitch 동기화 + bounds 중심으로 이동
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const floorPath = useViewerStore.getState().floorPath;
    if (floorPath?.bounds) {
      const { minX, maxX, minY, maxY } = floorPath.bounds;
      const cx = (minX + maxX) / 2;
      const cz = (minY + maxY) / 2;
      camera.position.set(cx, 1.6, cz); // 사람 눈높이
    }

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    yawRef.current = Math.atan2(-dir.x, -dir.z);
    pitchRef.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1))));
  }, [camera]);

  // Pointer Lock mousemove
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      yawRef.current -= e.movementX * MOUSE_SENSITIVITY;
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current - e.movementY * MOUSE_SENSITIVITY,
        -MAX_PITCH, MAX_PITCH
      );
    };
    document.addEventListener("mousemove", onMouseMove);
    return () => document.removeEventListener("mousemove", onMouseMove);
  }, [gl]);

  useFrame((state, dt) => {
    // 회전 적용 (매 프레임)
    const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, "YXZ");
    camera.quaternion.setFromEuler(euler);

    // FPS 모드: pointer를 화면 중앙으로 강제 (에임 = 클릭 타겟)
    state.pointer.set(0, 0);
    raycaster.setFromCamera(state.pointer, camera);

    // 이동
    if (globalKeys.size === 0) return;
    const boosted = globalKeys.has("ShiftLeft") || globalKeys.has("ShiftRight");
    const step = MOVE_SPEED * Math.min(dt, 0.05) * (boosted ? BOOST_MULTIPLIER : 1);
    const q = camera.quaternion;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    right.y = 0;
    right.normalize();

    const delta = new THREE.Vector3();
    if (globalKeys.has("KeyW") || globalKeys.has("ArrowUp")) delta.addScaledVector(forward, step);
    if (globalKeys.has("KeyS") || globalKeys.has("ArrowDown")) delta.addScaledVector(forward, -step);
    if (globalKeys.has("KeyA") || globalKeys.has("ArrowLeft")) delta.addScaledVector(right, -step);
    if (globalKeys.has("KeyD") || globalKeys.has("ArrowRight")) delta.addScaledVector(right, step);
    if (globalKeys.has("KeyQ")) delta.y += step;
    if (globalKeys.has("KeyE")) delta.y -= step;

    if (delta.lengthSq() > 0) camera.position.add(delta);

    // Space 배치용 카메라 위치 공유
    _fpsCameraPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  });

  return null;
}

/* ── Orbit Camera Controller ───────────────────────────────────── */
function OrbitCameraController() {
  const viewMode = useViewerStore((s) => s.viewMode);
  const floorPath = useViewerStore((s) => s.floorPath);
  const isPlacementMode = usePoiStore((s) => s.isPlacementMode);
  const editorMode = useGraphEditorStore((s) => s.editorMode);
  const { camera } = useThree();
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);

  useEffect(() => {
    if (!controlsRef.current) return;
    const c = controlsRef.current;
    if (viewMode === "top-down") {
      camera.position.set(0, 20, 0);
      camera.lookAt(0, 0, 0);
      c.maxPolarAngle = 0;
      c.minPolarAngle = 0;
    } else {
      camera.position.set(5, 5, 5);
      camera.lookAt(0, 0, 0);
      c.maxPolarAngle = Math.PI;
      c.minPolarAngle = 0;
    }
    c.update();
  }, [viewMode, camera]);

  useEffect(() => {
    if (!floorPath?.bounds || !controlsRef.current) return;
    const { minX, maxX, minY, maxY } = floorPath.bounds;
    const cx = (minX + maxX) / 2;
    const cz = (minY + maxY) / 2;
    const dist = Math.max(maxX - minX, maxY - minY) * 1.5;
    if (viewMode === "top-down") {
      camera.position.set(cx, dist, cz);
    } else {
      camera.position.set(cx + dist * 0.5, dist * 0.5, cz + dist * 0.5);
    }
    camera.lookAt(cx, 0, cz);
    controlsRef.current.target.set(cx, 0, cz);
    controlsRef.current.update();
  }, [floorPath, camera, viewMode]);

  const orbitTarget = useViewerStore((s) => s.orbitTarget);
  useEffect(() => {
    if (!orbitTarget || !controlsRef.current) return;
    controlsRef.current.target.set(orbitTarget.x, orbitTarget.y, orbitTarget.z);
    controlsRef.current.update();
    useViewerStore.getState().setOrbitTarget(null);
  }, [orbitTarget]);

  // Space 키
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); setSpaceHeld(true); }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, []);

  // WASD 이동 (orbit 모드)
  useFrame((_, dt) => {
    if (!controlsRef.current || globalKeys.size === 0) return;
    const controls = controlsRef.current;
    const boosted = globalKeys.has("ShiftLeft") || globalKeys.has("ShiftRight");
    const step = MOVE_SPEED * Math.min(dt, 0.05) * (boosted ? BOOST_MULTIPLIER : 1);
    const forward = new THREE.Vector3().subVectors(controls.target, camera.position);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) return;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const delta = new THREE.Vector3();
    if (globalKeys.has("KeyW") || globalKeys.has("ArrowUp")) delta.addScaledVector(forward, step);
    if (globalKeys.has("KeyS") || globalKeys.has("ArrowDown")) delta.addScaledVector(forward, -step);
    if (globalKeys.has("KeyA") || globalKeys.has("ArrowLeft")) delta.addScaledVector(right, -step);
    if (globalKeys.has("KeyD") || globalKeys.has("ArrowRight")) delta.addScaledVector(right, step);
    if (globalKeys.has("KeyQ")) delta.y += step;
    if (globalKeys.has("KeyE")) delta.y -= step;
    if (delta.lengthSq() > 0) {
      controls.enableDamping = false;
      camera.position.add(delta);
      controls.target.add(delta);
      controls.update();
      controls.enableDamping = true;
    }
  });

  const isNodePlacement = isPlacementMode || editorMode === "add-node";
  const allowRotate = !isNodePlacement || spaceHeld;

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={allowRotate}
      enableZoom enablePan enableDamping
      dampingFactor={0.1}
      rotateSpeed={0.5} zoomSpeed={0.8} panSpeed={0.8}
      keys={{ LEFT: "", UP: "", RIGHT: "", BOTTOM: "" }}
      makeDefault
    />
  );
}

/* ── Scene ──────────────────────────────────────────────────────── */
function SceneContent() {
  const viewMode = useViewerStore((s) => s.viewMode);
  const showPointcloud = useViewerStore((s) => s.showPointcloud);
  const plyUrl = useViewerStore((s) => s.plyUrl);
  const isEditorActive = useGraphEditorStore((s) => s.isEditorActive);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <Grid
        args={[100, 100]}
        cellSize={1} cellThickness={0.5} cellColor="#3f3f46"
        sectionSize={5} sectionThickness={1} sectionColor="#52525b"
        fadeDistance={50} fadeStrength={1} infiniteGrid
        position={[0, -0.01, 0]}
      />
      {showPointcloud && <PointcloudMesh plyUrl={plyUrl} />}
      {isEditorActive && <GraphEditorOverlay />}
      <POIOverlay />
      <PendingPOIMarker />
      {viewMode === "fps" ? <FPSCameraController /> : <OrbitCameraController />}
    </>
  );
}

/* ── Crosshair ─────────────────────────────────────────────────── */
function Crosshair() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
      <div className="relative w-6 h-6">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/70 -translate-x-1/2" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/70 -translate-y-1/2" />
      </div>
    </div>
  );
}

/* ── Mode Bar ──────────────────────────────────────────────────── */
const MODE_SLOTS = [
  { key: "1", id: "view", label: "보기" },
  { key: "2", id: "waypoint", label: "노드" },
  { key: "3", id: "edge", label: "엣지" },
  { key: "4", id: "select", label: "선택" },
  { key: "5", id: "staircase", label: "계단" },
  { key: "6", id: "elevator", label: "엘리베이터" },
  { key: "7", id: "poi", label: "POI" },
] as const;

function selectMode(slotId: string) {
  const store = useGraphEditorStore.getState();
  const poi = usePoiStore.getState();
  switch (slotId) {
    case "view": store.setEditorMode("view"); poi.setPlacementMode(false); break;
    case "waypoint": store.setEditorMode("add-node"); store.setNodeTypeToPlace("WAYPOINT"); poi.setPlacementMode(false); break;
    case "edge": store.setEditorMode("add-edge"); store.setVerticalEdgeType(null); poi.setPlacementMode(false); break;
    case "select": store.setEditorMode("select"); poi.setPlacementMode(false); break;
    case "staircase":
      store.setEditorMode("add-edge");
      store.setVerticalEdgeType("VERTICAL_STAIRCASE");
      store.setEdgeSource(null);
      poi.setPlacementMode(false);
      break;
    case "elevator":
      store.setEditorMode("add-edge");
      store.setVerticalEdgeType("VERTICAL_ELEVATOR");
      store.setEdgeSource(null);
      poi.setPlacementMode(false);
      break;
    case "poi": store.setEditorMode("view"); poi.setPlacementMode(true); break;
  }
}

function ModeBar({ isFps }: { isFps: boolean }) {
  const editorMode = useGraphEditorStore((s) => s.editorMode);
  const isPlacementMode = usePoiStore((s) => s.isPlacementMode);
  const nodeTypeToPlace = useGraphEditorStore((s) => s.nodeTypeToPlace);
  const autoConnect = useGraphEditorStore((s) => s.autoConnect);
  const verticalEdgeType = useGraphEditorStore((s) => s.verticalEdgeType);
  const edgeSourceNodeId = useGraphEditorStore((s) => s.edgeSourceNodeId);
  const floors = useViewerStore((s) => s.floors);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const currentFloorIdx = floors.findIndex((f) => f.id === selectedFloorId);
  const currentFloor = currentFloorIdx >= 0 ? floors[currentFloorIdx] : null;

  let activeId = "view";
  if (isPlacementMode) activeId = "poi";
  else if (editorMode === "add-node") {
    if (nodeTypeToPlace === "STAIRCASE") activeId = "staircase";
    else if (nodeTypeToPlace === "ELEVATOR") activeId = "elevator";
    else activeId = "waypoint";
  } else if (editorMode === "add-edge") {
    if (verticalEdgeType === "VERTICAL_STAIRCASE") activeId = "staircase";
    else if (verticalEdgeType === "VERTICAL_ELEVATOR") activeId = "elevator";
    else activeId = "edge";
  } else if (editorMode === "select") activeId = "select";

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
      <div className="flex gap-1">
        {MODE_SLOTS.map((slot) => {
          const active = slot.id === activeId;
          return (
            <button
              key={slot.id}
              onClick={() => selectMode(slot.id)}
              className={`flex flex-col items-center px-3 py-1.5 rounded transition-all cursor-pointer ${
                active ? "bg-white/20 border border-white/50" : "bg-black/40 border border-transparent hover:bg-white/10"
              }`}
            >
              <span className={`text-[10px] ${active ? "text-white" : "text-zinc-500"}`}>{slot.key}</span>
              <span className={`text-xs ${active ? "text-white font-medium" : "text-zinc-400"}`}>{slot.label}</span>
            </button>
          );
        })}
      </div>
      {verticalEdgeType && edgeSourceNodeId && (
        <div className="mt-1.5 text-center text-xs text-amber-400 pointer-events-none">
          {verticalEdgeType === "VERTICAL_STAIRCASE" ? "계단" : "엘리베이터"} 연결 중
          · Z/X로 다른 층 이동 → 노드 클릭으로 연결
        </div>
      )}
      <div className="flex justify-center gap-3 mt-1.5 text-[10px] pointer-events-none">
        <span className={autoConnect ? "text-emerald-400" : "text-zinc-600"}>
          T: 자동연결 {autoConnect ? "ON" : "OFF"}
        </span>
        {currentFloor && (
          <span className="text-zinc-400">
            Z/X: 층 이동 · {currentFloor.level}F
          </span>
        )}
        <span className="text-zinc-500">
          {isFps ? "Shift: 부스터 · ESC: 나가기" : "더블클릭: FPS 진입"}
        </span>
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────── */
function LoadingPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Skeleton className="w-full h-full rounded-lg" />
    </div>
  );
}

export function PointCloudViewer() {
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const viewMode = useViewerStore((s) => s.viewMode);
  const isPlacementMode = usePoiStore((s) => s.isPlacementMode);
  const editorMode = useGraphEditorStore((s) => s.editorMode);
  const isAddingNode = editorMode === "add-node";
  const isFps = viewMode === "fps";

  // Pointer Lock ↔ viewMode 동기화
  useEffect(() => {
    const onChange = () => {
      const locked = !!document.pointerLockElement;
      const cur = useViewerStore.getState().viewMode;
      if (locked && cur !== "fps") useViewerStore.getState().setViewMode("fps");
      else if (!locked && cur === "fps") useViewerStore.getState().setViewMode("orbit");
    };
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, []);

  // 단축키 통합
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // 1-7: 편집 모드 전환
      const modeMap: Record<string, string> = {
        Digit1: "view", Digit2: "waypoint", Digit3: "edge", Digit4: "select",
        Digit5: "staircase", Digit6: "elevator", Digit7: "poi",
      };
      if (modeMap[e.code]) { e.preventDefault(); selectMode(modeMap[e.code]); return; }

      const gs = useGraphEditorStore.getState();
      const vs = useViewerStore.getState();
      const ps = usePoiStore.getState();

      switch (e.code) {
        // T: 자동 연결 토글
        case "KeyT":
          e.preventDefault();
          gs.setAutoConnect(!gs.autoConnect);
          break;

        // Z/X: 이전/다음 층
        case "KeyZ": {
          e.preventDefault();
          const floors = vs.floors;
          const idx = floors.findIndex((f) => f.id === vs.selectedFloorId);
          if (idx > 0) vs.loadFloorData(floors[idx - 1].id);
          break;
        }
        case "KeyX": {
          e.preventDefault();
          const floors = vs.floors;
          const idx = floors.findIndex((f) => f.id === vs.selectedFloorId);
          if (idx >= 0 && idx < floors.length - 1) vs.loadFloorData(floors[idx + 1].id);
          break;
        }

        // Space: FPS 모드에서 현재 위치에 노드/POI 배치
        case "Space": {
          if (vs.viewMode !== "fps") break; // orbit에서는 기존 동작 유지
          e.preventDefault();
          const cam = document.querySelector("canvas");
          if (!cam || !selectedFloorId) break;

          // 카메라 위치를 API 좌표로 변환 (Three.js x,y,z → API x=x, y=z, z=y)
          // threeToApi: { x, y: z, z: y } 참조
          const editorMode = gs.editorMode;
          const isNodeMode = editorMode === "add-node";
          const isPoiMode = ps.isPlacementMode;

          if (isNodeMode) {
            if (_fpsCameraPos) {
              const api = threeToApi(_fpsCameraPos.x, _floorY, _fpsCameraPos.z);
              gs.createNode(selectedFloorId, api.x, api.y, api.z, gs.nodeTypeToPlace as any);
            }
          } else if (isPoiMode) {
            if (_fpsCameraPos && gs.nodes.length > 0) {
              const api = threeToApi(_fpsCameraPos.x, _floorY, _fpsCameraPos.z);
              let closest = gs.nodes[0];
              let minDist = Infinity;
              for (const n of gs.nodes) {
                const dx = n.x - api.x;
                const dy = n.y - api.y;
                const d = dx * dx + dy * dy;
                if (d < minDist) { minDist = d; closest = n; }
              }
              ps.setPendingPoiTarget({ x: closest.x, y: closest.y, z: closest.z, targetNodeId: closest.id });
            }
          }
          break;
        }

        case "Delete": case "Backspace":
          e.preventDefault();
          if ((gs.selectedNodeId || gs.selectedEdgeId) && selectedFloorId) gs.deleteSelected(selectedFloorId);
          break;
        case "Escape":
          e.preventDefault();
          if (document.pointerLockElement) document.exitPointerLock();
          else if (gs.pendingPassageLink) gs.setPendingPassageLink(null);
          else if (gs.edgeSourceNodeId) gs.setEdgeSource(null);
          else if (gs.pendingPassageInfo) gs.setPendingPassageInfo(null);
          else { gs.selectNode(null); gs.selectEdge(null); }
          break;
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [selectedFloorId]);

  if (!selectedFloorId) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <p className="text-sm text-muted-foreground">상단에서 층을 선택하세요</p>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full overflow-hidden bg-zinc-950 relative"
      style={{ cursor: !isFps && (isPlacementMode || isAddingNode) ? "crosshair" : undefined }}
    >
      {isFps && <Crosshair />}
      <ModeBar isFps={isFps} />
      <Suspense fallback={<LoadingPlaceholder />}>
        <Canvas
          camera={{ position: [5, 5, 5], fov: 60, near: 0.01, far: 500 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
          style={{ width: "100%", height: "100%" }}
          tabIndex={0}
          onDoubleClick={(e) => {
            if (!document.pointerLockElement) {
              (e.target as HTMLCanvasElement).requestPointerLock();
            }
          }}
          onPointerMissed={() => {
            if (isFps) return;
            const s = useGraphEditorStore.getState();
            s.selectNode(null);
            s.selectEdge(null);
          }}
        >
          <SceneContent />
        </Canvas>
      </Suspense>
    </div>
  );
}
