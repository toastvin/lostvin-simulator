import {
  createConnectedCanvasGroupNode,
  createConnectedCanvasPortId,
  isConnectedCanvasGroupNode,
  isConnectedCanvasRuleFrameNode,
} from "@/lib/connected-canvas/defaults";
import type {
  ConnectedCanvasConnectionType,
  ConnectedCanvasDocument,
  ConnectedCanvasEdge,
  ConnectedCanvasGroupNode,
  ConnectedCanvasNode,
  ConnectedCanvasNodeLayout,
} from "@/types/connected-canvas";

function countItemsWithPrefix(ids: string[], prefix: string) {
  return ids.filter((id) => id.startsWith(prefix)).length;
}

function createGroupNodeId(
  document: ConnectedCanvasDocument,
  ruleId: string,
  category: Exclude<ConnectedCanvasConnectionType, "target">,
) {
  const prefix = `group-node:${ruleId}:${category}:`;
  let nextIndex = countItemsWithPrefix(
    document.nodes.map((node) => node.id),
    prefix,
  ) + 1;
  let candidate = `${prefix}${nextIndex}`;

  while (document.nodes.some((node) => node.id === candidate)) {
    nextIndex += 1;
    candidate = `${prefix}${nextIndex}`;
  }

  return candidate;
}

function getRuleFrameNode(document: ConnectedCanvasDocument, ruleId: string) {
  return (
    document.nodes.find(
      (node): node is Extract<ConnectedCanvasNode, { kind: "rule-frame" }> =>
        node.kind === "rule-frame" && node.ruleId === ruleId,
    ) ?? null
  );
}

function getNodeLayout(document: ConnectedCanvasDocument, nodeId: string) {
  return document.layouts.find((layout) => layout.nodeId === nodeId) ?? null;
}

function getOwnerContainerId(
  document: ConnectedCanvasDocument,
  nodeId: string,
) {
  return (
    document.containers.find((container) => container.childNodeIds.includes(nodeId))
      ?.containerNodeId ?? null
  );
}

function getContainerChildIds(
  document: ConnectedCanvasDocument,
  containerNodeId: string,
) {
  return (
    document.containers.find((container) => container.containerNodeId === containerNodeId)
      ?.childNodeIds ?? []
  );
}

function removeNodeFromContainers(
  document: ConnectedCanvasDocument,
  nodeId: string,
) {
  return {
    ...document,
    containers: document.containers.map((container) => ({
      ...container,
      childNodeIds: container.childNodeIds.filter((childNodeId) => childNodeId !== nodeId),
    })),
  };
}

function replaceNodeInContainers(
  document: ConnectedCanvasDocument,
  nodeId: string,
  replacementNodeIds: string[],
) {
  return {
    ...document,
    containers: document.containers.map((container) => {
      const currentIndex = container.childNodeIds.indexOf(nodeId);

      if (currentIndex === -1) {
        return container;
      }

      const nextChildNodeIds = [...container.childNodeIds];
      nextChildNodeIds.splice(currentIndex, 1, ...replacementNodeIds);

      return {
        ...container,
        childNodeIds: nextChildNodeIds,
      };
    }),
  };
}

function createEdgeId(
  document: ConnectedCanvasDocument,
  fromPortId: string,
  toPortId: string,
) {
  const prefix = `edge:${fromPortId}:to:${toPortId}:`;
  let nextIndex = countItemsWithPrefix(
    document.edges.map((edge) => edge.id),
    prefix,
  ) + 1;
  let candidate = `${prefix}${nextIndex}`;

  while (document.edges.some((edge) => edge.id === candidate)) {
    nextIndex += 1;
    candidate = `${prefix}${nextIndex}`;
  }

  return candidate;
}

function removeEdgesForNode(
  document: ConnectedCanvasDocument,
  nodeId: string,
) {
  return {
    ...document,
    edges: document.edges.filter(
      (edge) =>
        !edge.fromPortId.startsWith(`${nodeId}:`) &&
        !edge.toPortId.startsWith(`${nodeId}:`),
    ),
  };
}

function removeNodeArtifacts(
  document: ConnectedCanvasDocument,
  nodeId: string,
) {
  const nextDocument = removeNodeFromContainers(
    removeEdgesForNode(document, nodeId),
    nodeId,
  );

  return {
    ...nextDocument,
    nodes: nextDocument.nodes.filter((node) => node.id !== nodeId),
    ports: nextDocument.ports.filter((port) => port.nodeId !== nodeId),
    layouts: nextDocument.layouts.filter((layout) => layout.nodeId !== nodeId),
    containers: nextDocument.containers.filter(
      (container) => container.containerNodeId !== nodeId,
    ),
  };
}

