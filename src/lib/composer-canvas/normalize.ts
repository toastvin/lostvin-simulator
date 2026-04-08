import { createDefaultRuleFrame, createLaneOrderFromBlocks } from "@/lib/composer-canvas/defaults";
import { composerCanvasLanes } from "@/types/composer-canvas";
import type {
  CanvasBlockLayout,
  CanvasNormalizationIssue,
  CanvasRuleFrame,
  ComposerCanvasDocument,
  NormalizeCanvasDocumentResult,
} from "@/types/composer-canvas";

function pushIssue(
  issues: CanvasNormalizationIssue[],
  issue: CanvasNormalizationIssue,
) {
  issues.push(issue);
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function normalizeFrame(
  frame: CanvasRuleFrame,
  validBlockIdsByLane: Record<(typeof composerCanvasLanes)[number], string[]>,
) {
  return {
    ...frame,
    laneOrder: {
      target: unique(frame.laneOrder.target.filter((id) => validBlockIdsByLane.target.includes(id))),
      condition: unique(
        frame.laneOrder.condition.filter((id) =>
          validBlockIdsByLane.condition.includes(id),
        ),
      ),
      effect: unique(frame.laneOrder.effect.filter((id) => validBlockIdsByLane.effect.includes(id))),
      modifier: unique(
        frame.laneOrder.modifier.filter((id) =>
          validBlockIdsByLane.modifier.includes(id),
        ),
      ),
    },
  };
}

export function normalizeCanvasDocument(
  input: ComposerCanvasDocument,
): NormalizeCanvasDocumentResult {
  const document = structuredClone(input);
  const issues: CanvasNormalizationIssue[] = [];
  const seenFrameIds = new Set<string>();
  const ruleIds = new Set(document.composer.rules.map((rule) => rule.id));
  const nextFrames: CanvasRuleFrame[] = [];

  document.frames.forEach((frame, index) => {
    if (seenFrameIds.has(frame.id)) {
      pushIssue(issues, {
        severity: "error",
        code: "duplicate_frame_id",
        frameId: frame.id,
        ruleId: frame.ruleId,
        message: `Canvas frame id "${frame.id}" is duplicated.`,
      });
      return;
    }

    seenFrameIds.add(frame.id);

    if (!ruleIds.has(frame.ruleId)) {
      pushIssue(issues, {
        severity: "warning",
        code: "missing_rule",
        frameId: frame.id,
        ruleId: frame.ruleId,
        message: `Canvas frame "${frame.id}" pointed at a missing rule and was dropped.`,
      });
      return;
    }

    const rule = document.composer.rules.find((candidate) => candidate.id === frame.ruleId)!;
    const validBlockIdsByLane = createLaneOrderFromBlocks(rule.blocks);
    const normalizedFrame = normalizeFrame(frame, validBlockIdsByLane);

    composerCanvasLanes.forEach((lane) => {
      const missingIds = validBlockIdsByLane[lane].filter(
        (blockId) => !normalizedFrame.laneOrder[lane].includes(blockId),
      );

      if (missingIds.length > 0) {
        normalizedFrame.laneOrder[lane] = [
          ...normalizedFrame.laneOrder[lane],
          ...missingIds,
        ];
        pushIssue(issues, {
          severity: "warning",
          code: "frame_order_rebuilt",
          frameId: frame.id,
          ruleId: frame.ruleId,
          message: `Lane order for "${frame.ruleId}" was rebuilt to include missing ${lane} blocks.`,
        });
      }
    });

    nextFrames.push({
      ...normalizedFrame,
      zIndex: normalizedFrame.zIndex || index + 1,
    });
  });

  document.composer.rules.forEach((rule, index) => {
    if (!nextFrames.some((frame) => frame.ruleId === rule.id)) {
      nextFrames.push(createDefaultRuleFrame(rule, index, nextFrames));
      pushIssue(issues, {
        severity: "warning",
        code: "missing_frame",
        ruleId: rule.id,
        message: `Canvas frame for rule "${rule.id}" was missing and has been recreated.`,
      });
    }
  });

  const blockLayouts: CanvasBlockLayout[] = [];
  const seenBlockIds = new Set<string>();

  nextFrames.forEach((frame) => {
    composerCanvasLanes.forEach((lane) => {
      frame.laneOrder[lane].forEach((blockId) => {
        if (seenBlockIds.has(blockId)) {
          return;
        }

        seenBlockIds.add(blockId);
        blockLayouts.push({
          blockId,
          ruleId: frame.ruleId,
          lane,
        });
      });
    });
  });

  document.composer.rules.forEach((rule) => {
    rule.blocks.forEach((block) => {
      if (!seenBlockIds.has(block.id)) {
        blockLayouts.push({
          blockId: block.id,
          ruleId: rule.id,
          lane: block.category,
        });
        pushIssue(issues, {
          severity: "warning",
          code: "missing_block_layout",
          ruleId: rule.id,
          blockId: block.id,
          message: `Block "${block.id}" had no canvas layout and was restored into its semantic lane.`,
        });
      }
    });
  });

  document.frames = nextFrames;
  document.blockLayouts = blockLayouts;

  return {
    document,
    issues,
  };
}
