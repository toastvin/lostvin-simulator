import type {
  CanvasPoint,
  CanvasRuleFrame,
  CanvasViewport,
  ComposerCanvasDocument,
} from "@/types/composer-canvas";
import type { ComposerBlock, ComposerDocument, ComposerRule } from "@/types/composer";

export const DEFAULT_CANVAS_VIEWPORT: CanvasViewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

const DEFAULT_FRAME_WIDTH = 360;

function countItemsWithPrefix(ids: string[], prefix: string) {
  return ids.filter((id) => id.startsWith(prefix)).length;
}

export function createDefaultCanvasViewport(): CanvasViewport {
  return { ...DEFAULT_CANVAS_VIEWPORT };
}

export function createCanvasFrameId(existingFrames: CanvasRuleFrame[] = []) {
  const existingIds = new Set(existingFrames.map((frame) => frame.id));
  let nextIndex = countItemsWithPrefix([...existingIds], "frame-") + 1;
  let candidate = `frame-${nextIndex}`;

  while (existingIds.has(candidate)) {
    nextIndex += 1;
    candidate = `frame-${nextIndex}`;
  }

  return candidate;
}

export function createLaneOrderFromBlocks(blocks: ComposerBlock[]) {
  return {
    target: blocks
      .filter((block) => block.category === "target")
      .map((block) => block.id),
    condition: blocks
      .filter((block) => block.category === "condition")
      .map((block) => block.id),
    effect: blocks
      .filter((block) => block.category === "effect")
      .map((block) => block.id),
    modifier: blocks
      .filter((block) => block.category === "modifier")
      .map((block) => block.id),
  };
}

export function createDefaultRuleFrame(
  rule: ComposerRule,
  index = 0,
  existingFrames: CanvasRuleFrame[] = [],
  position?: Partial<CanvasPoint>,
): CanvasRuleFrame {
  const column = index % 2;
  const row = Math.floor(index / 2);

  return {
    id: createCanvasFrameId(existingFrames),
    ruleId: rule.id,
    x: position?.x ?? 40 + column * 420,
    y: position?.y ?? 40 + row * 360,
    width: DEFAULT_FRAME_WIDTH,
    collapsed: false,
    zIndex: index + 1,
    laneOrder: createLaneOrderFromBlocks(rule.blocks),
  };
}

export function createEmptyCanvasDocument(
  composer: ComposerDocument,
): ComposerCanvasDocument {
  return {
    version: 1,
    viewport: createDefaultCanvasViewport(),
    composer: structuredClone(composer),
    frames: [],
    blockLayouts: [],
  };
}
