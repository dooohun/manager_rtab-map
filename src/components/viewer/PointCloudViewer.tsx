import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { Skeleton } from "@/components/ui/skeleton";
import { useViewerStore, usePoiStore, useGraphEditorStore } from "@/stores";
import { POIOverlay } from "./POIOverlay";
import { PendingPOIMarker } from "./PendingPOIMarker";
import { PointcloudMesh } from "./PointcloudMesh";
import { GraphEditorOverlay } from "./GraphEditorOverlay";

function CameraController() {
  const viewMode = useViewerStore((s) => s.viewMode);
  const floorPath = useViewerStore((s) => s.floorPath);
  const isPlacementMode = usePoiStore((s) => s.isPlacementMode);
  const editorMode = useGraphEditorStore((s) => s.editorMode);
  const { camera } = useThree();
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    if (viewMode === "top-down") {
      camera.position.set(0, 20, 0);
      camera.lookAt(0, 0, 0);
      controls.maxPolarAngle = 0;
      controls.minPolarAngle = 0;
    } else if (viewMode === "first-person") {
      camera.position.set(0, 1, 0);
      camera.lookAt(1, 1, 0);
      controls.maxPolarAngle = Math.PI;
      controls.minPolarAngle = 0;
    } else {
      camera.position.set(5, 5, 5);
      camera.lookAt(0, 0, 0);
      controls.maxPolarAngle = Math.PI;
      controls.minPolarAngle = 0;
    }
    controls.update();
  }, [viewMode, camera]);

  useEffect(() => {
    if (!floorPath?.bounds || !controlsRef.current) return;

    const { minX, maxX, minY, maxY } = floorPath.bounds;
    const cx = (minX + maxX) / 2;
    const cz = (minY + maxY) / 2;
    const rangeX = maxX - minX;
    const rangeZ = maxY - minY;
    const dist = Math.max(rangeX, rangeZ) * 1.5;

    if (viewMode === "top-down") {
      camera.position.set(cx, dist, cz);
    } else {
      camera.position.set(cx + dist * 0.5, dist * 0.5, cz + dist * 0.5);
    }
    camera.lookAt(cx, 0, cz);
    controlsRef.current.target.set(cx, 0, cz);
    controlsRef.current.update();
  }, [floorPath, camera, viewMode]);

  // 클릭 네비게이션: orbitTarget이 설정되면 카메라를 해당 위치로 이동
  const orbitTarget = useViewerStore((s) => s.orbitTarget);
  useEffect(() => {
    if (!orbitTarget || !controlsRef.current) return;
    const controls = controlsRef.current;
    controls.target.set(orbitTarget.x, orbitTarget.y, orbitTarget.z);
    controls.update();
    useViewerStore.getState().setOrbitTarget(null);
  }, [orbitTarget]);

  // Space key tracking — hold space to enable camera movement in placement modes
  const [spaceHeld, setSpaceHeld] = useState(false);

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

  // WASD camera panning
  useEffect(() => {
    if (!controlsRef.current) return;
    const panSpeed = 0.5;
    const keysPressed = new Set<string>();

    const onDown = (e: KeyboardEvent) => { if (e.code !== "Space") keysPressed.add(e.code); };
    const onUp = (e: KeyboardEvent) => keysPressed.delete(e.code);

    const animationId = setInterval(() => {
      if (!controlsRef.current) return;
      const controls = controlsRef.current;
      let moved = false;
      const forward = new THREE.Vector3();
      const right = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0; forward.normalize();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      if (keysPressed.has("KeyW") || keysPressed.has("ArrowUp")) { controls.target.addScaledVector(forward, panSpeed); moved = true; }
      if (keysPressed.has("KeyS") || keysPressed.has("ArrowDown")) { controls.target.addScaledVector(forward, -panSpeed); moved = true; }
      if (keysPressed.has("KeyA") || keysPressed.has("ArrowLeft")) { controls.target.addScaledVector(right, -panSpeed); moved = true; }
      if (keysPressed.has("KeyD") || keysPressed.has("ArrowRight")) { controls.target.addScaledVector(right, panSpeed); moved = true; }
      if (moved) controls.update();
    }, 16);

    window.addEventListener("keydown", onDown, true);
    window.addEventListener("keyup", onUp, true);
    return () => { clearInterval(animationId); window.removeEventListener("keydown", onDown, true); window.removeEventListener("keyup", onUp, true); };
  }, [camera]);

  const isNodePlacement = isPlacementMode || editorMode === "add-node";
  // Space held → enable rotation/pan even in placement mode
  const allowRotate = !isNodePlacement || spaceHeld;

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={allowRotate}
      enableZoom={true}
      enablePan={true}
      enableDamping
      dampingFactor={0.1}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      panSpeed={0.8}
      makeDefault
    />
  );
}

