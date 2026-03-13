import { X, Camera, Loader2 } from "lucide-react";
import type { NodeImageResponse } from "@/types";

interface NodeImagePanelProps {
  images: NodeImageResponse[];
  isLoading: boolean;
  hoveredPosition: { screenX: number; screenY: number } | null;
  onClose: () => void;
}

export function NodeImagePanel({ images, isLoading, hoveredPosition, onClose }: NodeImagePanelProps) {
  if (!hoveredPosition && !isLoading && images.length === 0) return null;
  if (!hoveredPosition) return null;

  const PANEL_WIDTH = 380;
  const PANEL_HEIGHT = 280;
  const OFFSET_X = 16;
  const OFFSET_Y = 16;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = hoveredPosition.screenX + OFFSET_X;
  let top = hoveredPosition.screenY + OFFSET_Y;

  if (left + PANEL_WIDTH > viewportWidth - 16) {
    left = hoveredPosition.screenX - PANEL_WIDTH - OFFSET_X;
  }
  if (top + PANEL_HEIGHT > viewportHeight - 16) {
    top = hoveredPosition.screenY - PANEL_HEIGHT - OFFSET_Y;
  }

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left, top, width: PANEL_WIDTH }}
    >
      <div
        className="pointer-events-auto rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-md shadow-2xl overflow-hidden"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-cyan-500/20 flex items-center justify-center">
              <Camera className="w-3 h-3 text-cyan-400" />
            </div>
            <span className="text-xs font-medium text-zinc-300">주변 카메라 이미지</span>
          </div>
          <button
            onClick={onClose}
            className="w-5 h-5 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              <span className="text-xs text-zinc-500">이미지 불러오는 중...</span>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Camera className="w-6 h-6 text-zinc-600" />
              <span className="text-xs text-zinc-500">이미지가 없습니다</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, idx) => (
                <div key={img.nodeId} className="group relative flex flex-col gap-1">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800 border border-white/5">
                    <img
                      src={img.imageUrl}
                      alt={`카메라 뷰 ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%2327272a'/%3E%3Ctext x='50' y='55' font-size='12' fill='%2371717a' text-anchor='middle'%3E이미지 없음%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    {/* 각도 뱃지 */}
                    <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[9px] font-mono bg-black/60 text-cyan-400 border border-cyan-500/20">
                      {Math.round(img.cameraAngle)}°
                    </div>
                  </div>
                  {/* 거리 */}
                  <div className="text-center text-[10px] text-zinc-500 font-mono">
                    {img.distance.toFixed(2)}m
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && images.length > 0 && (
          <div className="px-3 pb-2 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] text-zinc-600">
              {images.length}장 · 다른 방향에서 촬영된 이미지
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
