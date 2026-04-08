"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cable,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Link2,
  Plus,
  RefreshCcw,
  Save,
  Sparkles,
  Unplug,
  Upload,
  Trash2,
} from "lucide-react";

import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import {
  getLocaleTag,
  localizeComposerBlockDefinition,
  summarizeComposerBlock,
  translateCategory,
  translateUi,
} from "@/lib/i18n/ui";
import {
  exportConnectedCanvasDocument,
} from "@/lib/connected-canvas/export";
import {
  CONNECTED_CANVAS_STORAGE_KEY,
  importConnectedCanvasJson,
} from "@/lib/connected-canvas/import";
import {
  getConnectedCanvasCategory,
  isConnectedCanvasBlockNode,
  isConnectedCanvasGroupNode,
  isConnectedCanvasRuleFrameNode,
} from "@/lib/connected-canvas/defaults";
import {
  canNestNodeInContainer,
  createGroupContainer,
  deleteConnectedCanvasNode,
  moveContainerChild,
  moveNodeIntoContainer,
  toggleGroupCollapsed,
} from "@/lib/connected-canvas/mutate";
import { getComposerBlockDefinition } from "@/lib/composer/registry";
import { cn } from "@/lib/utils";
import { useSimulationStore } from "@/store/simulationStore";
import type {
  ConnectedCanvasDocument,
  ConnectedCanvasEdge,
  ConnectedCanvasNode,
  ConnectedCanvasPort,
} from "@/types/connected-canvas";
import type { ComposerBlock } from "@/types/composer";

type Point = {
  x: number;
  y: number;
};

type ConnectionDragState = {
  fromPortId: string;
  currentPoint: Point;
  replacingEdgeId?: string | null;
};

type ImportStatus = {
  tone: "success" | "error" | "info";
  message: string;
};

const ROOT_PORT_ORDER = ["target", "condition", "effect", "modifier"] as const;
const CONNECTED_MINIMAP_WIDTH = 220;
const CONNECTED_MINIMAP_HEIGHT = 148;
const CONNECTED_MINIMAP_PADDING = 12;
const CONNECTED_CANVAS_SAVED_AT_KEY = `${CONNECTED_CANVAS_STORAGE_KEY}:saved-at`;

const categoryAccent: Record<
  NonNullable<ReturnType<typeof getConnectedCanvasCategory>>,
  string
> = {
  target: "bg-sky-500",
  condition: "bg-amber-500",
  effect: "bg-emerald-500",
  modifier: "bg-violet-500",
};

const categoryStroke: Record<
  NonNullable<ReturnType<typeof getConnectedCanvasCategory>>,
  string
> = {
  target: "#0ea5e9",
  condition: "#f59e0b",
  effect: "#10b981",
  modifier: "#8b5cf6",
};

function getCanvasBounds(document: ConnectedCanvasDocument) {
  if (document.layouts.length === 0) {
    return { width: 1200, height: 760 };
  }

  const maxX = Math.max(...document.layouts.map((layout) => layout.x + layout.width));
  const maxY = Math.max(...document.layouts.map((layout) => layout.y + layout.height));

  return {
    width: Math.max(1200, maxX + 160),
    height: Math.max(760, maxY + 120),
  };
}

function getPortPosition(
  node: ConnectedCanvasNode,
  layout: { x: number; y: number; width: number; height: number },
  port: ConnectedCanvasPort,
): Point {
  if (isConnectedCanvasRuleFrameNode(node)) {
    const index = ROOT_PORT_ORDER.indexOf(port.key as (typeof ROOT_PORT_ORDER)[number]);
    return {
      x: layout.x,
      y: layout.y + 72 + Math.max(0, index) * 46,
    };
  }

  return {
    x: layout.x + layout.width,
    y: layout.y + layout.height / 2,
  };
}

function buildEdgePath(start: Point, end: Point) {
  const delta = Math.max(72, Math.abs(end.x - start.x) * 0.45);
  return `M ${start.x} ${start.y} C ${start.x + delta} ${start.y}, ${end.x - delta} ${end.y}, ${end.x} ${end.y}`;
}

function downloadFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getNodeDisplayLabel(
  node: ConnectedCanvasNode | null,
  language: "ko" | "en",
) {
  if (!node) {
    return translateUi(language, "Unknown");
  }

  if (isConnectedCanvasRuleFrameNode(node)) {
    return node.name;
  }

  if (isConnectedCanvasGroupNode(node)) {
    return node.label;
  }

  return (
    (getComposerBlockDefinition(node.block.type, node.block.category)
      ? localizeComposerBlockDefinition(
          getComposerBlockDefinition(node.block.type, node.block.category)!,
          language,
        ).label
      : undefined) ??
    node.block.id
  );
}

function getDeleteActionLabel(
  node: ConnectedCanvasNode,
  language: "ko" | "en",
) {
  if (isConnectedCanvasRuleFrameNode(node)) {
    return translateUi(language, "Delete Rule Frame");
  }

  if (isConnectedCanvasGroupNode(node)) {
    return translateUi(language, "Delete Group");
  }

  return translateUi(language, "Delete Block");
}

function getDeleteActionHelpText(
  node: ConnectedCanvasNode,
  language: "ko" | "en",
) {
  if (isConnectedCanvasRuleFrameNode(node)) {
    return translateUi(
      language,
      "Deleting a rule frame removes the entire rule graph inside that frame.",
    );
  }

  if (isConnectedCanvasGroupNode(node)) {
    return translateUi(
      language,
      "Deleting a group keeps child nodes by hoisting them into the parent container or back to the rule frame root.",
    );
  }

  return translateUi(
    language,
    "Deleting a block removes its node and any connected edges from the current rule.",
  );
}

function formatSavedDraftAt(
  savedAt: string | null,
  language: "ko" | "en",
  localeTag: string,
) {
  if (!savedAt) {
    return translateUi(language, "No browser draft saved yet.");
  }

  const date = new Date(savedAt);

  if (Number.isNaN(date.getTime())) {
    return translateUi(language, "Browser draft saved.");
  }

  return language === "ko"
    ? `${date.toLocaleString(localeTag)} 저장`
    : `Saved ${date.toLocaleString(localeTag)}`;
}

function getMinimapNodeColors(node: ConnectedCanvasNode) {
  if (isConnectedCanvasRuleFrameNode(node)) {
    return {
      border: "rgba(15, 23, 42, 0.55)",
      background: "rgba(148, 163, 184, 0.18)",
    };
  }

  const category = getConnectedCanvasCategory(node);

  return {
    border: category ? categoryStroke[category] : "rgba(71, 85, 105, 0.45)",
    background: category
      ? `${categoryStroke[category]}22`
      : "rgba(100, 116, 139, 0.18)",
  };
}

