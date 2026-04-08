import {
  getConnectedCanvasCategory,
  isConnectedCanvasBlockNode,
  isConnectedCanvasGroupNode,
  isConnectedCanvasRuleFrameNode,
} from "@/lib/connected-canvas/defaults";
import { normalizeConnectedCanvasDocument } from "@/lib/connected-canvas/normalize";
import type {
  ConnectedCanvasConnectionType,
  ConnectedCanvasDocument,
  ConnectedCanvasIssue,
  ConnectedCanvasNode,
  ConnectedCanvasRuleFrameNode,
  DeriveComposerFromConnectedCanvasResult,
} from "@/types/connected-canvas";
import type { ComposerBlock, ComposerDocument, ComposerRule } from "@/types/composer";

function pushIssue(issues: ConnectedCanvasIssue[], issue: ConnectedCanvasIssue) {
  issues.push(issue);
}

function findInputPortId(
  frameNode: ConnectedCanvasRuleFrameNode,
  category: ConnectedCanvasConnectionType,
) {
  return `${frameNode.id}:input:${category}`;
}

function flattenNodeToBlocks(
  nodeId: string,
  expectedCategory: ConnectedCanvasConnectionType,
  nodeMap: Map<string, ConnectedCanvasNode>,
  containerMap: Map<string, string[]>,
  issues: ConnectedCanvasIssue[],
  stack: string[] = [],
): ComposerBlock[] {
  if (stack.includes(nodeId)) {
    pushIssue(issues, {
      severity: "error",
      code: "cycle_detected",
      nodeId,
      message: `Connected canvas cycle detected while deriving blocks: ${[...stack, nodeId].join(" -> ")}.`,
    });
    return [];
  }

  const node = nodeMap.get(nodeId);

  if (!node) {
    pushIssue(issues, {
      severity: "error",
      code: "missing_node",
      nodeId,
      message: `Connected canvas node "${nodeId}" is missing during derivation.`,
    });
    return [];
  }

  if (isConnectedCanvasBlockNode(node)) {
    if (node.block.category !== expectedCategory) {
      pushIssue(issues, {
        severity: "error",
        code: "type_mismatch",
        nodeId,
        ruleId: node.ruleId,
        message: `Node "${nodeId}" does not match expected "${expectedCategory}" category.`,
      });
      return [];
    }

    return [structuredClone(node.block)];
  }

  if (isConnectedCanvasGroupNode(node)) {
    if (node.category !== expectedCategory) {
      pushIssue(issues, {
        severity: "error",
        code: "type_mismatch",
        nodeId,
        ruleId: node.ruleId,
        message: `Group "${nodeId}" does not match expected "${expectedCategory}" category.`,
      });
      return [];
    }

    return (containerMap.get(nodeId) ?? []).flatMap((childNodeId) =>
      flattenNodeToBlocks(
        childNodeId,
        expectedCategory,
        nodeMap,
        containerMap,
        issues,
        [...stack, nodeId],
      ),
    );
  }

  pushIssue(issues, {
    severity: "error",
    code: "invalid_container_child",
    nodeId,
    ruleId: node.ruleId,
    message: `Rule frame "${nodeId}" cannot be derived as a semantic block.`,
  });
  return [];
}

export function deriveComposerFromConnectedCanvas(
  document: ConnectedCanvasDocument,
): DeriveComposerFromConnectedCanvasResult {
  const normalized = normalizeConnectedCanvasDocument(document);
  const issues = [...normalized.issues];
  const nodeMap = new Map(
    normalized.document.nodes.map((node) => [node.id, node]),
  );
  const containerMap = new Map(
    normalized.document.containers.map((container) => [
      container.containerNodeId,
      container.childNodeIds,
    ]),
  );
  const layoutMap = new Map(
    normalized.document.layouts.map((layout) => [layout.nodeId, layout]),
  );
  const portMap = new Map(
    normalized.document.ports.map((port) => [port.id, port]),
  );
  const frameNodes = normalized.document.nodes
    .filter(isConnectedCanvasRuleFrameNode)
    .sort((left, right) => {
      const leftLayout = layoutMap.get(left.id);
      const rightLayout = layoutMap.get(right.id);

      if (!leftLayout || !rightLayout) {
        return left.ruleId.localeCompare(right.ruleId);
      }

      if (leftLayout.y !== rightLayout.y) {
        return leftLayout.y - rightLayout.y;
      }

      return leftLayout.x - rightLayout.x;
    });

  const rules: ComposerRule[] = frameNodes.map((frameNode) => {
    const blocks: ComposerBlock[] = [];

    (["target", "condition", "effect", "modifier"] as const).forEach((category) => {
      const portId = findInputPortId(frameNode, category);
      const incomingEdges = normalized.document.edges.filter(
        (edge) => edge.toPortId === portId,
      );

      incomingEdges.forEach((edge) => {
        const fromPort = portMap.get(edge.fromPortId);

        if (!fromPort) {
          pushIssue(issues, {
            severity: "error",
            code: "missing_port",
            portId: edge.fromPortId,
            edgeId: edge.id,
            ruleId: frameNode.ruleId,
            message: `Edge "${edge.id}" referenced a missing source port during derivation.`,
          });
          return;
        }

        blocks.push(
          ...flattenNodeToBlocks(
            fromPort.nodeId,
            category,
            nodeMap,
            containerMap,
            issues,
          ),
        );
      });
    });

    return {
      id: frameNode.ruleId,
      name: frameNode.name,
      enabled: frameNode.enabled,
      cadence: frameNode.cadence,
      blocks,
    };
  });

  const composer: ComposerDocument = {
    version: 1,
    rules,
  };

  return {
    composer,
    issues,
  };
}
