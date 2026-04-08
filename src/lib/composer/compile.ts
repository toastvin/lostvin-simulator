import { validateComposerDocument } from "@/lib/composer/validate";
import type {
  CompileComposerResult,
  CompiledComposerRule,
  CompiledCondition,
  CompiledEffect,
  CompiledModifier,
  CompiledTargetSelector,
  ComposerBlock,
  ComposerConditionBlock,
  ComposerDocument,
  ComposerEffectBlock,
  ComposerModifierBlock,
  ComposerTargetBlock,
} from "@/types/composer";
import type { PolicyBracket } from "@/types/policies";

function compileTarget(
  block: ComposerTargetBlock,
): CompiledTargetSelector {
  switch (block.type) {
    case "allAgents":
      return { kind: "allAgents" };
    case "bottomWealthPercent": {
      const payload = block.payload as { percent: number };
      return { kind: block.type, percent: payload.percent };
    }
    case "topWealthPercent": {
      const payload = block.payload as { percent: number };
      return { kind: block.type, percent: payload.percent };
    }
    case "wealthBelow": {
      const payload = block.payload as { threshold: number };
      return { kind: block.type, threshold: payload.threshold };
    }
    case "wealthAbove": {
      const payload = block.payload as { threshold: number };
      return { kind: block.type, threshold: payload.threshold };
    }
    case "talentAbove": {
      const payload = block.payload as { threshold: number };
      return { kind: block.type, threshold: payload.threshold };
    }
    case "highTalentLowWealth":
      return {
        kind: block.type,
        talentThreshold: (block.payload as { talentThreshold: number }).talentThreshold,
        wealthCeiling: (block.payload as { wealthCeiling: number }).wealthCeiling,
      };
    case "bankruptAgents":
      return {
        kind: block.type,
        minBankruptCount: (block.payload as { minBankruptCount: number })
          .minBankruptCount,
      };
  }
}

function compileCondition(
  block: ComposerConditionBlock,
): CompiledCondition {
  switch (block.type) {
    case "wealthBelow":
      return {
        kind: block.type,
        threshold: (block.payload as { threshold: number }).threshold,
      };
    case "wealthAbove":
      return {
        kind: block.type,
        threshold: (block.payload as { threshold: number }).threshold,
      };
    case "talentBelow":
      return {
        kind: block.type,
        threshold: (block.payload as { threshold: number }).threshold,
      };
    case "talentAbove":
      return {
        kind: block.type,
        threshold: (block.payload as { threshold: number }).threshold,
      };
    case "rescuedCountBelow":
      return {
        kind: block.type,
        maxRescuedCount: (block.payload as { maxRescuedCount: number })
          .maxRescuedCount,
      };
    case "bankruptCountAtLeast":
      return {
        kind: block.type,
        minBankruptCount: (block.payload as { minBankruptCount: number })
          .minBankruptCount,
      };
  }
}

function compileEffect(
  block: ComposerEffectBlock,
): CompiledEffect {
  switch (block.type) {
    case "grantAmount":
      return {
        kind: block.type,
        amount: (block.payload as { amount: number }).amount,
      };
    case "wealthTax":
      return {
        kind: block.type,
        threshold: (block.payload as { threshold: number }).threshold,
        rate: (block.payload as { rate: number }).rate,
      };
    case "progressiveTax":
      return {
        kind: block.type,
        brackets: structuredClone(
          (block.payload as { brackets: PolicyBracket[] }).brackets,
        ),
      };
    case "setWealthFloor":
      return {
        kind: block.type,
        minimumWealth: (block.payload as { minimumWealth: number }).minimumWealth,
      };
    case "bailout":
      return {
        kind: block.type,
        triggerWealth: (block.payload as { triggerWealth: number }).triggerWealth,
        amount: (block.payload as { amount: number }).amount,
        maxPerAgent: (block.payload as { maxPerAgent: number }).maxPerAgent,
      };
    case "talentGrant":
      return {
        kind: block.type,
        talentThreshold: (block.payload as { talentThreshold: number }).talentThreshold,
        wealthCeiling: (block.payload as { wealthCeiling: number }).wealthCeiling,
        amount: (block.payload as { amount: number }).amount,
      };
  }
}

function compileModifier(
  block: ComposerModifierBlock,
): CompiledModifier {
  switch (block.type) {
    case "budgetCap":
      return {
        kind: block.type,
        maxBudget: (block.payload as { maxBudget: number }).maxBudget,
      };
    case "maxRecipients":
      return {
        kind: block.type,
        count: (block.payload as { count: number }).count,
      };
    case "weightMultiplier":
      return {
        kind: block.type,
        value: (block.payload as { value: number }).value,
      };
    case "priorityScoreWeight":
      return {
        kind: block.type,
        talentWeight: (block.payload as { talentWeight: number }).talentWeight,
        wealthWeight: (block.payload as { wealthWeight: number }).wealthWeight,
        bankruptWeight: (block.payload as { bankruptWeight: number }).bankruptWeight,
      };
  }
}

function compileRule(
  blocks: ComposerBlock[],
  id: string,
  name: string,
  enabled: boolean,
  cadence: CompiledComposerRule["cadence"],
): CompiledComposerRule | null {
  const targetBlock = blocks.find(
    (block): block is ComposerTargetBlock => block.category === "target",
  );

  if (!targetBlock) {
    return null;
  }

  const conditions = blocks.filter(
    (block): block is ComposerConditionBlock => block.category === "condition",
  );
  const effects = blocks.filter(
    (block): block is ComposerEffectBlock => block.category === "effect",
  );

  if (effects.length === 0) {
    return null;
  }

  const modifiers = blocks.filter(
    (block): block is ComposerModifierBlock => block.category === "modifier",
  );

  return {
    id,
    name,
    enabled,
    cadence,
    target: compileTarget(targetBlock),
    conditions: conditions.map(compileCondition),
    effects: effects.map(compileEffect),
    modifiers: modifiers.map(compileModifier),
  };
}

export function compileComposerDocument(
  document: ComposerDocument,
): CompileComposerResult {
  const validation = validateComposerDocument(document);

  if (!validation.valid) {
    return {
      compiledRules: [],
      warnings: validation.errors.map((issue) => issue.message),
    };
  }

  const compiledRules = document.rules
    .map((rule) =>
      compileRule(rule.blocks, rule.id, rule.name, rule.enabled, rule.cadence),
    )
    .filter((rule): rule is CompiledComposerRule => rule !== null);

  return {
    compiledRules,
    warnings: validation.warnings.map((issue) => issue.message),
  };
}
