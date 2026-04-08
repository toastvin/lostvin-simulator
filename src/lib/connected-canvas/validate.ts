import {
  getConnectedCanvasCategory,
  isConnectedCanvasGroupNode,
  isConnectedCanvasRuleFrameNode,
} from "@/lib/connected-canvas/defaults";
import { normalizeConnectedCanvasDocument } from "@/lib/connected-canvas/normalize";
import type {
  ConnectedCanvasDocument,
  ConnectedCanvasEdge,
  ConnectedCanvasIssue,
  ConnectedCanvasNode,
  ConnectedCanvasPort,
  ValidateConnectedCanvasDocumentResult,
} from "@/types/connected-canvas";

function pushIssue(issues: ConnectedCanvasIssue[], issue: ConnectedCanvasIssue) {
  issues.push(issue);
}

function getRuleIdForNode(node: ConnectedCanvasNode) {
  return node.ruleId;
}

function findIncomingEdges(
  edges: ConnectedCanvasEdge[],
  portId: string,
) {
  return edges.filter((edge) => edge.toPortId === portId);
}

function detectContainerCycles(
  document: ConnectedCanvasDocument,
  issues: ConnectedCanvasIssue[],
) {
  const containerMap = new Map(
    document.containers.map((container) => [container.containerNodeId, container]),
  );

  const visit = (
    containerNodeId: string,
    stack: string[],
    visited: Set<string>,
  ) => {
    if (stack.includes(containerNodeId)) {
      pushIssue(issues, {
        severity: "error",
        code: "cycle_detected",
        containerNodeId,
        message: `Container cycle detected: ${[...stack, containerNodeId].join(" -> ")}.`,
      });
      return;
    }

    if (visited.has(containerNodeId)) {
      return;
    }

    visited.add(containerNodeId);
    const container = containerMap.get(containerNodeId);

    if (!container) {
      return;
    }

    container.childNodeIds.forEach((childNodeId) => {
      if (containerMap.has(childNodeId)) {
        visit(childNodeId, [...stack, containerNodeId], visited);
      }
    });
  };

  const visited = new Set<string>();
  document.containers.forEach((container) =>
    visit(container.containerNodeId, [], visited),
  );
}

