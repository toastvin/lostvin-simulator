import {
  createDefaultCanvasViewport,
  createDefaultRuleFrame,
} from "@/lib/composer-canvas/defaults";
import type {
  CanvasBlockLayout,
  ImportComposerToCanvasResult,
} from "@/types/composer-canvas";
import type { ComposerDocument } from "@/types/composer";

export function importComposerToCanvas(
  composer: ComposerDocument,
): ImportComposerToCanvasResult {
  const blockLayouts: CanvasBlockLayout[] = composer.rules.flatMap((rule) =>
    rule.blocks.map((block) => ({
      blockId: block.id,
      ruleId: rule.id,
      lane: block.category,
    })),
  );

  return {
    document: {
      version: 1,
      viewport: createDefaultCanvasViewport(),
      composer: structuredClone(composer),
      frames: composer.rules.map((rule, index) =>
        createDefaultRuleFrame(rule, index),
      ),
      blockLayouts,
    },
    issues: [],
  };
}
