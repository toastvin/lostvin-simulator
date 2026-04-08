import {
  createDefaultConnectedCanvasLayout,
  createConnectedCanvasPortsForNode,
  createEmptyContainerChildOrder,
  isConnectedCanvasGroupNode,
} from "@/lib/connected-canvas/defaults";
import type {
  ConnectedCanvasContainerChildOrder,
  ConnectedCanvasDocument,
  ConnectedCanvasIssue,
  ConnectedCanvasNode,
  ConnectedCanvasNodeLayout,
  ConnectedCanvasPort,
  NormalizeConnectedCanvasDocumentResult,
} from "@/types/connected-canvas";

function pushIssue(issues: ConnectedCanvasIssue[], issue: ConnectedCanvasIssue) {
  issues.push(issue);
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

export function normalizeConnectedCanvasDocument(
  input: ConnectedCanvasDocument,
): NormalizeConnectedCanvasDocumentResult {
  const document = structuredClone(input);
  const issues: ConnectedCanvasIssue[] = [];

  const seenNodeIds = new Set<string>();
  const nodes: ConnectedCanvasNode[] = [];

  document.nodes.forEach((node) => {
    if (seenNodeIds.has(node.id)) {
      pushIssue(issues, {
        severity: "error",
        code: "duplicate_node_id",
        nodeId: node.id,
        ruleId: "ruleId" in node ? node.ruleId : undefined,
        message: `Connected canvas node "${node.id}" is duplicated.`,
      });
      return;
    }

    seenNodeIds.add(node.id);
    nodes.push(node);
  });

  document.nodes = nodes;

  const nodeMap = new Map(document.nodes.map((node) => [node.id, node]));
  const ports: ConnectedCanvasPort[] = [];
  const seenPortIds = new Set<string>();

  document.nodes.forEach((node) => {
    createConnectedCanvasPortsForNode(node).forEach((port) => {
      if (seenPortIds.has(port.id)) {
        pushIssue(issues, {
          severity: "error",
          code: "duplicate_port_id",
          portId: port.id,
          nodeId: port.nodeId,
          ruleId: "ruleId" in node ? node.ruleId : undefined,
          message: `Connected canvas port "${port.id}" is duplicated.`,
        });
        return;
      }

      seenPortIds.add(port.id);
      ports.push(port);
    });
  });

  document.ports = ports;

  const portMap = new Map(document.ports.map((port) => [port.id, port]));
  const seenLayoutNodeIds = new Set<string>();
  const layouts: ConnectedCanvasNodeLayout[] = [];

  document.layouts.forEach((layout) => {
    if (!nodeMap.has(layout.nodeId)) {
      pushIssue(issues, {
        severity: "warning",
        code: "missing_node",
        nodeId: layout.nodeId,
        message: `Layout for missing node "${layout.nodeId}" was dropped.`,
      });
      return;
    }

    if (seenLayoutNodeIds.has(layout.nodeId)) {
      pushIssue(issues, {
        severity: "warning",
        code: "duplicate_layout",
        nodeId: layout.nodeId,
        message: `Layout for "${layout.nodeId}" was duplicated and has been rebuilt.`,
      });
      return;
    }

    seenLayoutNodeIds.add(layout.nodeId);
    layouts.push(layout);
  });

  document.nodes.forEach((node, index) => {
    if (seenLayoutNodeIds.has(node.id)) {
      return;
    }

    layouts.push(createDefaultConnectedCanvasLayout(node, index));
    pushIssue(issues, {
      severity: "warning",
      code: "missing_layout",
      nodeId: node.id,
      ruleId: "ruleId" in node ? node.ruleId : undefined,
      message: `Layout for node "${node.id}" was missing and has been recreated.`,
    });
  });

  document.layouts = layouts;

  const containerNodeIds = new Set(
    document.nodes.filter(isConnectedCanvasGroupNode).map((node) => node.id),
  );
  const seenContainerNodeIds = new Set<string>();
  const containers: ConnectedCanvasContainerChildOrder[] = [];

  document.containers.forEach((container) => {
    if (!containerNodeIds.has(container.containerNodeId)) {
      pushIssue(issues, {
        severity: "warning",
        code: "missing_node",
        containerNodeId: container.containerNodeId,
        message: `Container "${container.containerNodeId}" pointed at a missing node and was dropped.`,
      });
      return;
    }

    if (seenContainerNodeIds.has(container.containerNodeId)) {
      pushIssue(issues, {
        severity: "warning",
        code: "duplicate_container",
        containerNodeId: container.containerNodeId,
        message: `Container "${container.containerNodeId}" was duplicated and only the first entry was kept.`,
      });
      return;
    }

    seenContainerNodeIds.add(container.containerNodeId);

    const nextChildNodeIds = unique(
      container.childNodeIds.filter((childNodeId) => nodeMap.has(childNodeId)),
    );

    if (nextChildNodeIds.length !== container.childNodeIds.length) {
      pushIssue(issues, {
        severity: "warning",
        code: "container_order_rebuilt",
        containerNodeId: container.containerNodeId,
        message: `Container "${container.containerNodeId}" had invalid or duplicated children and was rebuilt.`,
      });
    }

    containers.push({
      containerNodeId: container.containerNodeId,
      childNodeIds: nextChildNodeIds,
    });
  });

  document.nodes.filter(isConnectedCanvasGroupNode).forEach((node) => {
    if (seenContainerNodeIds.has(node.id)) {
      return;
    }

    containers.push(createEmptyContainerChildOrder(node.id));
    pushIssue(issues, {
      severity: "warning",
      code: "missing_container",
      containerNodeId: node.id,
      ruleId: node.ruleId,
      message: `Container children for "${node.id}" were missing and have been recreated.`,
    });
  });

  document.containers = containers;

  const seenEdgeIds = new Set<string>();
  const edges = document.edges.filter((edge) => {
    if (seenEdgeIds.has(edge.id)) {
      pushIssue(issues, {
        severity: "warning",
        code: "duplicate_edge_id",
        edgeId: edge.id,
        message: `Edge "${edge.id}" was duplicated and has been dropped.`,
      });
      return false;
    }

    seenEdgeIds.add(edge.id);

    if (!portMap.has(edge.fromPortId) || !portMap.has(edge.toPortId)) {
      pushIssue(issues, {
        severity: "warning",
        code: "orphan_edge",
        edgeId: edge.id,
        portId: !portMap.has(edge.fromPortId) ? edge.fromPortId : edge.toPortId,
        message: `Edge "${edge.id}" referenced a missing port and was dropped.`,
      });
      return false;
    }

    return true;
  });

  document.edges = edges;

  return {
    document,
    issues,
  };
}