export function ConnectedPolicyCanvas() {
  const { language } = useLanguage();
  const localeTag = getLocaleTag(language);
  const policiesDraft = useSimulationStore((state) => state.policiesDraft);
  const connectedCanvasDraft = useSimulationStore(
    (state) => state.connectedCanvasDraft,
  );
  const connectedCanvasApplied = useSimulationStore(
    (state) => state.connectedCanvasApplied,
  );
  const connectedCanvasSelection = useSimulationStore(
    (state) => state.connectedCanvasSelection,
  );
  const connectedCanvasValidationIssues = useSimulationStore(
    (state) => state.connectedCanvasValidationIssues,
  );
  const setConnectedCanvasDraft = useSimulationStore(
    (state) => state.setConnectedCanvasDraft,
  );
  const importPoliciesToComposerDraft = useSimulationStore(
    (state) => state.importPoliciesToComposerDraft,
  );
  const importCanvasToConnectedCanvasDraft = useSimulationStore(
    (state) => state.importCanvasToConnectedCanvasDraft,
  );
  const resetConnectedCanvasDraft = useSimulationStore(
    (state) => state.resetConnectedCanvasDraft,
  );
  const setConnectedCanvasSelection = useSimulationStore(
    (state) => state.setConnectedCanvasSelection,
  );

  const [connectionDrag, setConnectionDrag] = useState<ConnectionDragState | null>(
    null,
  );
  const [nestedDragNodeId, setNestedDragNodeId] = useState<string | null>(null);
  const [hoveredContainerId, setHoveredContainerId] = useState<string | null>(null);
  const [hoveredInputPortId, setHoveredInputPortId] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [importJsonDraft, setImportJsonDraft] = useState("");
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [savedDraftExists, setSavedDraftExists] = useState(false);
  const [savedDraftAt, setSavedDraftAt] = useState<string | null>(null);
  const [minimapDragging, setMinimapDragging] = useState(false);
  const [viewportRect, setViewportRect] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const innerCanvasRef = useRef<HTMLDivElement | null>(null);
  const workspaceScrollRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLDivElement | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  const exportPayload = useMemo(
    () => exportConnectedCanvasDocument(connectedCanvasDraft),
    [connectedCanvasDraft],
  );

  const layoutMap = useMemo(
    () =>
      new Map(
        connectedCanvasDraft.layouts.map((layout) => [layout.nodeId, layout] as const),
      ),
    [connectedCanvasDraft.layouts],
  );
  const nodeMap = useMemo(
    () =>
      new Map(
        connectedCanvasDraft.nodes.map((node) => [node.id, node] as const),
      ),
    [connectedCanvasDraft.nodes],
  );
  const portMap = useMemo(
    () =>
      new Map(
        connectedCanvasDraft.ports.map((port) => [port.id, port] as const),
      ),
    [connectedCanvasDraft.ports],
  );
  const containerMap = useMemo(
    () =>
      new Map(
        connectedCanvasDraft.containers.map((container) => [
          container.containerNodeId,
          container.childNodeIds,
        ] as const),
      ),
    [connectedCanvasDraft.containers],
  );
  const childOwnerMap = useMemo(() => {
    const map = new Map<string, string>();

    connectedCanvasDraft.containers.forEach((container) => {
      container.childNodeIds.forEach((childNodeId) => {
        map.set(childNodeId, container.containerNodeId);
      });
    });

    return map;
  }, [connectedCanvasDraft.containers]);
  const bounds = useMemo(
    () => getCanvasBounds(connectedCanvasDraft),
    [connectedCanvasDraft],
  );
  const minimapScale = useMemo(
    () =>
      Math.min(
        (CONNECTED_MINIMAP_WIDTH - CONNECTED_MINIMAP_PADDING * 2) / bounds.width,
        (CONNECTED_MINIMAP_HEIGHT - CONNECTED_MINIMAP_PADDING * 2) / bounds.height,
      ),
    [bounds.height, bounds.width],
  );
  const minimapContentWidth = bounds.width * minimapScale;
  const minimapContentHeight = bounds.height * minimapScale;
  const rootVisibleNodeIds = useMemo(
    () =>
      new Set(
        connectedCanvasDraft.nodes
          .filter((node) => node.kind === "rule-frame" || !childOwnerMap.has(node.id))
          .map((node) => node.id),
      ),
    [childOwnerMap, connectedCanvasDraft.nodes],
  );

  const selectedNode = connectedCanvasSelection.nodeId
    ? nodeMap.get(connectedCanvasSelection.nodeId) ?? null
    : null;
  const selectedEdge = connectedCanvasSelection.edgeId
    ? connectedCanvasDraft.edges.find(
        (edge) => edge.id === connectedCanvasSelection.edgeId,
      ) ?? null
    : null;

  const selectedEdgeNodes =
    selectedEdge &&
    portMap.has(selectedEdge.fromPortId) &&
    portMap.has(selectedEdge.toPortId)
      ? {
          from: nodeMap.get(portMap.get(selectedEdge.fromPortId)!.nodeId) ?? null,
          to: nodeMap.get(portMap.get(selectedEdge.toPortId)!.nodeId) ?? null,
        }
      : null;
  const hoveredInputPort = hoveredInputPortId
    ? portMap.get(hoveredInputPortId) ?? null
    : null;
  const hoveredInputNode = hoveredInputPort
    ? nodeMap.get(hoveredInputPort.nodeId) ?? null
    : null;
  const draggedSourcePort = connectionDrag
    ? portMap.get(connectionDrag.fromPortId) ?? null
    : null;
  const draggedSourceNode = draggedSourcePort
    ? nodeMap.get(draggedSourcePort.nodeId) ?? null
    : null;
  const nestedDraggedNode = nestedDragNodeId
    ? nodeMap.get(nestedDragNodeId) ?? null
    : null;
  const errorIssues = connectedCanvasValidationIssues.filter(
    (issue) => issue.severity === "error",
  );
  const warningIssues = connectedCanvasValidationIssues.filter(
    (issue) => issue.severity === "warning",
  );

  function updateDocument(document: ConnectedCanvasDocument) {
    setConnectedCanvasDraft(document);
  }

  function clearSelection() {
    setConnectedCanvasSelection({
      nodeId: null,
      edgeId: null,
      portId: null,
    });
    setHoveredInputPortId(null);
  }

  function updateViewportRectFromWorkspace() {
    const workspaceNode = workspaceScrollRef.current;

    if (!workspaceNode) {
      return;
    }

    setViewportRect({
      left: workspaceNode.scrollLeft,
      top: workspaceNode.scrollTop,
      width: workspaceNode.clientWidth,
      height: workspaceNode.clientHeight,
    });
  }

  function centerWorkspaceOnWorldPoint(worldX: number, worldY: number) {
    const workspaceNode = workspaceScrollRef.current;

    if (!workspaceNode) {
      return;
    }

    const nextLeft = Math.max(
      0,
      Math.min(bounds.width - workspaceNode.clientWidth, worldX - workspaceNode.clientWidth / 2),
    );
    const nextTop = Math.max(
      0,
      Math.min(bounds.height - workspaceNode.clientHeight, worldY - workspaceNode.clientHeight / 2),
    );

    workspaceNode.scrollTo({
      left: nextLeft,
      top: nextTop,
      behavior: "auto",
    });
    window.requestAnimationFrame(() => updateViewportRectFromWorkspace());
  }

  function updateViewportFromMinimapClient(clientX: number, clientY: number) {
    const minimapNode = minimapRef.current;

    if (!minimapNode || minimapScale === 0) {
      return;
    }

    const rect = minimapNode.getBoundingClientRect();
    const contentWidth = bounds.width * minimapScale;
    const contentHeight = bounds.height * minimapScale;
    const offsetX = (rect.width - contentWidth) / 2;
    const offsetY = (rect.height - contentHeight) / 2;
    const localX = Math.max(0, Math.min(contentWidth, clientX - rect.left - offsetX));
    const localY = Math.max(0, Math.min(contentHeight, clientY - rect.top - offsetY));

    centerWorkspaceOnWorldPoint(localX / minimapScale, localY / minimapScale);
  }

  function persistDraftToBrowser(showFeedback = false) {
    if (typeof window === "undefined") {
      return;
    }

    const savedAt = new Date().toISOString();
    window.localStorage.setItem(CONNECTED_CANVAS_STORAGE_KEY, exportPayload.json);
    window.localStorage.setItem(CONNECTED_CANVAS_SAVED_AT_KEY, savedAt);
    setSavedDraftExists(true);
    setSavedDraftAt(savedAt);

    if (showFeedback) {
      setImportStatus({
        tone: "success",
        message: translateUi(
          language,
          "Connected canvas draft saved to browser storage.",
        ),
      });
    }
  }

  function loadDocumentFromJson(json: string, sourceLabel: string) {
    const result = importConnectedCanvasJson(json);

    if (!result.ok) {
      setImportStatus({
        tone: "error",
        message: result.error,
      });
      return;
    }

    updateDocument(result.document);
    setImportJsonDraft(JSON.stringify(result.document, null, 2));
    clearSelection();
    setImportStatus({
      tone: "success",
      message:
        language === "ko"
          ? `${sourceLabel}에서 연결 캔버스를 불러왔습니다.`
          : `Connected canvas loaded from ${sourceLabel}.`,
    });
  }

  function loadSavedDraftFromBrowser() {
    if (typeof window === "undefined") {
      return;
    }

    const savedJson = window.localStorage.getItem(CONNECTED_CANVAS_STORAGE_KEY);

    if (!savedJson) {
      setImportStatus({
        tone: "info",
        message: translateUi(
          language,
          "No browser-saved connected canvas draft is available yet.",
        ),
      });
      return;
    }

    loadDocumentFromJson(savedJson, "browser storage");
  }

  function clearSavedDraftFromBrowser() {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(CONNECTED_CANVAS_STORAGE_KEY);
    window.localStorage.removeItem(CONNECTED_CANVAS_SAVED_AT_KEY);
    setSavedDraftExists(false);
    setSavedDraftAt(null);
    setImportStatus({
      tone: "info",
      message: translateUi(
        language,
        "Browser-saved connected canvas draft cleared.",
      ),
    });
  }

  async function handleImportFile(file: File | null) {
    if (!file) {
      return;
    }

    const json = await file.text();
    setImportJsonDraft(json);
    loadDocumentFromJson(json, file.name);
  }

  function startNestedDrag(nodeId: string) {
    setNestedDragNodeId(nodeId);
    setHoveredContainerId(null);
  }

  function endNestedDrag() {
    setNestedDragNodeId(null);
    setHoveredContainerId(null);
  }

  function canDropNestedNode(containerNodeId: string) {
    if (!nestedDragNodeId) {
      return false;
    }

    return canNestNodeInContainer(
      connectedCanvasDraft,
      nestedDragNodeId,
      containerNodeId,
    );
  }

  function handleDropIntoContainer(containerNodeId: string) {
    if (!nestedDragNodeId || !canDropNestedNode(containerNodeId)) {
      endNestedDrag();
      return;
    }

    updateDocument(
      moveNodeIntoContainer(
        connectedCanvasDraft,
        nestedDragNodeId,
        containerNodeId,
      ),
    );
    setConnectedCanvasSelection({
      nodeId: nestedDragNodeId,
      edgeId: null,
      portId: null,
    });
    endNestedDrag();
  }

  function beginConnectionDrag(
    fromPortId: string,
    point: Point,
    replacingEdgeId?: string | null,
  ) {
    setConnectionDrag({
      fromPortId,
      currentPoint: point,
      replacingEdgeId: replacingEdgeId ?? null,
    });
    setHoveredInputPortId(null);
  }

  function getLocalPoint(clientX: number, clientY: number) {
    const boundsRect = innerCanvasRef.current?.getBoundingClientRect();

    if (!boundsRect) {
      return { x: clientX, y: clientY };
    }

    return {
      x: clientX - boundsRect.left,
      y: clientY - boundsRect.top,
    };
  }

  function isValidInputTarget(port: ConnectedCanvasPort) {
    if (!connectionDrag || port.direction !== "input") {
      return false;
    }

    const fromPort = portMap.get(connectionDrag.fromPortId);
    const fromNode = fromPort ? nodeMap.get(fromPort.nodeId) : null;
    const toNode = nodeMap.get(port.nodeId);

    if (!fromPort || !fromNode || !toNode) {
      return false;
    }

    const compatible = fromPort.provides.some((type) => port.accepts.includes(type));
    const sameRule = "ruleId" in fromNode && "ruleId" in toNode
      ? fromNode.ruleId === toNode.ruleId
      : false;

    return compatible && sameRule;
  }

  function connectPorts(fromPortId: string, toPortId: string) {
    const fromPort = portMap.get(fromPortId);
    const toPort = portMap.get(toPortId);

    if (!fromPort || !toPort || !isValidInputTarget(toPort)) {
      setConnectionDrag(null);
      return;
    }

    const nextEdges = connectedCanvasDraft.edges.filter((edge) => {
      if (connectionDrag?.replacingEdgeId && edge.id === connectionDrag.replacingEdgeId) {
        return false;
      }

      if (edge.fromPortId === fromPortId && edge.toPortId === toPortId) {
        return false;
      }

      if (toPort.maxConnections === 1 && edge.toPortId === toPortId) {
        return false;
      }

      return true;
    });
    const nextEdge: ConnectedCanvasEdge = {
      id: `edge:${fromPortId}:to:${toPortId}:${nextEdges.length + 1}`,
      fromPortId,
      toPortId,
    };

    updateDocument({
      ...connectedCanvasDraft,
      edges: [...nextEdges, nextEdge],
    });
    setConnectedCanvasSelection({
      nodeId: null,
      edgeId: nextEdge.id,
      portId: toPortId,
    });
    setConnectionDrag(null);
    setHoveredInputPortId(null);
  }

  function unlinkEdge(edgeId: string) {
    updateDocument({
      ...connectedCanvasDraft,
      edges: connectedCanvasDraft.edges.filter((edge) => edge.id !== edgeId),
    });
    setConnectedCanvasSelection({
      nodeId: null,
      edgeId: null,
      portId: null,
    });
    setHoveredInputPortId(null);
  }

  function deleteSelectedNode() {
    if (!selectedNode) {
      return;
    }

    updateDocument(deleteConnectedCanvasNode(connectedCanvasDraft, selectedNode.id));
    clearSelection();
    setImportStatus({
      tone: "info",
      message:
        language === "ko"
          ? `${getNodeDisplayLabel(selectedNode, language)} 항목을 연결 초안에서 삭제했습니다.`
          : `${getNodeDisplayLabel(selectedNode, language)} deleted from the connected canvas draft.`,
    });
  }

  function addRootGroup(
    ruleId: string,
    category: "condition" | "effect" | "modifier",
  ) {
    updateDocument(createGroupContainer(connectedCanvasDraft, ruleId, category));
  }

  function addNestedGroup(
    ruleId: string,
    parentContainerId: string,
    category: "condition" | "effect" | "modifier",
  ) {
    updateDocument(
      createGroupContainer(
        connectedCanvasDraft,
        ruleId,
        category,
        parentContainerId,
      ),
    );
  }

  function toggleGroup(nodeId: string) {
    updateDocument(toggleGroupCollapsed(connectedCanvasDraft, nodeId));
  }

  async function copyJson() {
    await navigator.clipboard.writeText(exportPayload.json);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1400);
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setSavedDraftExists(
      window.localStorage.getItem(CONNECTED_CANVAS_STORAGE_KEY) !== null,
    );
    setSavedDraftAt(window.localStorage.getItem(CONNECTED_CANVAS_SAVED_AT_KEY));
  }, []);

  useEffect(() => {
    persistDraftToBrowser(false);
  }, [exportPayload.json]);

  useEffect(() => {
    const workspaceNode = workspaceScrollRef.current;

    if (!workspaceNode) {
      return;
    }

    updateViewportRectFromWorkspace();

    const handleScroll = () => updateViewportRectFromWorkspace();

    workspaceNode.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      workspaceNode.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [bounds.height, bounds.width]);

  useEffect(() => {
    if (!minimapDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      updateViewportFromMinimapClient(event.clientX, event.clientY);
    };

    const handlePointerUp = () => {
      setMinimapDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [minimapDragging, minimapScale, bounds.height, bounds.width]);

  useEffect(() => {
    if (!connectionDrag) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      setConnectionDrag((current) =>
        current
          ? {
              ...current,
              currentPoint: getLocalPoint(event.clientX, event.clientY),
            }
          : null,
      );
    };

    const handlePointerUp = () => {
      setConnectionDrag(null);
      setHoveredInputPortId(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [connectionDrag]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      if (
        target?.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      ) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setConnectionDrag(null);
        setNestedDragNodeId(null);
        setHoveredContainerId(null);
        setHoveredInputPortId(null);
        clearSelection();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedEdge) {
          event.preventDefault();
          unlinkEdge(selectedEdge.id);
          return;
        }

        if (selectedNode) {
          event.preventDefault();
          deleteSelectedNode();
        }
        return;
      }

      if (!selectedNode) {
        return;
      }

      if ((event.key === "Enter" || event.key === " ") && isConnectedCanvasGroupNode(selectedNode)) {
        event.preventDefault();
        toggleGroup(selectedNode.id);
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const ownerContainerId = childOwnerMap.get(selectedNode.id);

        if (!ownerContainerId) {
          return;
        }

        event.preventDefault();
        updateDocument(
          moveContainerChild(
            connectedCanvasDraft,
            ownerContainerId,
            selectedNode.id,
            event.key === "ArrowUp" ? "up" : "down",
          ),
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    childOwnerMap,
    connectedCanvasDraft,
    selectedEdge,
    selectedNode,
    setConnectedCanvasSelection,
  ]);

  function renderContainerChildren(
    containerNodeId: string,
    depth = 0,
  ): ReactNode {
    const childNodeIds = containerMap.get(containerNodeId) ?? [];

    if (childNodeIds.length === 0) {
      return (
        <div
          className={cn(
            "rounded-2xl border border-dashed px-3 py-3 text-xs leading-5 text-muted-foreground transition-colors",
            canDropNestedNode(containerNodeId) && hoveredContainerId === containerNodeId
              ? "border-teal-500 bg-teal-50/80 text-teal-700"
              : "border-slate-300 bg-white/70",
          )}
        >
          {canDropNestedNode(containerNodeId) && hoveredContainerId === containerNodeId
            ? translateUi(language, "Drop here to nest into this container.")
            : translateUi(language, "Drop compatible blocks or sub-groups here.")}
        </div>
      );
    }

    return childNodeIds.map((childNodeId, index) => {
      const childNode = nodeMap.get(childNodeId);

      if (!childNode || isConnectedCanvasRuleFrameNode(childNode)) {
        return null;
      }

      const selected = connectedCanvasSelection.nodeId === childNode.id;
      const category = getConnectedCanvasCategory(childNode);
      const nestedChildren = isConnectedCanvasGroupNode(childNode)
        ? containerMap.get(childNode.id) ?? []
        : [];

      return (
        <div
          key={childNode.id}
          draggable
          onDragStart={() => startNestedDrag(childNode.id)}
          onDragEnd={endNestedDrag}
          onClick={(event) => {
            event.stopPropagation();
            setConnectedCanvasSelection({
              nodeId: childNode.id,
              edgeId: null,
              portId: null,
            });
          }}
          className={cn(
            "rounded-[1.15rem] border bg-white/95 px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition",
            depth > 0 ? "ml-4" : "",
            selected ? "border-teal-600 ring-2 ring-teal-500/10" : "border-slate-200",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {isConnectedCanvasGroupNode(childNode)
                  ? translateUi(language, "Nested Group")
                  : translateCategory(language, childNode.block.category)}
              </p>
              <p className="truncate text-sm font-semibold">
                {getNodeDisplayLabel(childNode, language)}
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                {isConnectedCanvasGroupNode(childNode)
                  ? language === "ko"
                    ? `하위 노드 ${nestedChildren.length}개`
                    : `${nestedChildren.length} child nodes`
                  : summarizeComposerBlock(language, childNode.block)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "rounded-full px-2 py-1 text-[10px] font-medium text-white",
                  category ? categoryAccent[category] : "bg-slate-500",
                )}
              >
                {isConnectedCanvasGroupNode(childNode)
                  ? childNode.category
                  : childNode.block.type}
              </span>
              <Button
                variant="outline"
                className="h-7 rounded-full px-2"
                disabled={index === 0}
                onClick={(event) => {
                  event.stopPropagation();
                  updateDocument(
                    moveContainerChild(
                      connectedCanvasDraft,
                      containerNodeId,
                      childNode.id,
                      "up",
                    ),
                  );
                }}
              >
                ↑
              </Button>
              <Button
                variant="outline"
                className="h-7 rounded-full px-2"
                disabled={index === childNodeIds.length - 1}
                onClick={(event) => {
                  event.stopPropagation();
                  updateDocument(
                    moveContainerChild(
                      connectedCanvasDraft,
                      containerNodeId,
                      childNode.id,
                      "down",
                    ),
                  );
                }}
              >
                ↓
              </Button>
            </div>
          </div>

          {isConnectedCanvasGroupNode(childNode) ? (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleGroup(childNode.id);
                  }}
                >
                  {childNode.collapsed ? (
                    <ChevronRight className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {childNode.collapsed
                    ? translateUi(language, "Expand")
                    : translateUi(language, "Collapse")}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={(event) => {
                    event.stopPropagation();
                    addNestedGroup(
                      childNode.ruleId,
                      childNode.id,
                      childNode.category,
                    );
                  }}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {translateUi(language, "Add Nested Group")}
                </Button>
              </div>

              {childNode.collapsed ? (
                <div className="flex flex-wrap gap-2">
                  {nestedChildren.slice(0, 4).map((nestedChildId) => (
                    <span
                      key={nestedChildId}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                    >
                      {getNodeDisplayLabel(nodeMap.get(nestedChildId) ?? null, language)}
                    </span>
                  ))}
                </div>
              ) : (
                <div
                  className={cn(
                    "rounded-2xl border border-dashed p-3",
                    canDropNestedNode(childNode.id) && hoveredContainerId === childNode.id
                      ? "border-teal-500 bg-teal-50/80"
                      : "border-slate-300 bg-slate-50/60",
                  )}
                  onDragOver={(event) => {
                    if (!canDropNestedNode(childNode.id)) {
                      return;
                    }

                    event.preventDefault();
                    setHoveredContainerId(childNode.id);
                  }}
                  onDragLeave={() => {
                    if (hoveredContainerId === childNode.id) {
                      setHoveredContainerId(null);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleDropIntoContainer(childNode.id);
                  }}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {translateUi(language, "Child Drop Zone")}
                    </p>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                      {nestedChildren.length} {language === "ko" ? "개" : "items"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {renderContainerChildren(childNode.id, depth + 1)}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      );
    });
  }

  return (
    <section className="space-y-4 rounded-[2rem] border border-border/80 bg-white/85 p-6 shadow-[0_24px_80px_rgba(14,59,64,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            {translateUi(language, "Phase 11 Connected Canvas Hardening")}
          </p>
          <div className="space-y-1">
            <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight">
              {translateUi(
                language,
                "Edit, delete, save, and navigate the connected policy graph.",
              )}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {translateUi(
                language,
                "Nested groups still edit directly inside the connected workspace, and now the same draft also supports block or group deletion, browser persistence, JSON import or export, and minimap navigation.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-3 py-1">
              {translateUi(language, "Draft")} {connectedCanvasDraft.nodes.length}{" "}
              {translateUi(language, "nodes")}
            </span>
            <span className="rounded-full bg-muted px-3 py-1">
              {translateUi(language, "Draft")} {connectedCanvasDraft.edges.length}{" "}
              {translateUi(language, "edges")}
            </span>
            <span className="rounded-full bg-muted px-3 py-1">
              {translateUi(language, "Active")} {connectedCanvasApplied.edges.length}{" "}
              {translateUi(language, "edges")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => importPoliciesToComposerDraft(policiesDraft)}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {translateUi(language, "Import Draft Policies")}
          </Button>
          <Button variant="outline" onClick={() => importCanvasToConnectedCanvasDraft()}>
            <Cable className="mr-2 h-4 w-4" />
            {translateUi(language, "Import Phase 10")}
          </Button>
          <Button variant="outline" onClick={() => resetConnectedCanvasDraft()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {translateUi(language, "Reset Connected Draft")}
          </Button>
          <Button variant="outline" onClick={() => void copyJson()}>
            <Copy className="mr-2 h-4 w-4" />
            {copyState === "copied"
              ? translateUi(language, "Copied JSON")
              : translateUi(language, "Copy Connected JSON")}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadFile(exportPayload.filename, exportPayload.json)
            }
          >
            <Download className="mr-2 h-4 w-4" />
            {translateUi(language, "Download Canvas")}
          </Button>
        </div>
      </div>

      {errorIssues.length > 0 || warningIssues.length > 0 ? (
        <div
          className={cn(
            "rounded-[1.5rem] border px-5 py-4",
            errorIssues.length > 0
              ? "border-rose-200 bg-rose-50/90"
              : "border-amber-200 bg-amber-50/90",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p
                className={cn(
                  "text-[11px] uppercase tracking-[0.2em]",
                  errorIssues.length > 0 ? "text-rose-700" : "text-amber-700",
                )}
              >
                {errorIssues.length > 0
                  ? translateUi(language, "Apply blocked")
                  : translateUi(language, "Warnings active")}
              </p>
              <p className="text-sm leading-6 text-foreground/85">
                {errorIssues.length > 0
                  ? `Resolve ${errorIssues.length} connected-canvas error${errorIssues.length > 1 ? "s" : ""} before applying this draft.`
                  : `${warningIssues.length} warning${warningIssues.length > 1 ? "s are" : " is"} present in the connected canvas draft.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {errorIssues.length > 0 ? (
                <span className="rounded-full bg-white px-3 py-1">
                  Errors {errorIssues.length}
                </span>
              ) : null}
              {warningIssues.length > 0 ? (
                <span className="rounded-full bg-white px-3 py-1">
                  Warnings {warningIssues.length}
                </span>
              ) : null}
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground/80">
            {(errorIssues[0] ?? warningIssues[0])?.message}
          </p>
        </div>
      ) : null}

      <div className="rounded-[1.5rem] border border-border/70 bg-stone-50/80 p-4">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-white px-3 py-1">
              {language === "ko"
                ? "`Esc`로 선택과 드래그 상태를 해제"
                : "`Esc` clears selection and drag state"}
            </span>
            <span className="rounded-full bg-white px-3 py-1">
              {language === "ko"
                ? "`Delete`로 선택한 엣지 또는 노드를 삭제"
                : "`Delete` removes the selected edge or node"}
            </span>
            <span className="rounded-full bg-white px-3 py-1">
              {language === "ko"
                ? "`Enter`로 선택한 그룹을 열고 닫기"
                : "`Enter` toggles selected group"}
            </span>
            <span className="rounded-full bg-white px-3 py-1">
              {language === "ko"
                ? "`Arrow Up / Down`으로 선택한 하위 항목 순서 변경"
                : "`Arrow Up / Down` reorders a selected nested child"}
            </span>
            <span className="rounded-full bg-white px-3 py-1">
              {translateUi(
                language,
                "Browser autosave keeps the latest connected draft",
              )}
            </span>
          </div>
      </div>

      <div className="rounded-[1.6rem] border border-dashed border-border/70 bg-muted/20 p-5 lg:hidden">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {translateUi(language, "Mobile Fallback")}
        </p>
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight">
          {translateUi(language, "Connected canvas stays desktop-first for now.")}
        </h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {translateUi(
            language,
            "On narrow screens, use the scratch-style frame canvas or the vertical composer below. The connected graph editor remains available on larger viewports where edge wiring and nested groups are easier to manage.",
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => importCanvasToConnectedCanvasDraft()}>
            <Cable className="mr-2 h-4 w-4" />
            {translateUi(language, "Refresh Connected Draft")}
          </Button>
          <span className="rounded-full bg-white px-3 py-2 text-xs text-muted-foreground">
            {translateUi(language, "Scratch canvas fallback remains active below")}
          </span>
        </div>
      </div>

      <div className="hidden gap-6 lg:grid xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[1.75rem] border border-border/70 bg-stone-50/90 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {translateUi(language, "Connected Workspace")}
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                {translateUi(
                  language,
                  "Drag from an output port into a highlighted input port. Dropping onto an occupied single-input slot replaces the old edge.",
                )}
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-muted-foreground">
              {translateUi(language, "Nested groups enabled in 11.3")}
            </span>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-white px-3 py-1">
              {connectionDrag?.replacingEdgeId
                ? translateUi(language, "Reconnect mode")
                : translateUi(language, "Connect mode")}
            </span>
            {connectionDrag ? (
              <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-700">
                {getNodeDisplayLabel(draggedSourceNode, language)}{" "}
                {hoveredInputPort && hoveredInputNode ? (
                  <>→ {getNodeDisplayLabel(hoveredInputNode, language)} / {hoveredInputPort.key}</>
                ) : (
                  `→ ${translateUi(language, "choose a highlighted root slot")}`
                )}
              </span>
            ) : null}
          </div>

          <div
            ref={workspaceScrollRef}
            className="overflow-auto rounded-[1.5rem] border border-border/60 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(245,244,239,0.94))]"
          >
            <div
              ref={innerCanvasRef}
              className="relative"
              style={{ width: bounds.width, height: bounds.height }}
              onClick={() => {
                clearSelection();
              }}
            >
              <svg className="absolute inset-0 h-full w-full">
                {connectedCanvasDraft.containers.flatMap((container) => {
                  const containerNode = nodeMap.get(container.containerNodeId);
                  const containerLayout = containerNode
                    ? layoutMap.get(container.containerNodeId)
                    : null;

                  if (!containerNode || !containerLayout || !isConnectedCanvasGroupNode(containerNode)) {
                    return [];
                  }

                  const showContainment =
                    connectedCanvasSelection.nodeId === container.containerNodeId ||
                    container.childNodeIds.includes(connectedCanvasSelection.nodeId ?? "");

                  return container.childNodeIds.flatMap((childNodeId) => {
                    if (!rootVisibleNodeIds.has(childNodeId)) {
                      return [];
                    }

                    const childLayout = layoutMap.get(childNodeId);

                    if (!childLayout) {
                      return [];
                    }

                    const start = {
                      x: containerLayout.x + 18,
                      y: containerLayout.y + 48,
                    };
                    const end = {
                      x: childLayout.x - 8,
                      y: childLayout.y + childLayout.height / 2,
                    };

                    return (
                      <path
                        key={`container-link:${container.containerNodeId}:${childNodeId}`}
                        d={buildEdgePath(start, end)}
                        fill="none"
                        stroke={showContainment ? "#94a3b8" : "#cbd5e1"}
                        strokeWidth={showContainment ? 2 : 1.5}
                        strokeDasharray="5 6"
                        opacity={showContainment ? 1 : 0.55}
                      />
                    );
                  });
                })}

                {connectedCanvasDraft.edges.map((edge) => {
                  const fromPort = portMap.get(edge.fromPortId);
                  const toPort = portMap.get(edge.toPortId);

                  if (!fromPort || !toPort) {
                    return null;
                  }

                  const fromNode = nodeMap.get(fromPort.nodeId);
                  const toNode = nodeMap.get(toPort.nodeId);
                  const fromLayout = fromNode ? layoutMap.get(fromNode.id) : null;
                  const toLayout = toNode ? layoutMap.get(toNode.id) : null;

                  if (!fromNode || !toNode || !fromLayout || !toLayout) {
                    return null;
                  }

                  const start = getPortPosition(fromNode, fromLayout, fromPort);
                  const end = getPortPosition(toNode, toLayout, toPort);
                  const selected = connectedCanvasSelection.edgeId === edge.id;
                  const category = getConnectedCanvasCategory(fromNode);

                  return (
                    <g key={edge.id} className="pointer-events-auto">
                      <path
                        d={buildEdgePath(start, end)}
                        fill="none"
                        stroke={selected ? "#0f766e" : "#94a3b8"}
                        strokeWidth={selected ? 3.5 : 2.5}
                        strokeLinecap="round"
                        onClick={(event) => {
                          event.stopPropagation();
                          setConnectedCanvasSelection({
                            nodeId: null,
                            edgeId: edge.id,
                            portId: toPort.id,
                          });
                        }}
                      />
                      <circle
                        cx={end.x}
                        cy={end.y}
                        r={5}
                        fill={category ? categoryStroke[category] : "#94a3b8"}
                      />
                    </g>
                  );
                })}

                {connectionDrag ? (() => {
                  const fromPort = portMap.get(connectionDrag.fromPortId);
                  const fromNode = fromPort ? nodeMap.get(fromPort.nodeId) : null;
                  const fromLayout = fromNode ? layoutMap.get(fromNode.id) : null;

                  if (!fromPort || !fromNode || !fromLayout) {
                    return null;
                  }

                  const start = getPortPosition(fromNode, fromLayout, fromPort);

                  return (
                    <path
                      d={buildEdgePath(start, connectionDrag.currentPoint)}
                      fill="none"
                      stroke="#0f766e"
                      strokeWidth={2.5}
                      strokeDasharray="8 7"
                      strokeLinecap="round"
                    />
                  );
                })() : null}
              </svg>

              {connectedCanvasDraft.nodes.map((node) => {
                const layout = layoutMap.get(node.id);

                if (!layout) {
                  return null;
                }

                if (!isConnectedCanvasRuleFrameNode(node) && !rootVisibleNodeIds.has(node.id)) {
                  return null;
                }

                const selected = connectedCanvasSelection.nodeId === node.id;

                if (isConnectedCanvasRuleFrameNode(node)) {
                  return (
                    <div
                      key={node.id}
                      tabIndex={0}
                      className={cn(
                        "absolute rounded-[1.65rem] border bg-white/96 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.10)]",
                        selected
                          ? "border-teal-600 ring-2 ring-teal-500/20"
                          : "border-slate-200",
                      )}
                      style={{
                        left: layout.x,
                        top: layout.y,
                        width: layout.width,
                        minHeight: layout.height,
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setConnectedCanvasSelection({
                          nodeId: node.id,
                          edgeId: null,
                          portId: null,
                        });
                      }}
                      onFocus={() =>
                        setConnectedCanvasSelection({
                          nodeId: node.id,
                          edgeId: null,
                          portId: null,
                        })
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {translateUi(language, "Rule Frame")}
                          </p>
                          <h3 className="font-semibold leading-tight">{node.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {node.ruleId} ·{" "}
                            {node.cadence === "step"
                              ? translateUi(language, "Step")
                              : translateUi(language, "Year")}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-medium",
                            node.enabled
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {node.enabled
                            ? translateUi(language, "Enabled")
                            : translateUi(language, "Disabled")}
                        </span>
                      </div>

                      <div className="mt-5 space-y-2.5">
                        {ROOT_PORT_ORDER.map((portKey) => {
                          const portId = `${node.id}:input:${portKey}`;
                          const port = portMap.get(portId);
                          const incomingCount = connectedCanvasDraft.edges.filter(
                            (edge) => edge.toPortId === portId,
                          ).length;
                          const validDrop = port ? isValidInputTarget(port) : false;

                          return (
                            <div
                              key={portKey}
                              className={cn(
                                "relative flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors",
                                validDrop
                                  ? "border-teal-500 bg-teal-50/80"
                                  : "border-slate-200 bg-slate-50/80",
                              )}
                            >
                              <button
                                type="button"
                                aria-label={`${portKey} input`}
                                className={cn(
                                  "absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-4 border-white shadow-sm transition",
                                  validDrop
                                    ? "bg-teal-500 ring-4 ring-teal-500/15"
                                    : "bg-slate-400",
                                )}
                                onPointerUp={(event) => {
                                  event.stopPropagation();

                                  if (port && connectionDrag) {
                                    connectPorts(connectionDrag.fromPortId, port.id);
                                  }
                                }}
                                onPointerEnter={() => {
                                  if (port && connectionDrag) {
                                    setHoveredInputPortId(port.id);
                                  }
                                }}
                                onPointerLeave={() => {
                                  if (hoveredInputPortId === portId) {
                                    setHoveredInputPortId(null);
                                  }
                                }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setConnectedCanvasSelection({
                                    nodeId: node.id,
                                    edgeId: null,
                                    portId,
                                  });
                                }}
                              />
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {translateCategory(language, portKey)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {incomingCount === 0
                                    ? translateUi(language, "No connected source yet")
                                    : language === "ko"
                                      ? `들어오는 연결 ${incomingCount}개`
                                      : `${incomingCount} incoming connection${incomingCount > 1 ? "s" : ""}`}
                                </p>
                              </div>
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                {translateCategory(language, portKey)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(["condition", "effect", "modifier"] as const).map((category) => (
                          <Button
                            key={category}
                            variant="outline"
                            className="rounded-full"
                            onClick={(event) => {
                              event.stopPropagation();
                              addRootGroup(node.ruleId, category);
                            }}
                            >
                              <Plus className="mr-1.5 h-3.5 w-3.5" />
                              {language === "ko"
                                ? `${translateCategory(language, category)} 그룹 추가`
                                : `Add ${category} group`}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                }

                const category = getConnectedCanvasCategory(node);

                if (isConnectedCanvasGroupNode(node)) {
                  const childCount = containerMap.get(node.id)?.length ?? 0;
                  const canDropHere = canDropNestedNode(node.id);

                  return (
                    <div
                      key={node.id}
                      tabIndex={0}
                      className={cn(
                        "absolute rounded-[1.5rem] border border-dashed bg-white/92 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]",
                        selected
                          ? "border-teal-600 ring-2 ring-teal-500/15"
                          : "border-slate-300",
                      )}
                      style={{
                        left: layout.x,
                        top: layout.y,
                        width: layout.width,
                        minHeight: layout.height,
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setConnectedCanvasSelection({
                          nodeId: node.id,
                          edgeId: null,
                          portId: null,
                        });
                      }}
                      onFocus={() =>
                        setConnectedCanvasSelection({
                          nodeId: node.id,
                          edgeId: null,
                          portId: null,
                        })
                      }
                      onDragOver={(event) => {
                        if (!canDropHere) {
                          return;
                        }

                        event.preventDefault();
                        setHoveredContainerId(node.id);
                      }}
                      onDragLeave={() => {
                        if (hoveredContainerId === node.id) {
                          setHoveredContainerId(null);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        handleDropIntoContainer(node.id);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {translateUi(language, "Group Container")}
                          </p>
                          <h3 className="mt-1 text-sm font-semibold">{node.label}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {language === "ko"
                              ? `하위 항목 ${childCount}개`
                              : `${childCount} children`}
                          </p>
                          <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                            {language === "ko"
                              ? `${translateCategory(language, node.category)} 하위 항목만 허용`
                              : `Accepts ${node.category} children only`}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[11px] font-medium text-white",
                              category ? categoryAccent[category] : "bg-slate-500",
                            )}
                          >
                            {translateCategory(language, node.category)}
                          </span>
                          <Button
                            variant="outline"
                            className="rounded-full"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleGroup(node.id);
                            }}
                          >
                            {node.collapsed ? (
                              <ChevronRight className="mr-1.5 h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {node.collapsed
                              ? translateUi(language, "Expand")
                              : translateUi(language, "Collapse")}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="rounded-full"
                          onClick={(event) => {
                            event.stopPropagation();
                            addNestedGroup(node.ruleId, node.id, node.category);
                          }}
                        >
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          {translateUi(language, "Add Nested Group")}
                        </Button>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-muted-foreground">
                          {canDropHere && hoveredContainerId === node.id
                            ? translateUi(language, "Release to nest here")
                            : node.collapsed
                              ? translateUi(language, "Collapsed summary")
                              : translateUi(language, "Nested drop zone ready")}
                        </span>
                      </div>
                      {node.collapsed ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(containerMap.get(node.id) ?? []).slice(0, 6).map((childNodeId) => (
                            <span
                              key={childNodeId}
                              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
                            >
                              {getNodeDisplayLabel(
                                nodeMap.get(childNodeId) ?? null,
                                language,
                              )}
                            </span>
                          ))}
                          {childCount === 0 ? (
                            <span className="rounded-full border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                              {translateUi(language, "Empty container")}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "mt-4 rounded-[1.25rem] border border-dashed p-3",
                            canDropHere && hoveredContainerId === node.id
                              ? "border-teal-500 bg-teal-50/80"
                              : "border-slate-300 bg-slate-50/70",
                          )}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              {translateUi(language, "Nested Children")}
                            </p>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                              {childCount} items
                            </span>
                          </div>
                          <div className="space-y-2">{renderContainerChildren(node.id)}</div>
                        </div>
                      )}

                      <button
                        type="button"
                        aria-label={`${node.label} output`}
                        className={cn(
                          "absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-4 border-white shadow-sm",
                          category ? categoryAccent[category] : "bg-slate-400",
                        )}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          beginConnectionDrag(
                            `${node.id}:output:output`,
                            getLocalPoint(event.clientX, event.clientY),
                          );
                          setConnectedCanvasSelection({
                            nodeId: node.id,
                            edgeId: null,
                            portId: `${node.id}:output:output`,
                          });
                        }}
                      />
                    </div>
                  );
                }

                const definition = getComposerBlockDefinition(
                  node.block.type,
                  node.block.category,
                );

                return (
                  <div
                    key={node.id}
                    draggable={node.block.category !== "target"}
                    tabIndex={0}
                    className={cn(
                      "absolute rounded-[1.35rem] border bg-white/96 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.07)]",
                      selected
                        ? "border-teal-600 ring-2 ring-teal-500/15"
                          : "border-slate-200",
                    )}
                    style={{
                      left: layout.x,
                      top: layout.y,
                      width: layout.width,
                      minHeight: layout.height,
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setConnectedCanvasSelection({
                        nodeId: node.id,
                        edgeId: null,
                        portId: null,
                      });
                    }}
                    onFocus={() =>
                      setConnectedCanvasSelection({
                        nodeId: node.id,
                        edgeId: null,
                        portId: null,
                      })
                    }
                    onDragStart={() => {
                      if (node.block.category !== "target") {
                        startNestedDrag(node.id);
                      }
                    }}
                    onDragEnd={endNestedDrag}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {node.block.category}
                        </p>
                        <h3 className="text-sm font-semibold leading-tight">
                          {definition?.label ?? node.block.type}
                        </h3>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium text-white",
                          category ? categoryAccent[category] : "bg-slate-500",
                        )}
                      >
                        {translateCategory(language, node.block.category)}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      {summarizeComposerBlock(language, node.block)}
                    </p>

                    <button
                      type="button"
                      aria-label={`${node.block.type} output`}
                      className={cn(
                        "absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-4 border-white shadow-sm",
                        category ? categoryAccent[category] : "bg-slate-400",
                      )}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        beginConnectionDrag(
                          `${node.id}:output:output`,
                          getLocalPoint(event.clientX, event.clientY),
                        );
                        setConnectedCanvasSelection({
                          nodeId: node.id,
                          edgeId: null,
                          portId: `${node.id}:output:output`,
                        });
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.6rem] border border-border/70 bg-stone-50/90 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {translateUi(language, "Inspector")}
            </p>

            {selectedEdge ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-[1.25rem] border border-slate-200 bg-white/90 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {language === "ko" ? "선택된 엣지" : "Selected Edge"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedEdge.id}
                      </p>
                    </div>
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <p>
                      {language === "ko" ? "출발" : "From"}{" "}
                      <span className="font-medium">
                        {selectedEdgeNodes?.from
                          ? isConnectedCanvasRuleFrameNode(selectedEdgeNodes.from)
                            ? selectedEdgeNodes.from.name
                            : isConnectedCanvasGroupNode(selectedEdgeNodes.from)
                              ? selectedEdgeNodes.from.label
                              : selectedEdgeNodes.from.block.id
                          : translateUi(language, "Unknown")}
                      </span>
                    </p>
                    <p>
                      {language === "ko" ? "도착" : "To"}{" "}
                      <span className="font-medium">
                        {selectedEdgeNodes?.to
                          ? isConnectedCanvasRuleFrameNode(selectedEdgeNodes.to)
                            ? selectedEdgeNodes.to.name
                            : isConnectedCanvasGroupNode(selectedEdgeNodes.to)
                              ? selectedEdgeNodes.to.label
                              : selectedEdgeNodes.to.block.id
                          : translateUi(language, "Unknown")}
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                  onClick={() => unlinkEdge(selectedEdge.id)}
                >
                  <Unplug className="mr-2 h-4 w-4" />
                  {language === "ko" ? "엣지 연결 해제" : "Unlink Edge"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const sourcePort = portMap.get(selectedEdge.fromPortId);
                    const sourceNode = sourcePort
                      ? nodeMap.get(sourcePort.nodeId) ?? null
                      : null;
                    const sourceLayout = sourceNode
                      ? layoutMap.get(sourceNode.id) ?? null
                      : null;

                    if (!sourcePort || !sourceNode || !sourceLayout) {
                      return;
                    }

                    beginConnectionDrag(
                      sourcePort.id,
                      getPortPosition(sourceNode, sourceLayout, sourcePort),
                      selectedEdge.id,
                    );
                    setConnectedCanvasSelection({
                      nodeId: sourceNode.id,
                      edgeId: selectedEdge.id,
                      portId: sourcePort.id,
                    });
                  }}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  {language === "ko" ? "엣지 다시 연결" : "Reconnect Edge"}
                </Button>
              </div>
            ) : selectedNode ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-[1.25rem] border border-slate-200 bg-white/90 p-4">
                  <p className="text-sm font-semibold">
                    {getNodeDisplayLabel(selectedNode, language)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedNode.kind}
                  </p>
                  <div className="mt-4 space-y-2 text-sm">
                    <p>
                      {translateUi(language, "Rule")} {selectedNode.ruleId}
                    </p>
                    {isConnectedCanvasGroupNode(selectedNode) ? (
                      <>
                        <p>
                          {language === "ko" ? "하위 항목 수" : "Child count"}{" "}
                          {containerMap.get(selectedNode.id)?.length ?? 0}
                        </p>
                        <p>
                          {language === "ko"
                            ? "허용 하위 카테고리"
                            : "Allowed child category"}{" "}
                          {translateCategory(language, selectedNode.category)}
                        </p>
                        {(containerMap.get(selectedNode.id)?.length ?? 0) > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {(containerMap.get(selectedNode.id) ?? []).map((childNodeId) => (
                              <span
                                key={childNodeId}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                              >
                                {getNodeDisplayLabel(
                                  nodeMap.get(childNodeId) ?? null,
                                  language,
                                )}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    {isConnectedCanvasBlockNode(selectedNode) ? (
                      <p>{summarizeComposerBlock(language, selectedNode.block)}</p>
                    ) : null}
                  </div>
                </div>
                {isConnectedCanvasGroupNode(selectedNode) ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      onClick={() => toggleGroup(selectedNode.id)}
                    >
                      {selectedNode.collapsed ? (
                        <ChevronRight className="mr-2 h-4 w-4" />
                      ) : (
                        <ChevronDown className="mr-2 h-4 w-4" />
                      )}
                      {selectedNode.collapsed
                        ? (language === "ko" ? "그룹 펼치기" : "Expand Group")
                        : (language === "ko" ? "그룹 접기" : "Collapse Group")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        addNestedGroup(
                          selectedNode.ruleId,
                          selectedNode.id,
                          selectedNode.category,
                        )
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {translateUi(language, "Add Nested Group")}
                    </Button>
                  </div>
                ) : null}
                {isConnectedCanvasRuleFrameNode(selectedNode) ? (
                  <div className="grid gap-2">
                    {(["condition", "effect", "modifier"] as const).map((category) => (
                      <Button
                        key={category}
                        variant="outline"
                        onClick={() => addRootGroup(selectedNode.ruleId, category)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {language === "ko"
                          ? `${translateCategory(language, category)} 그룹 추가`
                          : `Add ${category} group`}
                      </Button>
                    ))}
                  </div>
                ) : null}
                <Button
                  variant="outline"
                  className="w-full border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                  onClick={() => deleteSelectedNode()}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {getDeleteActionLabel(selectedNode, language)}
                </Button>
                <p className="text-xs leading-5 text-muted-foreground">
                  {getDeleteActionHelpText(selectedNode, language)}
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  {language === "ko"
                    ? "루트 연결은 계속 유지되지만, 중첩 그룹은 이제 캔버스와 인스펙터 안에서 자신의 하위 목록을 직접 편집합니다."
                    : "Root wiring stays available, but nested groups now edit their own child list directly in the canvas and inspector."}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {language === "ko"
                  ? "노드나 엣지를 선택하면 여기서 자세히 볼 수 있습니다. 연결하려면 색이 있는 출력 포트에서 맞는 프레임 입력 점으로 드래그하세요."
                  : "Select a node or edge to inspect it. To connect, drag from a colored output port into one of the matching frame input dots."}
              </p>
            )}
          </div>

          <div className="rounded-[1.6rem] border border-border/70 bg-stone-50/90 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {translateUi(language, "Minimap")}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {language === "ko"
                    ? "뷰포트 박스를 클릭하거나 드래그해 큰 연결 그래프를 빠르게 이동하세요."
                    : "Click or drag the viewport box to jump around large connected graphs faster."}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-muted-foreground">
                {Math.round(viewportRect.left)},{Math.round(viewportRect.top)}
              </span>
            </div>

            <div
              ref={minimapRef}
              className="relative mt-4 rounded-[1.25rem] border border-slate-200 bg-white/90"
              style={{
                width: CONNECTED_MINIMAP_WIDTH,
                height: CONNECTED_MINIMAP_HEIGHT,
              }}
              onPointerDown={(event) => {
                setMinimapDragging(true);
                updateViewportFromMinimapClient(event.clientX, event.clientY);
              }}
            >
              <div
                className="absolute rounded-[0.85rem]"
                style={{
                  left: (CONNECTED_MINIMAP_WIDTH - minimapContentWidth) / 2,
                  top: (CONNECTED_MINIMAP_HEIGHT - minimapContentHeight) / 2,
                  width: minimapContentWidth,
                  height: minimapContentHeight,
                }}
              >
                {connectedCanvasDraft.layouts.map((layout) => {
                  const node = nodeMap.get(layout.nodeId);

                  if (!node) {
                    return null;
                  }

                  const colors = getMinimapNodeColors(node);

                  return (
                    <div
                      key={`connected-minimap:${layout.nodeId}`}
                      className="absolute rounded-[0.35rem] border"
                      style={{
                        left: layout.x * minimapScale,
                        top: layout.y * minimapScale,
                        width: Math.max(8, layout.width * minimapScale),
                        height: Math.max(8, layout.height * minimapScale),
                        borderColor: colors.border,
                        background: colors.background,
                      }}
                    />
                  );
                })}
                <div
                  className="absolute rounded-[0.5rem] border-2 border-emerald-500/90 bg-emerald-300/10 shadow-[0_0_0_1px_rgba(255,255,255,0.55)]"
                  style={{
                    left: viewportRect.left * minimapScale,
                    top: viewportRect.top * minimapScale,
                    width: Math.max(16, viewportRect.width * minimapScale),
                    height: Math.max(16, viewportRect.height * minimapScale),
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-border/70 bg-stone-50/90 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {language === "ko" ? "저장" : "Persistence"}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {language === "ko"
                    ? "자동 저장이 이 브라우저의 최신 연결 초안을 유지하고, 수동 스냅샷을 위한 JSON 가져오기/내보내기도 계속 사용할 수 있습니다."
                    : "Autosave keeps the latest connected draft in this browser, and JSON import or export stays available for manual snapshots."}
                </p>
              </div>
              <Save className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => persistDraftToBrowser(true)}>
                <Save className="mr-2 h-4 w-4" />
                {language === "ko" ? "브라우저 초안 저장" : "Save Browser Draft"}
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => loadSavedDraftFromBrowser()}
                disabled={!savedDraftExists}
              >
                <Upload className="mr-2 h-4 w-4" />
                {language === "ko" ? "저장본 불러오기" : "Load Saved"}
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => clearSavedDraftFromBrowser()}
                disabled={!savedDraftExists}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {language === "ko" ? "저장본 지우기" : "Clear Saved"}
              </Button>
            </div>

            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {savedDraftExists
                ? formatSavedDraftAt(savedDraftAt, language, localeTag)
                : translateUi(language, "No browser draft saved yet.")}
            </p>

            {importStatus ? (
              <div
                className={cn(
                  "mt-4 rounded-[1.15rem] border px-4 py-3 text-sm leading-6",
                  importStatus.tone === "error"
                    ? "border-rose-200 bg-rose-50/90 text-rose-800"
                    : importStatus.tone === "success"
                      ? "border-emerald-200 bg-emerald-50/90 text-emerald-800"
                      : "border-slate-200 bg-white/85 text-foreground/80",
                )}
              >
                {importStatus.message}
              </div>
            ) : null}

            <label className="mt-4 block">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Import JSON
              </span>
              <textarea
                value={importJsonDraft}
                onChange={(event) => setImportJsonDraft(event.currentTarget.value)}
                placeholder="Paste connected canvas JSON here."
                className="mt-2 min-h-[160px] w-full rounded-[1.25rem] border border-input bg-white/90 px-4 py-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => loadDocumentFromJson(importJsonDraft, "pasted JSON")}
                disabled={importJsonDraft.trim().length === 0}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import JSON
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => importFileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import File
              </Button>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Use JSON import when you want to restore a connected graph from a
              previous export or external snapshot without going through presets.
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-border/70 bg-stone-50/90 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Validation
            </p>
            <div className="mt-4 space-y-3">
              {connectedCanvasValidationIssues.length === 0 ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  No connected-canvas issues right now.
                </p>
              ) : (
                connectedCanvasValidationIssues.slice(0, 6).map((issue, index) => (
                  <div
                    key={`${issue.code}-${issue.nodeId ?? issue.edgeId ?? index}`}
                    className={cn(
                      "rounded-[1.2rem] border px-4 py-3",
                      issue.severity === "error"
                        ? "border-rose-200 bg-rose-50/90"
                        : "border-amber-200 bg-amber-50/90",
                    )}
                  >
                    <p
                      className={cn(
                        "text-[11px] uppercase tracking-[0.18em]",
                        issue.severity === "error"
                          ? "text-rose-700"
                          : "text-amber-700",
                      )}
                    >
                      {issue.severity} · {issue.code}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground/85">
                      {issue.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
      <input
        ref={importFileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          void handleImportFile(event.currentTarget.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
      />
    </section>
  );
}
