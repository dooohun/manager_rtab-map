import { create } from "zustand";
import { toast } from "sonner";
import * as api from "@/api";
import { useViewerStore } from "./viewer-store";
import type { PathNodeResponse, PathEdgeResponse, NodeType, EdgeType } from "@/types";

export type EditorMode = "view" | "add-node" | "add-edge" | "select";
export type PlaceableNodeType = "WAYPOINT" | "STAIRCASE" | "ELEVATOR";

interface PendingPassageInfo {
  x: number;
  y: number;
  z: number;
  passageType: "STAIRCASE" | "ELEVATOR";
}

interface GraphEditorState {
  nodes: PathNodeResponse[];
  edges: PathEdgeResponse[];
  isLoading: boolean;
  isEditorActive: boolean;

  editorMode: EditorMode;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  edgeSourceNodeId: string | null;
  nodeTypeToPlace: PlaceableNodeType;
  pendingPassageInfo: PendingPassageInfo | null;
  autoConnect: boolean;
  lastPlacedNodeId: string | null;
  longPressNodeId: string | null;
  verticalEdgeType: "VERTICAL_STAIRCASE" | "VERTICAL_ELEVATOR" | null;
  pendingPassageLink: { nodeId: string; floorId: string; passageType: "STAIRCASE" | "ELEVATOR" } | null;

  setEditorActive: (active: boolean) => void;
  fetchGraph: (floorId: string) => Promise<void>;
  createNode: (floorId: string, x: number, y: number, z: number, type: NodeType) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
  createEdge: (floorId: string, fromNodeId: string, toNodeId: string, edgeType?: EdgeType, isBidirectional?: boolean) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>;
  clearGraph: (floorId: string) => Promise<void>;

