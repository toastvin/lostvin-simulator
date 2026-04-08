import { normalizeCanvasDocument } from "@/lib/composer-canvas/normalize";
import {
  createConnectedCanvasBlockNode,
  createConnectedCanvasFrameNode,
  createConnectedCanvasGroupNode,
  createConnectedCanvasPortId,
  createConnectedCanvasPortsForNode,
  createEmptyConnectedCanvasDocument,
} from "@/lib/connected-canvas/defaults";
import { composerCanvasLanes } from "@/types/composer-canvas";
import type { ComposerCanvasDocument } from "@/types/composer-canvas";
import type {
  ConnectedCanvasConnectionType,
  ConnectedCanvasDocument,
  ConnectedCanvasIssue,
  ImportPhase10CanvasToConnectedCanvasResult,
} from "@/types/connected-canvas";

const FRAME_HEADER_OFFSET = 56;
const GROUP_VERTICAL_SPACING = 128;
const BLOCK_VERTICAL_SPACING = 76;
const GROUP_X_OFFSET = 24;
const BLOCK_X_OFFSET = 40;

function pushIssue(issues: ConnectedCanvasIssue[], issue: ConnectedCanvasIssue) {
  issues.push(issue);
}

function toConnectedIssues(
  document: ComposerCanvasDocument,
): ConnectedCanvasIssue[] {
  const normalized = normalizeCanvasDocument(document);

  return normalized.issues.map((issue) => ({
    severity: issue.severity,
    code:
      issue.code === "duplicate_frame_id"
        ? "duplicate_node_id"
        : issue.code === "missing_frame"
          ? "missing_node"
          : issue.code === "missing_block_layout"
            ? "missing_layout"
            : "layout_rebuilt",
    message: issue.message,
    ruleId: issue.ruleId,
    nodeId: issue.frameId ?? issue.blockId,
  }));
}

function createGroupNodeId(ruleId: string, category: ConnectedCanvasConnectionType) {
  return `group-node:${ruleId}:${category}`;
}

function createFrameNodeId(frameId: string) {
  return `frame-node:${frameId}`;
}

function createBlockNodeId(ruleId: string, blockId: string) {
  return `block-node:${ruleId}:${blockId}`;
}

export function importPhase10CanvasToConnectedCanvas(
  document: ComposerCanvasDocument,
): ImportPhase10CanvasToConnectedCanvasResult {
  const normalized = normalizeCanvasDocument(document);
  const connected: ConnectedCanvasDocument = createEmptyConnectedCanvasDocument();
  const issues = toConnectedIssues(document);

  connected.viewport = structuredClone(normalized.document.viewport);

  normalized.document.frames.forEach((frame) => {
    const rule = normalized.document.composer.rules.find(
      (candidate) => candidate.id === frame.ruleId,
    );

    if (!rule) {
      pushIssue(issues, {
        severity: "warning",
        code: "missing_node",
        nodeId: frame.id,
        ruleId: frame.ruleId,
        message: `Skipping frame "${frame.id}" because rule "${frame.ruleId}" is missing.`,
      });
      return;
    }

    const frameNode = createConnectedCanvasFrameNode(rule, createFrameNodeId(frame.id));
    connected.nodes.push(frameNode);
    connected.ports.push(...createConnectedCanvasPortsForNode(frameNode));
    connected.layouts.push({
      nodeId: frameNode.id,
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: FRAME_HEADER_OFFSET + composerCanvasLanes.length * GROUP_VERTICAL_SPACING,
      zIndex: frame.zIndex,
    });

    const blockMap = new Map(rule.blocks.map((block) => [block.id, block]));

    composerCanvasLanes.forEach((lane, laneIndex) => {
      const orderedBlocks = frame.laneOrder[lane]
        .map((blockId) => blockMap.get(blockId))
        .filter((block) => block !== undefined);

      if (lane === "target") {
        orderedBlocks.forEach((block, blockIndex) => {
          const node = createConnectedCanvasBlockNode(
            rule.id,
            block,
            createBlockNodeId(rule.id, block.id),
          );

          connected.nodes.push(node);
          connected.ports.push(...createConnectedCanvasPortsForNode(node));
          connected.layouts.push({
            nodeId: node.id,
            x: frame.x + BLOCK_X_OFFSET,
            y: frame.y + FRAME_HEADER_OFFSET + blockIndex * BLOCK_VERTICAL_SPACING,
            width: Math.max(220, frame.width - BLOCK_X_OFFSET * 2),
            height: 72,
            zIndex: frame.zIndex + 1 + blockIndex,
          });
          connected.edges.push({
            id: `edge:${node.id}:to:${frameNode.id}:target:${blockIndex + 1}`,
            fromPortId: createConnectedCanvasPortId(node.id, "output", "output"),
            toPortId: createConnectedCanvasPortId(frameNode.id, "input", "target"),
          });
        });

        return;
      }

      if (orderedBlocks.length === 0) {
        return;
      }

      const groupNode = createConnectedCanvasGroupNode(
        rule.id,
        lane,
        createGroupNodeId(rule.id, lane),
      );

      connected.nodes.push(groupNode);
      connected.ports.push(...createConnectedCanvasPortsForNode(groupNode));
      connected.layouts.push({
        nodeId: groupNode.id,
        x: frame.x + GROUP_X_OFFSET,
        y: frame.y + FRAME_HEADER_OFFSET + laneIndex * GROUP_VERTICAL_SPACING,
        width: Math.max(240, frame.width - GROUP_X_OFFSET * 2),
        height: 88 + orderedBlocks.length * 72,
        zIndex: frame.zIndex + 1,
      });
      connected.edges.push({
        id: `edge:${groupNode.id}:to:${frameNode.id}:${lane}`,
        fromPortId: createConnectedCanvasPortId(groupNode.id, "output", "output"),
        toPortId: createConnectedCanvasPortId(frameNode.id, "input", lane),
      });

      const childNodeIds: string[] = [];

      orderedBlocks.forEach((block, blockIndex) => {
        const node = createConnectedCanvasBlockNode(
          rule.id,
          block,
          createBlockNodeId(rule.id, block.id),
        );

        connected.nodes.push(node);
        connected.ports.push(...createConnectedCanvasPortsForNode(node));
        connected.layouts.push({
          nodeId: node.id,
          x: frame.x + BLOCK_X_OFFSET,
          y:
            frame.y +
            FRAME_HEADER_OFFSET +
            laneIndex * GROUP_VERTICAL_SPACING +
            36 +
            blockIndex * BLOCK_VERTICAL_SPACING,
          width: Math.max(220, frame.width - BLOCK_X_OFFSET * 2),
          height: 72,
          zIndex: frame.zIndex + 2 + blockIndex,
        });
        childNodeIds.push(node.id);
      });

      connected.containers.push({
        containerNodeId: groupNode.id,
        childNodeIds,
      });
    });
  });

  return {
    document: connected,
    issues,
  };
}
