import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useConnectorStore, useBuildingStore } from "@/stores";
import type {
  ConnectorResponse,
  ConnectorStopResponse,
} from "@/types";

const CONNECTOR_TYPE_LABELS: Record<string, string> = {
  stair: "계단",
  staircase: "계단",
  elevator: "엘리베이터",
  escalator: "에스컬레이터",
};

interface ConnectorsTabProps {
  buildingId: string;
}

export function ConnectorsTab({ buildingId }: ConnectorsTabProps) {
  const connectors = useConnectorStore((s) => s.connectors);
  const fetchConnectors = useConnectorStore((s) => s.fetchConnectors);
  const createConnector = useConnectorStore((s) => s.createConnector);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ connectorType: "stair", connectorKey: "", name: "" });

  useEffect(() => { fetchConnectors(buildingId); }, [buildingId, fetchConnectors]);

  async function handleCreate() {
    if (!form.connectorKey.trim()) {
      toast.error("키를 입력하세요.");
      return;
    }
    await createConnector(buildingId, {
      connectorType: form.connectorType,
      connectorKey: form.connectorKey,
      name: form.name || undefined,
    });
    setForm({ connectorType: "stair", connectorKey: "", name: "" });
    setCreateOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{connectors.length}개 수직 연결</p>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="text-xs h-8">
          <Plus className="h-3 w-3 mr-1" />새 연결
        </Button>
      </div>

      {connectors.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">아직 수직 연결이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {connectors.map((c) => <ConnectorCard key={c.connectorId} connector={c} />)}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>새 수직 연결</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">종류</Label>
              <Select value={form.connectorType} onValueChange={(v) => setForm({ ...form, connectorType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stair">계단</SelectItem>
                  <SelectItem value="elevator">엘리베이터</SelectItem>
                  <SelectItem value="escalator">에스컬레이터</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">키 *</Label>
              <Input placeholder="예: S1, E1" value={form.connectorKey} onChange={(e) => setForm({ ...form, connectorKey: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">이름</Label>
              <Input placeholder="예: 본관 계단 1번" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>취소</Button>
              <Button className="flex-1" onClick={handleCreate}>생성</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConnectorCard({ connector }: { connector: ConnectorResponse }) {
  const deleteConnector = useConnectorStore((s) => s.deleteConnector);
  const [expanded, setExpanded] = useState(false);
  const typeLabel = CONNECTOR_TYPE_LABELS[connector.connectorType.toLowerCase()] ?? connector.connectorType;

  return (
    <div className="rounded-lg border bg-background">
      <button
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{connector.name || connector.connectorKey}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{typeLabel}</Badge>
            {connector.mock && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">mock</Badge>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">키: {connector.connectorKey} · {connector.stops.length}개 stop</p>
        </div>
        <Button
          variant="ghost" size="icon" className="h-7 w-7 text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`"${connector.name || connector.connectorKey}" 삭제?`)) deleteConnector(connector.connectorId);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </button>

      {expanded && (
        <div className="border-t p-3 space-y-2">
          <p className="text-xs font-medium">Stops ({connector.stops.length})</p>
          {connector.stops.length === 0 ? (
            <p className="text-xs text-muted-foreground">이 연결에 stop이 없습니다.</p>
          ) : (
            <div className="space-y-1">
              {connector.stops.map((s) => <StopRow key={s.stopId} connectorId={connector.connectorId} stop={s} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StopRow({ connectorId, stop }: { connectorId: string; stop: ConnectorStopResponse }) {
  const removeStop = useConnectorStore((s) => s.removeStop);
  const updateStop = useConnectorStore((s) => s.updateStop);
  const building = useBuildingStore((s) => s.currentBuilding);
  const floor = building?.floors.find((f) => f.floorId === stop.floorId);

  async function handleDetach() {
    await updateStop(connectorId, stop.stopId, { detachRouteNode: true });
  }

  return (
    <div className="flex items-center justify-between gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-mono">{floor ? `${floor.level}F` : "?"}</span>
          <span className="truncate">{stop.areaLabel || stop.areaId.slice(0, 8)}</span>
        </div>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
          route: {stop.routeNodeId ? `${stop.routeNodeId.slice(0, 8)}…` : "없음"}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {stop.routeNodeId && (
          <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={handleDetach}>해제</Button>
        )}
        <Button
          variant="ghost" size="icon" className="h-6 w-6 text-destructive"
          onClick={() => { if (window.confirm("이 stop을 삭제하시겠습니까?")) removeStop(connectorId, stop.stopId); }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