function SceneContent() {
  const showPointcloud = useViewerStore((s) => s.showPointcloud);
  const plyUrl = useViewerStore((s) => s.plyUrl);
  const isEditorActive = useGraphEditorStore((s) => s.isEditorActive);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#3f3f46"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#52525b"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid
        position={[0, -0.01, 0]}
      />
      {showPointcloud && <PointcloudMesh plyUrl={plyUrl} />}
      {isEditorActive && <GraphEditorOverlay />}
      <POIOverlay />
      <PendingPOIMarker />
      <CameraController />
    </>
  );
}

function LoadingPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Skeleton className="w-full h-full rounded-lg" />
    </div>
  );
}

export function PointCloudViewer() {
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const isPlacementMode = usePoiStore((s) => s.isPlacementMode);
  const editorMode = useGraphEditorStore((s) => s.editorMode);
  const isEditorActive = useGraphEditorStore((s) => s.isEditorActive);
  const isAddingNode = editorMode === "add-node";

  // 단축키 (e.code 사용으로 키보드 레이아웃 무관하게 동작)
  useEffect(() => {
    if (!isEditorActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const store = useGraphEditorStore.getState();

      switch (e.code) {
        case "Digit1":
          e.preventDefault();
          store.setEditorMode("view");
          break;
        case "Digit2":
          e.preventDefault();
          store.setEditorMode("add-node");
          store.setNodeTypeToPlace("WAYPOINT");
          break;
        case "Digit3":
          e.preventDefault();
          store.setEditorMode("add-edge");
          break;
        case "Digit4":
          e.preventDefault();
          store.setEditorMode("select");
          break;
        case "Digit5":
          e.preventDefault();
          store.setEditorMode("add-node");
          store.setNodeTypeToPlace("STAIRCASE");
          break;
        case "Digit6":
          e.preventDefault();
          store.setEditorMode("add-node");
          store.setNodeTypeToPlace("ELEVATOR");
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          if (store.selectedNodeId || store.selectedEdgeId) {
            if (selectedFloorId) store.deleteSelected(selectedFloorId);
          }
          break;
        case "Escape":
          e.preventDefault();
          if (store.edgeSourceNodeId) {
            store.setEdgeSource(null);
          } else if (store.pendingPassageInfo) {
            store.setPendingPassageInfo(null);
          } else {
            store.selectNode(null);
            store.selectEdge(null);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isEditorActive, selectedFloorId]);

  if (!selectedFloorId) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <p className="text-sm text-muted-foreground">
          상단에서 층을 선택하세요
        </p>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full overflow-hidden bg-zinc-950 relative"
      style={{ cursor: isPlacementMode || isAddingNode ? "crosshair" : undefined }}
    >
      <Suspense fallback={<LoadingPlaceholder />}>
        <Canvas
          camera={{ position: [5, 5, 5], fov: 60, near: 0.01, far: 1000 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          style={{ width: "100%", height: "100%" }}
          onPointerMissed={() => {
            const store = useGraphEditorStore.getState();
            store.selectNode(null);
            store.selectEdge(null);
          }}
        >
          <SceneContent />
        </Canvas>
      </Suspense>
    </div>
  );
}