export function validateConnectedCanvasDocument(
  document: ConnectedCanvasDocument,
): ValidateConnectedCanvasDocumentResult {
  const normalized = normalizeConnectedCanvasDocument(document);
  const issues = [...normalized.issues];
  const nodeMap = new Map(
    normalized.document.nodes.map((node) => [node.id, node]),
  );
  const portMap = new Map(
    normalized.document.ports.map((port) => [port.id, port]),
  );
  const containerMap = new Map(
    normalized.document.containers.map((container) => [container.containerNodeId, container]),
  );
  const frameNodes = normalized.document.nodes.filter(isConnectedCanvasRuleFrameNode);
  const childOwnerMap = new Map<string, string[]>();

  normalized.document.edges.forEach((edge) => {
    const fromPort = portMap.get(edge.fromPortId);
    const toPort = portMap.get(edge.toPortId);

    if (!fromPort || !toPort) {
      return;
    }

    if (fromPort.direction !== "output" || toPort.direction !== "input") {
      pushIssue(issues, {
        severity: "error",
        code: "invalid_edge_direction",
        edgeId: edge.id,
        message: `Edge "${edge.id}" must connect output -> input.`,
      });
    }

    const hasCompatibleType = fromPort.provides.some((type) =>
      toPort.accepts.includes(type),
    );

    if (!hasCompatibleType) {
      pushIssue(issues, {
        severity: "error",
        code: "type_mismatch",
        edgeId: edge.id,
        message: `Edge "${edge.id}" connected incompatible port types.`,
      });
    }

    const fromNode = nodeMap.get(fromPort.nodeId);
    const toNode = nodeMap.get(toPort.nodeId);

    if (!fromNode || !toNode) {
      return;
    }

    if (getRuleIdForNode(fromNode) !== getRuleIdForNode(toNode)) {
      pushIssue(issues, {
        severity: "error",
        code: "cross_frame_connection",
        edgeId: edge.id,
        ruleId: getRuleIdForNode(toNode),
        message: `Edge "${edge.id}" crossed rule boundaries and is not allowed.`,
      });
    }
  });

  normalized.document.ports.forEach((port) => {
    if (port.direction !== "input" || port.maxConnections === "many") {
      return;
    }

    const incomingEdges = findIncomingEdges(normalized.document.edges, port.id);

    if (incomingEdges.length > port.maxConnections) {
      pushIssue(issues, {
        severity: "error",
        code: "too_many_connections",
        portId: port.id,
        nodeId: port.nodeId,
        message: `Port "${port.id}" allows at most ${port.maxConnections} connection.`,
      });
    }
  });

  normalized.document.containers.forEach((container) => {
    const containerNode = nodeMap.get(container.containerNodeId);

    if (!containerNode || !isConnectedCanvasGroupNode(containerNode)) {
      return;
    }

    container.childNodeIds.forEach((childNodeId) => {
      const childNode = nodeMap.get(childNodeId);

      if (!childNode) {
        pushIssue(issues, {
          severity: "error",
          code: "missing_node",
          containerNodeId: container.containerNodeId,
          nodeId: childNodeId,
          ruleId: containerNode.ruleId,
          message: `Container "${container.containerNodeId}" referenced missing child "${childNodeId}".`,
        });
        return;
      }

      if (childNode.kind === "rule-frame") {
        pushIssue(issues, {
          severity: "error",
          code: "invalid_container_child",
          containerNodeId: container.containerNodeId,
          nodeId: childNode.id,
          ruleId: containerNode.ruleId,
          message: `Rule frame "${childNode.id}" cannot be nested inside "${container.containerNodeId}".`,
        });
        return;
      }

      if (childNode.ruleId !== containerNode.ruleId) {
        pushIssue(issues, {
          severity: "error",
          code: "cross_frame_connection",
          containerNodeId: container.containerNodeId,
          nodeId: childNode.id,
          ruleId: containerNode.ruleId,
          message: `Container "${container.containerNodeId}" cannot own child "${childNode.id}" from another rule.`,
        });
      }

      if (getConnectedCanvasCategory(childNode) !== containerNode.category) {
        pushIssue(issues, {
          severity: "error",
          code: "invalid_container_child",
          containerNodeId: container.containerNodeId,
          nodeId: childNode.id,
          ruleId: containerNode.ruleId,
          message: `Child "${childNode.id}" does not match "${containerNode.category}" container type.`,
        });
      }

      childOwnerMap.set(childNode.id, [
        ...(childOwnerMap.get(childNode.id) ?? []),
        container.containerNodeId,
      ]);
    });
  });

  childOwnerMap.forEach((ownerIds, childNodeId) => {
    if (ownerIds.length > 1) {
      pushIssue(issues, {
        severity: "error",
        code: "duplicate_container_child",
        nodeId: childNodeId,
        message: `Node "${childNodeId}" belongs to multiple containers: ${ownerIds.join(", ")}.`,
      });
    }
  });

  detectContainerCycles(normalized.document, issues);

  frameNodes.forEach((frameNode) => {
    const targetPortId = `${frameNode.id}:input:target`;
    const effectPortId = `${frameNode.id}:input:effect`;
    const targetEdges = findIncomingEdges(normalized.document.edges, targetPortId);
    const effectEdges = findIncomingEdges(normalized.document.edges, effectPortId);

    if (targetEdges.length === 0) {
      pushIssue(issues, {
        severity: "error",
        code: "missing_target_connection",
        nodeId: frameNode.id,
        ruleId: frameNode.ruleId,
        message: `Rule "${frameNode.ruleId}" is missing a connected target root.`,
      });
    }

    if (effectEdges.length === 0) {
      pushIssue(issues, {
        severity: "error",
        code: "missing_effect_connection",
        nodeId: frameNode.id,
        ruleId: frameNode.ruleId,
        message: `Rule "${frameNode.ruleId}" is missing a connected effect root.`,
      });
    }

    if (targetEdges.length === 0 && effectEdges.length === 0) {
      pushIssue(issues, {
        severity: "warning",
        code: "disconnected_rule_frame",
        nodeId: frameNode.id,
        ruleId: frameNode.ruleId,
        message: `Rule frame "${frameNode.id}" has no connected roots yet.`,
      });
    }
  });

  const reachableNodeIds = new Set<string>(frameNodes.map((node) => node.id));

  const markReachable = (nodeId: string) => {
    if (reachableNodeIds.has(nodeId)) {
      return;
    }

    reachableNodeIds.add(nodeId);
    const container = containerMap.get(nodeId);

    if (!container) {
      return;
    }

    container.childNodeIds.forEach(markReachable);
  };

  frameNodes.forEach((frameNode) => {
    normalized.document.edges.forEach((edge) => {
      const toPort = portMap.get(edge.toPortId);
      const fromPort = portMap.get(edge.fromPortId);

      if (
        toPort?.nodeId === frameNode.id &&
        toPort.direction === "input" &&
        fromPort?.direction === "output"
      ) {
        markReachable(fromPort.nodeId);
      }
    });
  });

  normalized.document.nodes.forEach((node) => {
    if (node.kind === "rule-frame" || reachableNodeIds.has(node.id)) {
      return;
    }

    pushIssue(issues, {
      severity: "error",
      code: "orphan_node",
      nodeId: node.id,
      ruleId: node.ruleId,
      message: `Node "${node.id}" is not reachable from its rule frame roots.`,
    });
  });

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
