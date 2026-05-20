import { create } from "zustand";
import { toast } from "sonner";
import * as api from "@/api";
import { useViewerStore } from "./viewer-store";
import type { PathNodeResponse, PathEdgeResponse, NodeType, EdgeType, EdgeUpdateRequest } from "@/types";

export type EditorMode = "view" | "add-node" | "add-edge" | "select" | "add-corner" | "add-vertical-stop";
// vertical은 가상 nodeType — UI에서 type/key 입력 받아 connector + stop 자동 등록.
// 실제 DB nodeType은 corridor로 저장하고 vertical_connector_stop이 그 노드를 가리킨다.
export type PlaceableNodeType = "corridor" | "junction" | "endpoint" | "poi_attach" | "vertical";

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
  autoConnect: boolean;
  lastPlacedNodeId: string | null;
  longPressNodeId: string | null;
  edgeWidthDialogId: string | null;

  setEditorActive: (active: boolean) => void;
  fetchGraph: (floorId: string, areaId?: string) => Promise<void>;
  createNode: (areaId: string, x: number, y: number, z: number, nodeType: NodeType) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
  createEdge: (areaId: string, fromNodeId: string, toNodeId: string, edgeType?: EdgeType) => Promise<void>;
  updateEdge: (edgeId: string, body: EdgeUpdateRequest) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>;
  clearManualGraph: (areaId: string) => Promise<void>;

  setEditorMode: (mode: EditorMode) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  setEdgeSource: (nodeId: string | null) => void;
  deleteSelected: () => Promise<void>;
  setNodeTypeToPlace: (nodeType: PlaceableNodeType) => void;
  setAutoConnect: (enabled: boolean) => void;
  setLongPressNodeId: (nodeId: string | null) => void;
  setEdgeWidthDialogId: (edgeId: string | null) => void;
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
  nodeTypeToPlace: "corridor" as PlaceableNodeType,
  autoConnect: true,
  lastPlacedNodeId: null as string | null,
  longPressNodeId: null as string | null,
  edgeWidthDialogId: null as string | null,
};

export const useGraphEditorStore = create<GraphEditorState>((set, get) => ({
  ...initialState,

  setEditorActive: (active) => set({ isEditorActive: active, editorMode: "view" }),

  fetchGraph: async (floorId, areaId) => {
    set({ isLoading: true });
    try {
      const graph = await api.getFloorGraph(floorId, areaId);
      set({ nodes: graph.nodes, edges: graph.edges, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createNode: async (areaId, x, y, z, nodeType) => {
    const newNode = await api.createNode(areaId, { x, y, z, nodeType });
    set({ nodes: [...get().nodes, newNode] });

    const { autoConnect, lastPlacedNodeId } = get();
    if (autoConnect && lastPlacedNodeId) {
      try {
        const newEdge = await api.createEdge(areaId, {
          fromNodeId: lastPlacedNodeId,
          toNodeId: newNode.nodeId,
        });
        set({ edges: [...get().edges, newEdge] });
      } catch {
        // 중복 등은 무시
      }
    }

    set({ lastPlacedNodeId: newNode.nodeId });
  },

  deleteNode: async (nodeId) => {
    const edges = get().edges;
    const selectedAreaId = useViewerStore.getState().selectedAreaId;

    // rtabmap_link 엣지 2개 → 분할 노드 → 삭제 후 엣지 병합
    const connected = edges.filter(
      (e) => (e.fromNodeId === nodeId || e.toNodeId === nodeId) && e.edgeType === "rtabmap_link",
    );

    if (connected.length === 2 && selectedAreaId) {
      const neighbors = connected.map((e) => (e.fromNodeId === nodeId ? e.toNodeId : e.fromNodeId));

      await api.deleteNode(nodeId);

      try {
        const mergedEdge = await api.createEdge(selectedAreaId, {
          fromNodeId: neighbors[0],
          toNodeId: neighbors[1],
        });
        set({
          nodes: get().nodes.filter((n) => n.nodeId !== nodeId),
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
          nodes: get().nodes.filter((n) => n.nodeId !== nodeId),
          edges: get().edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId),
          selectedNodeId: null,
        });
        toast.success("노드가 삭제되었습니다.");
      }
    } else {
      await api.deleteNode(nodeId);
      set({
        nodes: get().nodes.filter((n) => n.nodeId !== nodeId),
        edges: get().edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId),
        selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
        lastPlacedNodeId: get().lastPlacedNodeId === nodeId ? null : get().lastPlacedNodeId,
      });
      toast.success("노드가 삭제되었습니다.");
    }
  },

  createEdge: async (areaId, fromNodeId, toNodeId, edgeType) => {
    const newEdge = await api.createEdge(areaId, { fromNodeId, toNodeId, edgeType });
    set({ edges: [...get().edges, newEdge] });
    toast.success("엣지가 생성되었습니다.");
  },

  updateEdge: async (edgeId, body) => {
    const updated = await api.updateEdge(edgeId, body);
    set({
      edges: get().edges.map((e) => (e.edgeId === edgeId ? updated : e)),
    });
    toast.success("엣지가 수정되었습니다.");
  },

  deleteEdge: async (edgeId) => {
    await api.deleteEdge(edgeId);
    set({
      edges: get().edges.filter((e) => e.edgeId !== edgeId),
      selectedEdgeId: get().selectedEdgeId === edgeId ? null : get().selectedEdgeId,
    });
    toast.success("엣지가 삭제되었습니다.");
  },

  clearManualGraph: async (areaId) => {
    await api.clearManualGraph(areaId);
    const floorId = useViewerStore.getState().selectedFloorId;
    if (floorId) await get().fetchGraph(floorId, areaId);
    toast.success("수동 편집 그래프가 초기화되었습니다.");
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

  deleteSelected: async () => {
    const { selectedNodeId, selectedEdgeId } = get();
    if (selectedNodeId) {
      await get().deleteNode(selectedNodeId);
    } else if (selectedEdgeId) {
      await get().deleteEdge(selectedEdgeId);
    }
  },

  setNodeTypeToPlace: (nodeType) => set({ nodeTypeToPlace: nodeType }),
  setAutoConnect: (enabled) => set({ autoConnect: enabled, lastPlacedNodeId: null }),
  setLongPressNodeId: (nodeId) => set({ longPressNodeId: nodeId }),
  setEdgeWidthDialogId: (edgeId) => set({ edgeWidthDialogId: edgeId }),

  reset: () => set(initialState),
}));
