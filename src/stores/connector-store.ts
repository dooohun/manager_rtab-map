import { create } from "zustand";
import { toast } from "sonner";
import * as api from "@/api";
import type {
  ConnectorResponse,
  ConnectorStopResponse,
  ConnectorCreateRequest,
  ConnectorUpdateRequest,
  ConnectorStopRequest,
} from "@/types";

interface ConnectorStore {
  connectors: ConnectorResponse[];
  isLoading: boolean;
  buildingId: string | null;
  selectedConnectorId: string | null;

  // 노드 모드의 nodeType=vertical에서 사용. 사용자가 type+key를 입력하면 그 값으로
  // 노드 찍을 때마다 connector를 upsert(없으면 생성)하고 stop을 add.
  verticalType: string;        // STAIRCASE | ELEVATOR | ESCALATOR
  verticalKey: string;          // 예: "stair-A". 같은 (type, key)면 같은 connector로 매핑
  setVerticalType: (t: string) => void;
  setVerticalKey: (k: string) => void;

  /** key가 같은 connector를 찾아 그 ID 반환. 없으면 새로 생성 후 반환. */
  ensureConnector: (buildingId: string, type: string, key: string) => Promise<string>;

  // Legacy 호환 (NewConnectorDialog 등) — 단순화 후 미사용이지만 컴파일 깨지지 않게 유지.
  activeConnectorId: string | null;
  activeConnectorType: string | null;

  fetchConnectors: (buildingId: string) => Promise<void>;
  createConnector: (buildingId: string, body: ConnectorCreateRequest) => Promise<ConnectorResponse>;
  updateConnector: (connectorId: string, body: ConnectorUpdateRequest) => Promise<ConnectorResponse>;
  deleteConnector: (connectorId: string) => Promise<void>;
  addStop: (connectorId: string, body: ConnectorStopRequest) => Promise<ConnectorStopResponse>;
  updateStop: (connectorId: string, stopId: string, body: ConnectorStopRequest) => Promise<ConnectorStopResponse>;
  removeStop: (connectorId: string, stopId: string) => Promise<void>;
  selectConnector: (connectorId: string | null) => void;

  /** 모달에서 호출 — connector 새로 생성 + active로 set. */
  startNewConnector: (buildingId: string, body: ConnectorCreateRequest) => Promise<string>;
  finishActiveConnector: () => void;

  reset: () => void;
}

const initialState = {
  connectors: [] as ConnectorResponse[],
  isLoading: false,
  buildingId: null as string | null,
  selectedConnectorId: null as string | null,
  verticalType: "STAIRCASE",
  verticalKey: "",
  activeConnectorId: null as string | null,
  activeConnectorType: null as string | null,
};

export const useConnectorStore = create<ConnectorStore>((set, get) => ({
  ...initialState,

  fetchConnectors: async (buildingId) => {
    set({ isLoading: true, buildingId });
    try {
      const connectors = await api.listConnectors(buildingId);
      set({ connectors, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createConnector: async (buildingId, body) => {
    const newConnector = await api.createConnector(buildingId, body);
    set({ connectors: [...get().connectors, newConnector] });
    toast.success("수직 연결이 생성되었습니다.");
    return newConnector;
  },

  updateConnector: async (connectorId, body) => {
    const updated = await api.updateConnector(connectorId, body);
    set({ connectors: get().connectors.map((c) => (c.connectorId === connectorId ? updated : c)) });
    toast.success("수직 연결이 수정되었습니다.");
    return updated;
  },

  deleteConnector: async (connectorId) => {
    await api.deleteConnector(connectorId);
    set({
      connectors: get().connectors.filter((c) => c.connectorId !== connectorId),
      selectedConnectorId: get().selectedConnectorId === connectorId ? null : get().selectedConnectorId,
    });
    toast.success("수직 연결이 삭제되었습니다.");
  },

  addStop: async (connectorId, body) => {
    const newStop = await api.addConnectorStop(connectorId, body);
    set({
      connectors: get().connectors.map((c) =>
        c.connectorId === connectorId ? { ...c, stops: [...c.stops, newStop] } : c,
      ),
    });
    toast.success("Stop이 추가되었습니다.");
    return newStop;
  },

  updateStop: async (connectorId, stopId, body) => {
    const updated = await api.updateConnectorStop(stopId, body);
    set({
      connectors: get().connectors.map((c) =>
        c.connectorId === connectorId
          ? { ...c, stops: c.stops.map((s) => (s.stopId === stopId ? updated : s)) }
          : c,
      ),
    });
    toast.success("Stop이 수정되었습니다.");
    return updated;
  },

  removeStop: async (connectorId, stopId) => {
    await api.removeConnectorStop(stopId);
    set({
      connectors: get().connectors.map((c) =>
        c.connectorId === connectorId
          ? { ...c, stops: c.stops.filter((s) => s.stopId !== stopId) }
          : c,
      ),
    });
    toast.success("Stop이 삭제되었습니다.");
  },

  selectConnector: (connectorId) => set({ selectedConnectorId: connectorId }),

  setVerticalType: (t) => set({ verticalType: t }),
  setVerticalKey: (k) => set({ verticalKey: k }),

  ensureConnector: async (buildingId, type, key) => {
    // 메모리 캐시에서 우선 매칭. 없으면 list refresh 후 재시도 → 그래도 없으면 신규.
    const matchKey = (c: ConnectorResponse) => c.connectorType === type && c.connectorKey === key;
    let hit = get().connectors.find(matchKey);
    if (!hit) {
      const list = await api.listConnectors(buildingId);
      set({ connectors: list });
      hit = list.find(matchKey);
    }
    if (hit) return hit.connectorId;
    const created = await api.createConnector(buildingId, { connectorType: type, connectorKey: key });
    set({ connectors: [...get().connectors, created] });
    return created.connectorId;
  },

  startNewConnector: async (buildingId, body) => {
    const created = await api.createConnector(buildingId, body);
    set({
      connectors: [...get().connectors, created],
      activeConnectorId: created.connectorId,
      activeConnectorType: body.connectorType,
    });
    toast.success(`${body.connectorType} "${body.connectorKey}" 생성 — 각 층에서 stop을 찍어주세요`);
    return created.connectorId;
  },

  finishActiveConnector: () => set({ activeConnectorId: null, activeConnectorType: null }),

  reset: () => set(initialState),
}));