function isDescendantContainer(
  document: ConnectedCanvasDocument,
  ancestorNodeId: string,
  candidateContainerId: string,
): boolean {
  const container = document.containers.find(
    (entry) => entry.containerNodeId === ancestorNodeId,
  );

  if (!container) {
    return false;
  }

  if (container.childNodeIds.includes(candidateContainerId)) {
    return true;
  }

  return container.childNodeIds.some((childNodeId) =>
    isDescendantContainer(document, childNodeId, candidateContainerId),
  );
}

export function canNestNodeInContainer(
  document: ConnectedCanvasDocument,
  nodeId: string,
  containerNodeId: string,
) {
  const node = document.nodes.find((candidate) => candidate.id === nodeId) ?? null;
  const containerNode =
    document.nodes.find((candidate) => candidate.id === containerNodeId) ?? null;

  if (!node || !containerNode || !isConnectedCanvasGroupNode(containerNode)) {
    return false;
  }

  if (node.id === containerNode.id || isConnectedCanvasRuleFrameNode(node)) {
    return false;
  }

  if (node.ruleId !== containerNode.ruleId) {
    return false;
  }

  if ("category" in node && node.category !== containerNode.category) {
    return false;
  }

  if (isConnectedCanvasGroupNode(node)) {
    return !isDescendantContainer(document, node.id, containerNode.id);
  }

  return true;
}

export function moveNodeIntoContainer(
  document: ConnectedCanvasDocument,
  nodeId: string,
  containerNodeId: string,
  index?: number,
) {
  if (!canNestNodeInContainer(document, nodeId, containerNodeId)) {
    return document;
  }

  const withoutNode = removeNodeFromContainers(document, nodeId);

  return {
    ...withoutNode,
    containers: withoutNode.containers.map((container) => {
      if (container.containerNodeId !== containerNodeId) {
        return container;
      }

      const nextChildNodeIds = [...container.childNodeIds];
      const insertionIndex =
        index === undefined
          ? nextChildNodeIds.length
          : Math.max(0, Math.min(index, nextChildNodeIds.length));

      nextChildNodeIds.splice(insertionIndex, 0, nodeId);

      return {
        ...container,
        childNodeIds: nextChildNodeIds,
      };
    }),
  };
}

export function moveContainerChild(
  document: ConnectedCanvasDocument,
  containerNodeId: string,
  childNodeId: string,
  direction: "up" | "down",
) {
  return {
    ...document,
    containers: document.containers.map((container) => {
      if (container.containerNodeId !== containerNodeId) {
        return container;
      }

      const currentIndex = container.childNodeIds.indexOf(childNodeId);

      if (currentIndex === -1) {
        return container;
      }

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= container.childNodeIds.length) {
        return container;
      }

      const nextChildNodeIds = [...container.childNodeIds];
      const [movedNodeId] = nextChildNodeIds.splice(currentIndex, 1);
      nextChildNodeIds.splice(targetIndex, 0, movedNodeId);

      return {
        ...container,
        childNodeIds: nextChildNodeIds,
      };
    }),
  };
}

export function toggleGroupCollapsed(
  document: ConnectedCanvasDocument,
  groupNodeId: string,
) {
  return {
    ...document,
    nodes: document.nodes.map((node) =>
      node.id === groupNodeId && isConnectedCanvasGroupNode(node)
        ? ({
            ...node,
            collapsed: !node.collapsed,
          } satisfies ConnectedCanvasGroupNode)
        : node,
    ),
  };
}

export function createGroupContainer(
  document: ConnectedCanvasDocument,
  ruleId: string,
  category: Exclude<ConnectedCanvasConnectionType, "target">,
  parentContainerId?: string,
) {
  const frameNode = getRuleFrameNode(document, ruleId);

  if (!frameNode) {
    return document;
  }

  const nextGroupNodeId = createGroupNodeId(document, ruleId, category);
  const nextGroupNode = createConnectedCanvasGroupNode(
    ruleId,
    category,
    nextGroupNodeId,
  );
  const frameLayout = getNodeLayout(document, frameNode.id);
  const parentLayout = parentContainerId ? getNodeLayout(document, parentContainerId) : null;
  const siblingCount = document.nodes.filter(
    (node) =>
      isConnectedCanvasGroupNode(node) &&
      node.ruleId === ruleId &&
      node.category === category,
  ).length;
  const nextLayout: ConnectedCanvasNodeLayout = {
    nodeId: nextGroupNodeId,
    x:
      parentLayout?.x ??
      (frameLayout?.x ?? 40) + 28,
    y:
      parentLayout?.y
        ? parentLayout.y + 74 + getContainerChildIds(document, parentContainerId ?? "").length * 68
        : (frameLayout?.y ?? 40) + 108 + siblingCount * 86,
    width: Math.max(280, (parentLayout?.width ?? frameLayout?.width ?? 360) - 36),
    height: 120,
    zIndex:
      Math.max(0, ...document.layouts.map((layout) => layout.zIndex)) + 1,
  };

  const nextEdges = [...document.edges];

  if (!parentContainerId) {
    nextEdges.push({
      id: `edge:${nextGroupNodeId}:to:${frameNode.id}:${category}:${nextEdges.length + 1}`,
      fromPortId: createConnectedCanvasPortId(nextGroupNodeId, "output", "output"),
      toPortId: createConnectedCanvasPortId(frameNode.id, "input", category),
    } satisfies ConnectedCanvasEdge);
  }

  let nextDocument: ConnectedCanvasDocument = {
    ...document,
    nodes: [...document.nodes, nextGroupNode],
    edges: nextEdges,
    layouts: [...document.layouts, nextLayout],
    containers: [
      ...document.containers,
      {
        containerNodeId: nextGroupNodeId,
        childNodeIds: [],
      },
    ],
  };

  if (parentContainerId) {
    nextDocument = moveNodeIntoContainer(
      nextDocument,
      nextGroupNodeId,
      parentContainerId,
    );
  }

  return nextDocument;
}

