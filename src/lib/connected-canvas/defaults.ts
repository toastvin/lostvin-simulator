import { createDefaultCanvasViewport } from "@/lib/composer-canvas/defaults";
import type { ComposerBlock } from "@/types/composer";
import type {
  ConnectedCanvasBlockNode,
  ConnectedCanvasConnectionType,
  ConnectedCanvasContainerChildOrder,
  ConnectedCanvasDocument,
  ConnectedCanvasGroupNode,
  ConnectedCanvasNode,
  ConnectedCanvasNodeLayout,
  ConnectedCanvasPort,
  ConnectedCanvasRuleFrameNode,
  ConnectedCanvasRuleFrameSeed,
} from "@/types/connected-canvas";

export const connectedCanvasConnectionTypes = [
  "target",
  "condition",
  "effect",
  "modifier",
] as const satisfies ConnectedCanvasConnectionType[];

const DEFAULT_FRAME_WIDTH = 360;
const DEFAULT_FRAME_HEIGHT = 240;
const DEFAULT_GROUP_WIDTH = 312;
const DEFAULT_GROUP_HEIGHT = 120;
const DEFAULT_BLOCK_WIDTH = 260;
const DEFAULT_BLOCK_HEIGHT = 72;

export function isConnectedCanvasRuleFrameNode(
  node: ConnectedCanvasNode,
): node is ConnectedCanvasRuleFrameNode {
  return node.kind === "rule-frame";
}

export function isConnectedCanvasGroupNode(
  node: ConnectedCanvasNode,
): node is ConnectedCanvasGroupNode {
  return (
    node.kind === "condition-group" ||
    node.kind === "effect-group" ||
    node.kind === "modifier-group"
  );
}

export function isConnectedCanvasBlockNode(
  node: ConnectedCanvasNode,
): node is ConnectedCanvasBlockNode {
  return (
    node.kind === "target-block" ||
    node.kind === "condition-block" ||
    node.kind === "effect-block" ||
    node.kind === "modifier-block"
  );
}

export function getConnectedCanvasCategory(
  node: ConnectedCanvasNode,
): ConnectedCanvasConnectionType | null {
  if (isConnectedCanvasRuleFrameNode(node)) {
    return null;
  }

  return node.category;
}

export function createConnectedCanvasFrameNode(
  seed: ConnectedCanvasRuleFrameSeed,
  frameNodeId: string,
): ConnectedCanvasRuleFrameNode {
  return {
    id: frameNodeId,
    kind: "rule-frame",
    ruleId: seed.id,
    name: seed.name,
    enabled: seed.enabled,
    cadence: seed.cadence,
  };
}

export function createConnectedCanvasBlockNode(
  ruleId: string,
  block: ComposerBlock,
  nodeId: string,
): ConnectedCanvasBlockNode {
  return {
    id: nodeId,
    kind: `${block.category}-block`,
    ruleId,
    category: block.category,
    block: structuredClone(block),
  } as ConnectedCanvasBlockNode;
}

export function createConnectedCanvasGroupNode(
  ruleId: string,
  category: Exclude<ConnectedCanvasConnectionType, "target">,
  nodeId: string,
): ConnectedCanvasGroupNode {
  return {
    id: nodeId,
    kind: `${category}-group`,
    ruleId,
    category,
    label: `${category[0].toUpperCase()}${category.slice(1)} Group`,
    collapsed: false,
  };
}

export function createConnectedCanvasPortId(
  nodeId: string,
  direction: "input" | "output",
  key: string,
) {
  return `${nodeId}:${direction}:${key}`;
}

export function createConnectedCanvasPortsForNode(
  node: ConnectedCanvasNode,
): ConnectedCanvasPort[] {
  if (isConnectedCanvasRuleFrameNode(node)) {
    return connectedCanvasConnectionTypes.map((category) => ({
      id: createConnectedCanvasPortId(node.id, "input", category),
      nodeId: node.id,
      key: category,
      direction: "input" as const,
      accepts: [category],
      provides: [],
      maxConnections: category === "target" ? 1 : "many",
    }));
  }

  return [
    {
      id: createConnectedCanvasPortId(node.id, "output", "output"),
      nodeId: node.id,
      key: "output",
      direction: "output",
      accepts: [],
      provides: [node.category],
      maxConnections: "many",
    },
  ];
}

export function createEmptyConnectedCanvasDocument(): ConnectedCanvasDocument {
  return {
    version: 1,
    viewport: createDefaultCanvasViewport(),
    nodes: [],
    ports: [],
    edges: [],
    layouts: [],
    containers: [],
  };
}

export function createDefaultConnectedCanvasLayout(
  node: ConnectedCanvasNode,
  index = 0,
): ConnectedCanvasNodeLayout {
  const column = index % 3;
  const row = Math.floor(index / 3);

  if (isConnectedCanvasRuleFrameNode(node)) {
    return {
      nodeId: node.id,
      x: 40 + column * 420,
      y: 40 + row * 320,
      width: DEFAULT_FRAME_WIDTH,
      height: DEFAULT_FRAME_HEIGHT,
      zIndex: index + 1,
    };
  }

  if (isConnectedCanvasGroupNode(node)) {
    return {
      nodeId: node.id,
      x: 72 + column * 420,
      y: 110 + row * 320,
      width: DEFAULT_GROUP_WIDTH,
      height: DEFAULT_GROUP_HEIGHT,
      zIndex: index + 1,
    };
  }

  return {
    nodeId: node.id,
    x: 88 + column * 420,
    y: 160 + row * 320,
    width: DEFAULT_BLOCK_WIDTH,
    height: DEFAULT_BLOCK_HEIGHT,
    zIndex: index + 1,
  };
}

export function createEmptyContainerChildOrder(
  containerNodeId: string,
): ConnectedCanvasContainerChildOrder {
  return {
    containerNodeId,
    childNodeIds: [],
  };
}
