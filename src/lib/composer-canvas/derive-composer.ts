import { normalizeCanvasDocument } from "@/lib/composer-canvas/normalize";
import { composerCanvasLanes } from "@/types/composer-canvas";
import type { DeriveComposerFromCanvasResult, ComposerCanvasDocument } from "@/types/composer-canvas";
import type { ComposerBlock } from "@/types/composer";

export function deriveComposerFromCanvas(
  document: ComposerCanvasDocument,
): DeriveComposerFromCanvasResult {
  const normalized = normalizeCanvasDocument(document);
  const composer = structuredClone(normalized.document.composer);

  composer.rules = composer.rules.map((rule) => {
    const frame = normalized.document.frames.find(
      (candidate) => candidate.ruleId === rule.id,
    );

    if (!frame) {
      return rule;
    }

    const blockMap = new Map(rule.blocks.map((block) => [block.id, block]));
    const nextBlocks = composerCanvasLanes.flatMap((lane) =>
      frame.laneOrder[lane].flatMap((blockId) => {
        const block = blockMap.get(blockId);
        return block ? ([{ ...block, category: lane } as ComposerBlock]) : [];
      }),
    );

    return {
      ...rule,
      blocks: nextBlocks,
    };
  });

  return {
    composer,
    issues: normalized.issues,
  };
}
