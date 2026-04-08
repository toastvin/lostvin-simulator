import { getComposerBlockDefinition } from "@/lib/composer/registry";
import type {
  ComposerBlock,
  ComposerBlockCategory,
  ComposerBlockType,
  ComposerDocument,
  ComposerRule,
} from "@/types/composer";

const DEFAULT_DOCUMENT_VERSION = 1 as const;

function countItemsWithPrefix(ids: string[], prefix: string) {
  return ids.filter((id) => id.startsWith(prefix)).length;
}

export function createComposerRuleId(existingRules: ComposerRule[] = []) {
  const existingIds = new Set(existingRules.map((rule) => rule.id));
  let nextIndex = countItemsWithPrefix([...existingIds], "rule-") + 1;
  let candidate = `rule-${nextIndex}`;

  while (existingIds.has(candidate)) {
    nextIndex += 1;
    candidate = `rule-${nextIndex}`;
  }

  return candidate;
}

export function createComposerBlockId(
  type: ComposerBlockType,
  existingBlocks: ComposerBlock[] = [],
) {
  const existingIds = new Set(existingBlocks.map((block) => block.id));
  let nextIndex =
    existingBlocks.filter((block) => block.type === type).length + 1;
  let candidate = `${type}-${nextIndex}`;

  while (existingIds.has(candidate)) {
    nextIndex += 1;
    candidate = `${type}-${nextIndex}`;
  }

  return candidate;
}

export function createComposerBlock<TBlock extends ComposerBlock>(
  type: TBlock["type"],
  existingBlocks: ComposerBlock[] = [],
  explicitId?: string,
  category?: TBlock["category"],
): TBlock {
  const definition = getComposerBlockDefinition(type, category);

  if (!definition) {
    throw new Error(
      `Unknown composer block type: ${type}${category ? ` (${category})` : ""}`,
    );
  }

  return {
    id: explicitId ?? createComposerBlockId(type, existingBlocks),
    category: definition.category as ComposerBlockCategory,
    type,
    payload: structuredClone(definition.defaultPayload),
  } as TBlock;
}

export function createComposerRule(
  existingRules: ComposerRule[] = [],
  explicitId?: string,
): ComposerRule {
  const id = explicitId ?? createComposerRuleId(existingRules);
  const targetBlock = createComposerBlock("allAgents");
  const effectBlock = createComposerBlock("grantAmount");

  return {
    id,
    name: `Custom Rule ${existingRules.length + 1}`,
    enabled: true,
    cadence: "step",
    blocks: [targetBlock, effectBlock],
  };
}

export function createEmptyComposerDocument(): ComposerDocument {
  return {
    version: DEFAULT_DOCUMENT_VERSION,
    rules: [],
  };
}

export function moveArrayItem<T>(
  items: T[],
  sourceIndex: number,
  targetIndex: number,
): T[] {
  if (
    sourceIndex < 0 ||
    targetIndex < 0 ||
    sourceIndex >= items.length ||
    targetIndex >= items.length ||
    sourceIndex === targetIndex
  ) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, movedItem);
  return nextItems;
}
