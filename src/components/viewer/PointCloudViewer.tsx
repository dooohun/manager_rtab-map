import { Suspense, useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { Skeleton } from "@/components/ui/skeleton";
import { useViewerStore, usePoiStore } from "@/stores";
import { PathOverlay } from "./PathOverlay";
import { POIOverlay } from "./POIOverlay";
import { PendingPOIMarker } from "./PendingPOIMarker";
import { NodeImagePanel } from "./NodeImagePanel";
import { getNodeImages } from "@/api/buildings";
import type { NodeImageResponse, Point3D } from "@/types";

function CameraController() {
  const viewMode = useViewerStore((s) => s.viewMode);
  const floorPath = useViewerStore((s) => s.floorPath);
  const isPlacementMode = usePoiStore((s) => s.isPlacementMode);
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
    if (!floorPath) return;
    if (!controlsRef.current) return;

    if (floorPath && floorPath.bounds) {
      const { minX, maxX, minY, maxY } = floorPath.bounds;
      const cx = (minX + maxX) / 2;
      const cz = (minY + maxY) / 2; // API's Y → Three.js Z
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
    }
  }, [floorPath, camera, viewMode]);

  // 키보드로 카메라 이동
  useEffect(() => {
    if (!controlsRef.current || isPlacementMode) return;

    const panSpeed = 0.5;
    const keysPressed = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.add(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.key);
    };

    const animate = () => {
      if (!controlsRef.current) return;
      const controls = controlsRef.current;
      let moved = false;

      const forward = new THREE.Vector3();
      const right = new THREE.Vector3();

      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      if (keysPressed.has("w") || keysPressed.has("W") || keysPressed.has("ArrowUp")) {
        controls.target.addScaledVector(forward, panSpeed);
        moved = true;
      }
      if (keysPressed.has("s") || keysPressed.has("S") || keysPressed.has("ArrowDown")) {
        controls.target.addScaledVector(forward, -panSpeed);
        moved = true;
      }
      if (keysPressed.has("a") || keysPressed.has("A") || keysPressed.has("ArrowLeft")) {
        controls.target.addScaledVector(right, -panSpeed);
        moved = true;
      }
      if (keysPressed.has("d") || keysPressed.has("D") || keysPressed.has("ArrowRight")) {
        controls.target.addScaledVector(right, panSpeed);
        moved = true;
      }

      if (moved) {
        controls.update();
      }
    };

    const animationId = setInterval(animate, 16);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      clearInterval(animationId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [camera, isPlacementMode]);

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!isPlacementMode}
      enableDamping
      dampingFactor={0.1}
      rotateSpeed={0.5}
      zoomSpeed={0.5}
      panSpeed={0.8}
      enablePan={true}
      makeDefault
    />
  );
}

interface SceneContentProps {
  onNodeHover: (apiCoords: Point3D, screenX: number, screenY: number) => void;
  onNodeLeave: () => void;
}

function SceneContent({ onNodeHover, onNodeLeave }: SceneContentProps) {
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
      <PathOverlay onNodeHover={onNodeHover} onNodeLeave={onNodeLeave} />
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
  const building = useViewerStore((s) => s.building);
  const isPlacementMode = usePoiStore((s) => s.isPlacementMode);

  const [nodeImages, setNodeImages] = useState<NodeImageResponse[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [hoveredScreenPos, setHoveredScreenPos] = useState<{ screenX: number; screenY: number } | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNodeHover = useCallback(
    (apiCoords: Point3D, screenX: number, screenY: number) => {
      if (!building?.id) return;

      setHoveredScreenPos({ screenX, screenY });
      setIsPanelOpen(true);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        setIsLoadingImages(true);
        try {
          const images = await getNodeImages(building.id, apiCoords);
          setNodeImages(images);
        } catch {
          setNodeImages([]);
        } finally {
          setIsLoadingImages(false);
        }
      }, 300);
    },
    [building?.id],
  );

  const handleNodeLeave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  const handlePanelClose = useCallback(() => {
    setIsPanelOpen(false);
    setNodeImages([]);
    setHoveredScreenPos(null);
  }, []);

  useEffect(() => {
    if (isPlacementMode) {
      handlePanelClose();
    }
  }, [isPlacementMode, handlePanelClose]);

  if (!selectedFloorId) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-muted-foreground"
            >
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">
            우측 패널에서 층을 선택하면
            <br />
            3D 경로를 확인할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 rounded-lg border overflow-hidden bg-zinc-950 relative"
      style={{ cursor: isPlacementMode ? "crosshair" : undefined }}
    >
      <Suspense fallback={<LoadingPlaceholder />}>
        <Canvas
          camera={{ position: [5, 5, 5], fov: 60, near: 0.01, far: 1000 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          style={{
            width: "100%",
            height: "100%",
            cursor: isPlacementMode ? "crosshair" : undefined,
          }}
        >
          <SceneContent onNodeHover={handleNodeHover} onNodeLeave={handleNodeLeave} />
        </Canvas>
      </Suspense>

      {isPanelOpen && (
        <NodeImagePanel
          images={nodeImages}
          isLoading={isLoadingImages}
          hoveredPosition={hoveredScreenPos}
          onClose={handlePanelClose}
        />
      )}
    </div>
  );
}