  setEditorMode: (mode: EditorMode) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  setEdgeSource: (nodeId: string | null) => void;
  deleteSelected: (floorId: string) => Promise<void>;
  setNodeTypeToPlace: (type: PlaceableNodeType) => void;
  setPendingPassageInfo: (info: PendingPassageInfo | null) => void;
  confirmPassageConnection: (currentFloorId: string, targetFloorId: string) => Promise<void>;
  setVerticalEdgeType: (type: "VERTICAL_STAIRCASE" | "VERTICAL_ELEVATOR" | null) => void;
  setAutoConnect: (enabled: boolean) => void;
  setLongPressNodeId: (nodeId: string | null) => void;
  setPendingPassageLink: (link: { nodeId: string; floorId: string; passageType: "STAIRCASE" | "ELEVATOR" } | null) => void;
  completePassageLink: (targetNodeId: string, targetFloorId: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  nodes: [] as PathNodeResponse[],
  edges: [] as PathEdgeResponse[],
  isLoading: false,
  isEditorActive: false,
  editorMode: "view" as EditorMode,
  selectedNodeId: null as string | null,
  selectedEdgeId: null as string | null,
  edgeSourceNodeId: null as string | null,
  nodeTypeToPlace: "WAYPOINT" as PlaceableNodeType,
  pendingPassageInfo: null as PendingPassageInfo | null,
  autoConnect: true,
  lastPlacedNodeId: null as string | null,
  longPressNodeId: null as string | null,
  verticalEdgeType: null as "VERTICAL_STAIRCASE" | "VERTICAL_ELEVATOR" | null,
  pendingPassageLink: null as { nodeId: string; floorId: string; passageType: "STAIRCASE" | "ELEVATOR" } | null,
};

export const useGraphEditorStore = create<GraphEditorState>((set, get) => ({
  ...initialState,

  setEditorActive: (active) =>
    set({ isEditorActive: active, editorMode: active ? "view" : "view" }),

  fetchGraph: async (floorId) => {
    set({ isLoading: true });
    try {
      const graph = await api.getFloorGraph(floorId);
      set({ nodes: graph.nodes, edges: graph.edges, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createNode: async (floorId, x, y, z, type) => {
    const newNode = await api.createNode(floorId, { x, y, z, type });
    set({ nodes: [...get().nodes, newNode] });

    // 자동 연결: 이전 노드와 엣지 생성
    const { autoConnect, lastPlacedNodeId } = get();
    if (autoConnect && lastPlacedNodeId) {
      try {
        const newEdge = await api.createEdge(floorId, {
          fromNodeId: lastPlacedNodeId,
          toNodeId: newNode.id,
          isBidirectional: true,
        });
        set({ edges: [...get().edges, newEdge] });
      } catch {
        // 엣지 생성 실패 시 무시 (중복 등)
      }
    }

    set({ lastPlacedNodeId: newNode.id });
  },

  deleteNode: async (nodeId) => {
    const edges = get().edges;
    const selectedFloorId = useViewerStore.getState().selectedFloorId;

    // 수평 엣지 2개 → 분할 노드 → 삭제 후 엣지 병합
    const connected = edges.filter(
      (e) => (e.fromNodeId === nodeId || e.toNodeId === nodeId) && e.edgeType === "HORIZONTAL",
    );

    if (connected.length === 2 && selectedFloorId) {
      const neighbors = connected.map((e) =>
        e.fromNodeId === nodeId ? e.toNodeId : e.fromNodeId,
      );

      await api.deleteNode(nodeId);

      try {
        const mergedEdge = await api.createEdge(selectedFloorId, {
          fromNodeId: neighbors[0],
          toNodeId: neighbors[1],
          isBidirectional: true,
        });
        set({
          nodes: get().nodes.filter((n) => n.id !== nodeId),
          edges: [
            ...get().edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId),
            mergedEdge,
          ],
          selectedNodeId: null,
          lastPlacedNodeId: get().lastPlacedNodeId === nodeId ? null : get().lastPlacedNodeId,
        });
        toast.success("노드가 삭제되고 엣지가 병합되었습니다.");
      } catch {
        set({
          nodes: get().nodes.filter((n) => n.id !== nodeId),
          edges: get().edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId),
          selectedNodeId: null,
        });
        toast.success("노드가 삭제되었습니다.");
      }
    } else {
      await api.deleteNode(nodeId);
      set({
        nodes: get().nodes.filter((n) => n.id !== nodeId),
        edges: get().edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId),
        selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
        lastPlacedNodeId: get().lastPlacedNodeId === nodeId ? null : get().lastPlacedNodeId,
      });
      toast.success("노드가 삭제되었습니다.");
    }
  },

  createEdge: async (floorId, fromNodeId, toNodeId, edgeType, isBidirectional) => {
    const newEdge = await api.createEdge(floorId, { fromNodeId, toNodeId, edgeType, isBidirectional });
    set({ edges: [...get().edges, newEdge] });
    toast.success("엣지가 생성되었습니다.");
  },

  deleteEdge: async (edgeId) => {
    await api.deleteEdge(edgeId);
    set({
      edges: get().edges.filter((e) => e.id !== edgeId),
      selectedEdgeId: get().selectedEdgeId === edgeId ? null : get().selectedEdgeId,
    });
    toast.success("엣지가 삭제되었습니다.");
  },

  clearGraph: async (floorId) => {
    await api.clearFloorGraph(floorId);
    set({ nodes: [], edges: [], selectedNodeId: null, selectedEdgeId: null, lastPlacedNodeId: null });
    toast.success("그래프가 초기화되었습니다.");
  },

  setEditorMode: (mode) =>
    set({
      editorMode: mode,
      selectedNodeId: null,
      selectedEdgeId: null,
      edgeSourceNodeId: null,
      lastPlacedNodeId: null,
    }),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedEdgeId: null }),
  selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null }),
  setEdgeSource: (nodeId) => set({ edgeSourceNodeId: nodeId }),

  deleteSelected: async (_floorId) => {
    const { selectedNodeId, selectedEdgeId } = get();
    if (selectedNodeId) {
      await get().deleteNode(selectedNodeId);
    } else if (selectedEdgeId) {
      await get().deleteEdge(selectedEdgeId);
    }
  },

