import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { fetchNearbyImages } from "@/api/node-images";
import { useViewerStore } from "@/stores";
import { threeToApi } from "@/lib/utils";


const FETCH_INTERVAL_MS = 800;
const MIN_MOVE_DISTANCE = 0.3;

function NearbyImagesFetcher() {
  const { camera } = useThree();
  const building = useViewerStore((s) => s.building);
  const viewMode = useViewerStore((s) => s.viewMode);
  const lastPos = useRef({ x: 0, y: 0, z: 0 });
  const lastFetchTime = useRef(0);
  const isFetching = useRef(false);

  useFrame(() => {
    if (viewMode !== "fps" || !building || isFetching.current) return;

    const now = Date.now();
    if (now - lastFetchTime.current < FETCH_INTERVAL_MS) return;

    const pos = camera.position;
    const api = threeToApi(pos.x, pos.y, pos.z);

    const dx = api.x - lastPos.current.x;
    const dy = api.y - lastPos.current.y;
    const dz = api.z - lastPos.current.z;
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) < MIN_MOVE_DISTANCE) return;

    lastPos.current = { x: api.x, y: api.y, z: api.z };
    lastFetchTime.current = now;
    isFetching.current = true;

    fetchNearbyImages(building.id, api.x, api.y, api.z)
      .then((images) => useViewerStore.getState().setNearbyImages(images))
      .catch(() => {})
      .finally(() => { isFetching.current = false; });
  });

  // 모드 전환 시 초기화 + 즉시 1회 호출
  useEffect(() => {
    if (viewMode !== "fps" || !building) {
      useViewerStore.getState().setNearbyImages([]);
      return;
    }
    // 진입 시 즉시 호출
    const pos = camera.position;
    const api = threeToApi(pos.x, pos.y, pos.z);
    lastPos.current = { x: api.x, y: api.y, z: api.z };
    fetchNearbyImages(building.id, api.x, api.y, api.z)
      .then((images) => useViewerStore.getState().setNearbyImages(images))
      .catch(() => {});
  }, [viewMode, building, camera]);

  return null;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "";

function ImagePanel() {
  const images = useViewerStore((s) => s.nearbyImages);
  const viewMode = useViewerStore((s) => s.viewMode);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setSelectedIdx(0), [images]);

  if (viewMode !== "fps" || images.length === 0) return null;

  const selected = images[selectedIdx];
  const imageUrl = selected?.imageUrl
    ? `${SERVER_URL}${selected.imageUrl}`
    : "";

  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
      <div className="rounded-lg overflow-hidden bg-black/80 backdrop-blur border border-zinc-700">
        <img
          src={imageUrl}
          alt={`Node ${selected?.nodeId}`}
          className="w-72 h-48 object-cover"
        />
        <div className="px-3 py-1.5 text-xs text-zinc-300">
          거리 {selected?.distance.toFixed(1)}m · 방향 {selected?.cameraAngle.toFixed(0)}°
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex gap-1.5">
          {images.map((img, i) => (
            <button
              key={img.nodeId}
              onClick={() => setSelectedIdx(i)}
              className={`rounded overflow-hidden border-2 transition-colors ${
                i === selectedIdx ? "border-white" : "border-transparent"
              }`}
            >
              <img
                src={`${SERVER_URL}${img.imageUrl}`}
                alt={`Node ${img.nodeId}`}
                className="w-20 h-14 object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { NearbyImagesFetcher, ImagePanel };