export function deleteConnectedCanvasNode(
  document: ConnectedCanvasDocument,
  nodeId: string,
) {
  const node = document.nodes.find((candidate) => candidate.id === nodeId) ?? null;

  if (!node) {
    return document;
  }

  if (isConnectedCanvasRuleFrameNode(node)) {
    const ruleNodeIds = new Set(
      document.nodes
        .filter((candidate) => candidate.ruleId === node.ruleId)
        .map((candidate) => candidate.id),
    );

    return {
      ...document,
      nodes: document.nodes.filter((candidate) => !ruleNodeIds.has(candidate.id)),
      ports: document.ports.filter((port) => !ruleNodeIds.has(port.nodeId)),
      edges: document.edges.filter(
        (edge) =>
          ![...ruleNodeIds].some(
            (candidateId) =>
              edge.fromPortId.startsWith(`${candidateId}:`) ||
              edge.toPortId.startsWith(`${candidateId}:`),
          ),
      ),
      layouts: document.layouts.filter((layout) => !ruleNodeIds.has(layout.nodeId)),
      containers: document.containers
        .filter((container) => !ruleNodeIds.has(container.containerNodeId))
        .map((container) => ({
          ...container,
          childNodeIds: container.childNodeIds.filter(
            (childNodeId) => !ruleNodeIds.has(childNodeId),
          ),
        })),
    };
  }

  if (!isConnectedCanvasGroupNode(node)) {
    return removeNodeArtifacts(document, nodeId);
  }

  const ownerContainerId = getOwnerContainerId(document, node.id);
  const childNodeIds = getContainerChildIds(document, node.id);
  const frameNode = getRuleFrameNode(document, node.ruleId);

  if (ownerContainerId) {
    const replaced = replaceNodeInContainers(document, node.id, childNodeIds);

    return {
      ...removeEdgesForNode(replaced, node.id),
      nodes: replaced.nodes.filter((candidate) => candidate.id !== node.id),
      ports: replaced.ports.filter((port) => port.nodeId !== node.id),
      layouts: replaced.layouts.filter((layout) => layout.nodeId !== node.id),
      containers: replaced.containers
        .filter((container) => container.containerNodeId !== node.id)
        .map((container) => ({
          ...container,
          childNodeIds: container.childNodeIds.filter(
            (childNodeId) => childNodeId !== node.id,
          ),
        })),
    };
  }

  let nextDocument = {
    ...removeEdgesForNode(document, node.id),
    nodes: document.nodes.filter((candidate) => candidate.id !== node.id),
    ports: document.ports.filter((port) => port.nodeId !== node.id),
    layouts: document.layouts.filter((layout) => layout.nodeId !== node.id),
    containers: document.containers
      .filter((container) => container.containerNodeId !== node.id)
      .map((container) => ({
        ...container,
        childNodeIds: container.childNodeIds.filter(
          (childNodeId) => childNodeId !== node.id,
        ),
      })),
  };

  if (!frameNode) {
    return nextDocument;
  }

  const nextEdges = [...nextDocument.edges];

  childNodeIds.forEach((childNodeId) => {
    nextEdges.push({
      id: createEdgeId(
        {
          ...nextDocument,
          edges: nextEdges,
        },
        createConnectedCanvasPortId(childNodeId, "output", "output"),
        createConnectedCanvasPortId(frameNode.id, "input", node.category),
      ),
      fromPortId: createConnectedCanvasPortId(childNodeId, "output", "output"),
      toPortId: createConnectedCanvasPortId(frameNode.id, "input", node.category),
    });
  });

  return {
    ...nextDocument,
    edges: nextEdges,
  };
}
