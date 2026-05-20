import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Hexagon, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePolygonStore, useViewerStore, useGraphEditorStore } from "@/stores";
import { getAreas } from "@/api/areas";
import type { AreaResponse, PolygonResponse, Point3D } from "@/types";

interface LobbyTabProps {
  buildingId: string;
}

export function LobbyTab({ buildingId }: LobbyTabProps) {
  void buildingId;
  const polygons = usePolygonStore((s) => s.polygons);
  const fetchPolygons = usePolygonStore((s) => s.fetchPolygons);
  const createPolygon = usePolygonStore((s) => s.createPolygon);
  const deletePolygon = usePolygonStore((s) => s.deletePolygon);
  const selectedAreaId = useViewerStore((s) => s.selectedAreaId);
  const selectedFloorId = useViewerStore((s) => s.selectedFloorId);
  const graphNodes = useGraphEditorStore((s) => s.nodes);
  const fetchGraph = useGraphEditorStore((s) => s.fetchGraph);
  const [areas, setAreas] = useState<AreaResponse[]>([]);
  const [areaToShow, setAreaToShow] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState<Point3D[]>([]);

  useEffect(() => {
    if (!selectedFloorId) {
      setAreas([]);
      setAreaToShow(null);
      return;
    }
    getAreas(selectedFloorId).then((data) => {
      setAreas(data);
      const initial = selectedAreaId ?? data.find((a) => a.isDefault)?.areaId ?? data[0]?.areaId ?? null;
      setAreaToShow(initial);
    }).catch(() => setAreas([]));
  }, [selectedFloorId, selectedAreaId]);

  useEffect(() => {
    if (areaToShow) fetchPolygons(areaToShow);
  }, [areaToShow, fetchPolygons]);

  // graph 노드를 viewport 추정에 쓰기 위해 한 번 fetch
  useEffect(() => {
    if (selectedFloorId && areaToShow) {
      fetchGraph(selectedFloorId, areaToShow).catch(() => {});
    }
  }, [selectedFloorId, areaToShow, fetchGraph]);

  // 영역 바뀌면 draft 리셋
  useEffect(() => {
    setDrafting(false);
    setDraft([]);
  }, [areaToShow]);

  const polygonsForArea = useMemo(() => {
    if (!areaToShow) return [];
    return polygons.filter((p) => p.floorAreaId === areaToShow);
  }, [polygons, areaToShow]);

  // graph 노드도 같은 area로 필터해 viewport 기준점에 사용
  const nodesForArea = useMemo(() => {
    if (!areaToShow) return [];
    return graphNodes.filter((n) => n.areaId === areaToShow);
  }, [graphNodes, areaToShow]);

  async function handleSaveDraft() {
    if (!areaToShow) return;
    if (draft.length < 3) {
      toast.error("최소 3개 vertex가 필요합니다.");
      return;
    }
    await createPolygon(areaToShow, { exterior: draft });
    setDrafting(false);
    setDraft([]);
  }

  if (!selectedFloorId) {
    return <p className="text-sm text-muted-foreground text-center py-12">3D 탭에서 층을 먼저 선택하세요.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">구역:</span>
        {areas.length === 0 ? (
          <span className="text-xs text-muted-foreground">(없음)</span>
        ) : (
          areas.map((a) => (
            <Button
              key={a.areaId}
              variant={areaToShow === a.areaId ? "default" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setAreaToShow(a.areaId)}
            >
              {a.label || `Area ${a.areaIndex}`}
              {a.isDefault && " (기본)"}
            </Button>
          ))
        )}
        <div className="ml-auto flex items-center gap-1">
          {drafting ? (
            <>
              <span className="text-[11px] text-amber-500">코너 {draft.length}개</span>
              <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setDraft(draft.slice(0, -1))} disabled={draft.length === 0}>
                되돌리기
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => { setDrafting(false); setDraft([]); }}>
                <X className="h-3 w-3 mr-1" />취소
              </Button>
              <Button size="sm" className="text-xs h-8" onClick={handleSaveDraft} disabled={draft.length < 3}>
                <Check className="h-3 w-3 mr-1" />저장
              </Button>
            </>
          ) : (
            <Button size="sm" className="text-xs h-8" disabled={!areaToShow} onClick={() => setDrafting(true)}>
              <Plus className="h-3 w-3 mr-1" />폴리곤 그리기
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-lg border p-3 bg-muted/20">
          <p className="text-xs font-medium mb-2">
            top-down 캔버스
            {drafting && <span className="ml-2 text-amber-500">— 클릭으로 코너 찍기</span>}
          </p>
          <PolygonCanvas
            polygons={polygonsForArea}
            referenceNodes={nodesForArea.map((n) => ({ x: n.x, y: n.y, z: n.z }))}
            drafting={drafting}
            draft={draft}
            onAddVertex={(p) => setDraft((prev) => [...prev, p])}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium">폴리곤 목록 ({polygonsForArea.length})</p>
          {polygonsForArea.length === 0 ? (
            <p className="text-xs text-muted-foreground">목록이 비었습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {polygonsForArea.map((p) => (
                <div key={p.polygonId} className="rounded-md border bg-background p-2.5">
                  <div className="flex items-center gap-2">
                    <Hexagon className="h-3.5 w-3.5 text-cyan-500" />
                    <span className="text-xs font-mono">{p.polygonId.slice(0, 8)}…</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{p.markSessionId}</Badge>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 ml-auto text-destructive"
                      onClick={() => { if (window.confirm("이 폴리곤을 삭제하시겠습니까?")) deletePolygon(p.polygonId); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">vertex: {p.vertices.length}개</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PolygonCanvasProps {
  polygons: PolygonResponse[];
  referenceNodes: Point3D[];
  drafting: boolean;
  draft: Point3D[];
  onAddVertex: (p: Point3D) => void;
}

function PolygonCanvas({ polygons, referenceNodes, drafting, draft, onAddVertex }: PolygonCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const SVG_W = 480;
  const SVG_H = 320;
  const pad = 1.0;

  const { minX, minY, width, height, defaultZ } = useMemo(() => {
    const pts: Point3D[] = [
      ...polygons.flatMap((p) => p.vertices),
      ...referenceNodes,
      ...draft,
    ];
    if (pts.length === 0) {
      return { minX: -5, minY: -5, width: 10, height: 10, defaultZ: 0 };
    }
    const xs = pts.map((v) => v.x);
    const ys = pts.map((v) => v.y);
    const zs = pts.map((v) => v.z);
    const _minX = Math.min(...xs);
    const _maxX = Math.max(...xs);
    const _minY = Math.min(...ys);
    const _maxY = Math.max(...ys);
    const w = Math.max(_maxX - _minX, 1);
    const h = Math.max(_maxY - _minY, 1);
    const meanZ = zs.reduce((a, b) => a + b, 0) / zs.length;
    return { minX: _minX, minY: _minY, width: w, height: h, defaultZ: meanZ };
  }, [polygons, referenceNodes, draft]);

  function toSvg(p: { x: number; y: number }): { x: number; y: number } {
    const sx = ((p.x - minX + pad) / (width + pad * 2)) * SVG_W;
    const sy = SVG_H - ((p.y - minY + pad) / (height + pad * 2)) * SVG_H;
    return { x: sx, y: sy };
  }

  function fromSvg(sx: number, sy: number): Point3D {
    const x = (sx / SVG_W) * (width + pad * 2) - pad + minX;
    const y = ((SVG_H - sy) / SVG_H) * (height + pad * 2) - pad + minY;
    return { x, y, z: defaultZ };
  }

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!drafting || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * SVG_W;
    const sy = ((e.clientY - rect.top) / rect.height) * SVG_H;
    onAddVertex(fromSvg(sx, sy));
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className={`w-full h-auto bg-zinc-900 rounded ${drafting ? "cursor-crosshair" : ""}`}
      onClick={handleClick}
    >
      {/* reference graph nodes (read-only hint) */}
      {referenceNodes.map((n, i) => {
        const s = toSvg(n);
        return <circle key={`n${i}`} cx={s.x} cy={s.y} r={1.5} fill="#22d3ee" opacity={0.5} />;
      })}

      {/* existing polygons */}
      {polygons.map((poly, i) => {
        const points = poly.vertices.map((v) => {
          const s = toSvg(v);
          return `${s.x},${s.y}`;
        }).join(" ");
        const hue = (i * 67) % 360;
        return (
          <polygon
            key={poly.polygonId}
            points={points}
            fill={`hsl(${hue}, 70%, 50%, 0.2)`}
            stroke={`hsl(${hue}, 70%, 60%)`}
            strokeWidth="1.5"
          />
        );
      })}
      {polygons.map((poly) =>
        poly.vertices.map((v, idx) => {
          const s = toSvg(v);
          return (
            <circle
              key={`${poly.polygonId}-${idx}`}
              cx={s.x}
              cy={s.y}
              r={3}
              fill="#ffffff"
              stroke="#000"
              strokeWidth="0.5"
            />
          );
        }),
      )}

      {/* draft polygon */}
      {draft.length > 0 && (
        <>
          {draft.length >= 2 && (
            <polyline
              points={draft.map((v) => { const s = toSvg(v); return `${s.x},${s.y}`; }).join(" ")}
              fill={draft.length >= 3 ? "rgba(245, 158, 11, 0.2)" : "none"}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
          )}
          {draft.length >= 3 && (
            // 닫힘 미리보기
            <line
              x1={toSvg(draft[draft.length - 1]).x}
              y1={toSvg(draft[draft.length - 1]).y}
              x2={toSvg(draft[0]).x}
              y2={toSvg(draft[0]).y}
              stroke="#f59e0b"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity={0.5}
            />
          )}
          {draft.map((v, i) => {
            const s = toSvg(v);
            return (
              <g key={`d${i}`}>
                <circle cx={s.x} cy={s.y} r={4} fill="#f59e0b" stroke="#000" strokeWidth="0.5" />
                <text x={s.x + 6} y={s.y + 3} fontSize="10" fill="#f59e0b">{i + 1}</text>
              </g>
            );
          })}
        </>
      )}
    </svg>
  );
}
