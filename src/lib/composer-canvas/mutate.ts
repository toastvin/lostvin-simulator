import { createComposerBlock } from "@/lib/composer/defaults";
import type {
  ComposerCanvasDocument,
  ComposerCanvasLane,
} from "@/types/composer-canvas";
import type {
  ComposerBlock,
  ComposerBlockCategory,
  ComposerRule,
} from "@/types/composer";

export type ScratchCanvasDragPayload =
  | {
      kind: "palette";
      blockType: ComposerBlock["type"];
      category: ComposerBlockCategory;
    }
  | {
      kind: "canvas-block";
      blockId: string;
      sourceRuleId: string;
    };

function insertAt<T>(items: T[], index: number, item: T) {
  const nextItems = [...items];
  const clampedIndex = Math.max(0, Math.min(index, nextItems.length));
  nextItems.splice(clampedIndex, 0, item);
  return nextItems;
}

function removeValue<T>(items: T[], target: T) {
  return items.filter((item) => item !== target);
}

export function getRuleById(
  document: ComposerCanvasDocument,
  ruleId: string,
) {
  return document.composer.rules.find((rule) => rule.id === ruleId) ?? null;
}

function getFrameByRuleId(
  document: ComposerCanvasDocument,
  ruleId: string,
) {
  return document.frames.find((frame) => frame.ruleId === ruleId) ?? null;
}

export function getBlockById(
  document: ComposerCanvasDocument,
  ruleId: string,
  blockId: string,
) {
  return (
    document.composer.rules
      .find((rule) => rule.id === ruleId)
      ?.blocks.find((block) => block.id === blockId) ?? null
  );
}

export function withUpdatedRule(
  document: ComposerCanvasDocument,
  ruleId: string,
  updater: (rule: ComposerRule) => ComposerRule,
) {
  return {
    ...document,
    composer: {
      ...document.composer,
      rules: document.composer.rules.map((rule) =>
        rule.id === ruleId ? updater(rule) : rule,
      ),
    },
  };
}

export function deleteRuleFromDocument(
  document: ComposerCanvasDocument,
  ruleId: string,
) {
  return {
    ...document,
    composer: {
      ...document.composer,
      rules: document.composer.rules.filter((rule) => rule.id !== ruleId),
    },
    frames: document.frames.filter((frame) => frame.ruleId !== ruleId),
    blockLayouts: document.blockLayouts.filter((layout) => layout.ruleId !== ruleId),
  };
}

function removeBlockFromFrameLanes(
  document: ComposerCanvasDocument,
  blockId: string,
) {
  return {
    ...document,
    frames: document.frames.map((frame) => ({
      ...frame,
      laneOrder: {
        target: removeValue(frame.laneOrder.target, blockId),
        condition: removeValue(frame.laneOrder.condition, blockId),
        effect: removeValue(frame.laneOrder.effect, blockId),
        modifier: removeValue(frame.laneOrder.modifier, blockId),
      },
    })),
    blockLayouts: document.blockLayouts.filter((layout) => layout.blockId !== blockId),
  };
}

export function canDropIntoLane(
  document: ComposerCanvasDocument,
  payload: ScratchCanvasDragPayload,
  targetRuleId: string,
  lane: ComposerCanvasLane,
) {
  const blockCategory =
    payload.kind === "palette"
      ? payload.category
      : getBlockById(document, payload.sourceRuleId, payload.blockId)?.category;

  if (!blockCategory || blockCategory !== lane) {
    return false;
  }

  if (lane !== "target") {
    return true;
  }

  const targetRule = getRuleById(document, targetRuleId);

  if (!targetRule) {
    return false;
  }

  const targetCount = targetRule.blocks.filter(
    (block) => block.category === "target",
  ).length;

  if (payload.kind === "canvas-block" && payload.sourceRuleId === targetRuleId) {
    return true;
  }

  return targetCount === 0;
}

export function addPaletteBlockToLane(
  document: ComposerCanvasDocument,
  blockType: ComposerBlock["type"],
  targetRuleId: string,
  lane: ComposerCanvasLane,
  index: number,
) {
  const targetRule = getRuleById(document, targetRuleId);
  const targetFrame = getFrameByRuleId(document, targetRuleId);

  if (!targetRule || !targetFrame) {
    return document;
  }

  const nextBlock = createComposerBlock(
    blockType,
    targetRule.blocks,
    undefined,
    lane,
  );
  const nextDocument = withUpdatedRule(document, targetRuleId, (rule) => ({
    ...rule,
    blocks: [...rule.blocks, { ...nextBlock, category: lane } as ComposerBlock],
  }));

  return {
    ...nextDocument,
    frames: nextDocument.frames.map((frame) =>
      frame.id === targetFrame.id
        ? {
            ...frame,
            laneOrder: {
              ...frame.laneOrder,
              [lane]: insertAt(frame.laneOrder[lane], index, nextBlock.id),
            },
          }
        : frame,
    ),
    blockLayouts: [
      ...nextDocument.blockLayouts,
      {
        blockId: nextBlock.id,
        ruleId: targetRuleId,
        lane,
      },
    ],
  };
}

export function moveCanvasBlockToLane(
  document: ComposerCanvasDocument,
  payload: Extract<ScratchCanvasDragPayload, { kind: "canvas-block" }>,
  targetRuleId: string,
  lane: ComposerCanvasLane,
  index: number,
) {
  const sourceRule = getRuleById(document, payload.sourceRuleId);
  const sourceBlock = getBlockById(
    document,
    payload.sourceRuleId,
    payload.blockId,
  );

  if (!sourceRule || !sourceBlock) {
    return document;
  }

  let nextDocument = removeBlockFromFrameLanes(document, payload.blockId);

  nextDocument = withUpdatedRule(nextDocument, payload.sourceRuleId, (rule) => ({
    ...rule,
    blocks: rule.blocks.filter((block) => block.id !== payload.blockId),
  }));

  nextDocument = withUpdatedRule(nextDocument, targetRuleId, (rule) => ({
    ...rule,
    blocks: [
      ...rule.blocks,
      {
        ...sourceBlock,
        category: lane,
      } as ComposerBlock,
    ],
  }));

  const targetFrame = getFrameByRuleId(nextDocument, targetRuleId);

  if (!targetFrame) {
    return nextDocument;
  }

  return {
    ...nextDocument,
    frames: nextDocument.frames.map((frame) =>
      frame.id === targetFrame.id
        ? {
            ...frame,
            laneOrder: {
              ...frame.laneOrder,
              [lane]: insertAt(frame.laneOrder[lane], index, payload.blockId),
            },
          }
        : frame,
    ),
    blockLayouts: [
      ...nextDocument.blockLayouts,
      {
        blockId: payload.blockId,
        ruleId: targetRuleId,
        lane,
      },
    ],
  };
}

export function updateBlockPayload(
  document: ComposerCanvasDocument,
  ruleId: string,
  blockId: string,
  nextPayload: Record<string, unknown>,
) {
  return withUpdatedRule(document, ruleId, (rule) => ({
    ...rule,
    blocks: rule.blocks.map((block) =>
      block.id === blockId
        ? ({
            ...block,
            payload: nextPayload,
          } as ComposerBlock)
        : block,
    ),
  }));
}

export function deleteBlockFromDocument(
  document: ComposerCanvasDocument,
  ruleId: string,
  blockId: string,
) {
  const nextDocument = removeBlockFromFrameLanes(document, blockId);

  return withUpdatedRule(nextDocument, ruleId, (rule) => ({
    ...rule,
    blocks: rule.blocks.filter((block) => block.id !== blockId),
  }));
}