  setNodeTypeToPlace: (type) => set({ nodeTypeToPlace: type }),

  setPendingPassageInfo: (info) => set({ pendingPassageInfo: info }),

  confirmPassageConnection: async (currentFloorId, targetFloorId) => {
    const { pendingPassageInfo, autoConnect, lastPlacedNodeId } = get();
    if (!pendingPassageInfo) return;

    const edgeType: EdgeType = pendingPassageInfo.passageType === "STAIRCASE"
      ? "VERTICAL_STAIRCASE"
      : "VERTICAL_ELEVATOR";

    try {
      const entryNode = await api.createNode(currentFloorId, {
        x: pendingPassageInfo.x,
        y: pendingPassageInfo.y,
        z: pendingPassageInfo.z,
        type: "PASSAGE_ENTRY",
      });

      set({ nodes: [...get().nodes, entryNode] });

      // 자동 연결: 이전 노드 → 통행 진입 노드
      if (autoConnect && lastPlacedNodeId) {
        try {
          const connectEdge = await api.createEdge(currentFloorId, {
            fromNodeId: lastPlacedNodeId,
            toNodeId: entryNode.id,
            isBidirectional: true,
          });
          set({ edges: [...get().edges, connectEdge] });
        } catch { /* ignore */ }
      }

      const exitNode = await api.createNode(targetFloorId, {
        x: pendingPassageInfo.x,
        y: pendingPassageInfo.y,
        z: 0,
        type: "PASSAGE_EXIT",
      });

      await api.createEdge(currentFloorId, {
        fromNodeId: entryNode.id,
        toNodeId: exitNode.id,
        edgeType,
        isBidirectional: true,
      });

      set({ pendingPassageInfo: null, lastPlacedNodeId: entryNode.id });
      const label = pendingPassageInfo.passageType === "STAIRCASE" ? "계단" : "엘리베이터";
      toast.success(`${label} 노드가 생성되었습니다.`);
    } catch {
      toast.error("통행 노드 생성에 실패했습니다.");
      set({ pendingPassageInfo: null });
    }
  },

  setVerticalEdgeType: (type) => set({ verticalEdgeType: type }),
  setAutoConnect: (enabled) => set({ autoConnect: enabled, lastPlacedNodeId: null }),
  setLongPressNodeId: (nodeId) => set({ longPressNodeId: nodeId }),
  setPendingPassageLink: (link) => set({ pendingPassageLink: link }),

  completePassageLink: async (targetNodeId, targetFloorId) => {
    const { pendingPassageLink } = get();
    if (!pendingPassageLink) return;

    try {
      // 양쪽 노드를 통로 타입으로 변경
      const nodeType = pendingPassageLink.passageType === "ELEVATOR" ? "PASSAGE_ENTRY" : "PASSAGE_ENTRY";
      await api.updateNode(pendingPassageLink.nodeId, { type: nodeType });
      await api.updateNode(targetNodeId, { type: "PASSAGE_EXIT" });

      // 수직 엣지 생성
      const edgeType = pendingPassageLink.passageType === "ELEVATOR"
        ? "VERTICAL_ELEVATOR" as const
        : "VERTICAL_STAIRCASE" as const;
      await api.createEdge(pendingPassageLink.floorId, {
        fromNodeId: pendingPassageLink.nodeId,
        toNodeId: targetNodeId,
        edgeType,
        isBidirectional: true,
      });

      // 체이닝: 현재 노드를 다음 시작점으로 유지
      set({ pendingPassageLink: { nodeId: targetNodeId, floorId: targetFloorId, passageType: pendingPassageLink.passageType } });
      toast.success("통로가 연결되었습니다. 다음 층 노드를 클릭하여 계속 연결하세요.");

      // 현재 층 그래프 새로고침
      await get().fetchGraph(targetFloorId);
    } catch {
      toast.error("통로 연결에 실패했습니다.");
    }
  },

  reset: () => set(initialState),
}));
