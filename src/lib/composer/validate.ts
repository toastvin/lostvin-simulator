import { getComposerBlockDefinition } from "@/lib/composer/registry";
import type {
  ComposerBlock,
  ComposerConditionBlock,
  ComposerDocument,
  ComposerEffectBlock,
  ComposerModifierBlock,
  ComposerRule,
  ComposerTargetBlock,
  ComposerValidationIssue,
  ValidateComposerResult,
} from "@/types/composer";
import type { PolicyBracket } from "@/types/policies";

const CATEGORY_ORDER = ["target", "condition", "effect", "modifier"] as const;

function pushIssue(
  issues: ComposerValidationIssue[],
  issue: ComposerValidationIssue,
) {
  issues.push(issue);
}

function validateBracketPayload(
  rule: ComposerRule,
  block: ComposerEffectBlock & { payload: { brackets: PolicyBracket[] } },
  errors: ComposerValidationIssue[],
) {
  if (!Array.isArray(block.payload.brackets) || block.payload.brackets.length === 0) {
    pushIssue(errors, {
      ruleId: rule.id,
      blockId: block.id,
      path: `${rule.id}.${block.id}.brackets`,
      severity: "error",
      code: "empty_brackets",
      message: "Progressive tax blocks need at least one bracket.",
    });
    return;
  }

  let previousThreshold = -Infinity;

  block.payload.brackets.forEach((bracket, index) => {
    const path = `${rule.id}.${block.id}.brackets.${index}`;

    if (!Number.isFinite(bracket.threshold) || !Number.isFinite(bracket.rate)) {
      pushIssue(errors, {
        ruleId: rule.id,
        blockId: block.id,
        path,
        severity: "error",
        code: "invalid_bracket",
        message: "Each progressive bracket needs numeric threshold and rate values.",
      });
      return;
    }

    if (bracket.threshold < 0) {
      pushIssue(errors, {
        ruleId: rule.id,
        blockId: block.id,
        path: `${path}.threshold`,
        severity: "error",
        code: "below_min",
        message: "Bracket thresholds cannot be negative.",
      });
    }

    if (bracket.rate < 0 || bracket.rate > 1) {
      pushIssue(errors, {
        ruleId: rule.id,
        blockId: block.id,
        path: `${path}.rate`,
        severity: "error",
        code: bracket.rate < 0 ? "below_min" : "above_max",
        message: "Bracket rates must stay between 0 and 1.",
      });
    }

    if (bracket.threshold <= previousThreshold) {
      pushIssue(errors, {
        ruleId: rule.id,
        blockId: block.id,
        path: `${rule.id}.${block.id}.brackets`,
        severity: "error",
        code: "invalid_bracket",
        message: "Progressive tax brackets must be sorted by increasing threshold.",
      });
    }

    previousThreshold = bracket.threshold;
  });
}

function validateBlockPayload(
  rule: ComposerRule,
  block: ComposerBlock,
  errors: ComposerValidationIssue[],
) {
  const definition = getComposerBlockDefinition(block.type, block.category);

  if (!definition || definition.category !== block.category) {
    pushIssue(errors, {
      ruleId: rule.id,
      blockId: block.id,
      path: `${rule.id}.${block.id}`,
      severity: "error",
      code: "invalid_payload",
      message: `Block "${block.type}" is not registered correctly.`,
    });
    return;
  }

  definition.parameters.forEach((parameter) => {
    const value = block.payload[parameter.key as keyof typeof block.payload];
    const path = `${rule.id}.${block.id}.${parameter.key}`;

    if (parameter.valueType === "number") {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        pushIssue(errors, {
          ruleId: rule.id,
          blockId: block.id,
          path,
          severity: "error",
          code: "invalid_payload",
          message: `${parameter.label} must be a valid number.`,
        });
        return;
      }

      if (parameter.min !== undefined && value < parameter.min) {
        pushIssue(errors, {
          ruleId: rule.id,
          blockId: block.id,
          path,
          severity: "error",
          code: "below_min",
          message: `${parameter.label} must be at least ${parameter.min}.`,
        });
      }

      if (parameter.max !== undefined && value > parameter.max) {
        pushIssue(errors, {
          ruleId: rule.id,
          blockId: block.id,
          path,
          severity: "error",
          code: "above_max",
          message: `${parameter.label} must be at most ${parameter.max}.`,
        });
      }
    }

    if (parameter.valueType === "select") {
      const isAllowed = parameter.options?.some((option) => option.value === value);

      if (!isAllowed) {
        pushIssue(errors, {
          ruleId: rule.id,
          blockId: block.id,
          path,
          severity: "error",
          code: "invalid_payload",
          message: `${parameter.label} must be one of the allowed options.`,
        });
      }
    }

    if (parameter.valueType === "boolean" && typeof value !== "boolean") {
      pushIssue(errors, {
        ruleId: rule.id,
        blockId: block.id,
        path,
        severity: "error",
        code: "invalid_payload",
        message: `${parameter.label} must be true or false.`,
      });
    }
  });

  if (block.category === "effect" && block.type === "progressiveTax") {
    validateBracketPayload(
      rule,
      block as ComposerEffectBlock & { payload: { brackets: PolicyBracket[] } },
      errors,
    );
  }

  if (
    definition.allowedRuleCadences &&
    !definition.allowedRuleCadences.includes(rule.cadence)
  ) {
    pushIssue(errors, {
      ruleId: rule.id,
      blockId: block.id,
      path: `${rule.id}.${block.id}.cadence`,
      severity: "error",
      code: "unsupported_cadence",
      message: `${definition.label} does not support ${rule.cadence} cadence.`,
    });
  }
}

export function validateComposerDocument(
  document: ComposerDocument,
): ValidateComposerResult {
  const errors: ComposerValidationIssue[] = [];
  const warnings: ComposerValidationIssue[] = [];

  if (document.rules.length === 0) {
    pushIssue(warnings, {
      path: "rules",
      severity: "warning",
      code: "empty_document",
      message: "Composer draft is empty. Only preset or raw policy rules will run.",
    });
  }

  const seenRuleIds = new Set<string>();

  document.rules.forEach((rule, ruleIndex) => {
    const rulePath = `rules.${ruleIndex}`;

    if (!rule.id.trim()) {
      pushIssue(errors, {
        ruleId: rule.id,
        path: `${rulePath}.id`,
        severity: "error",
        code: "duplicate_rule_id",
        message: "Each rule needs a non-empty id.",
      });
    } else if (seenRuleIds.has(rule.id)) {
      pushIssue(errors, {
        ruleId: rule.id,
        path: `${rulePath}.id`,
        severity: "error",
        code: "duplicate_rule_id",
        message: `Rule id "${rule.id}" is duplicated.`,
      });
    } else {
      seenRuleIds.add(rule.id);
    }

    if (!rule.name.trim()) {
      pushIssue(errors, {
        ruleId: rule.id,
        path: `${rulePath}.name`,
        severity: "error",
        code: "missing_rule_name",
        message: "Each rule needs a visible name.",
      });
    }

    const seenBlockIds = new Set<string>();
    const typeCounts = new Map<string, number>();
    let previousCategoryIndex = -1;

    rule.blocks.forEach((block, blockIndex) => {
      const currentCategoryIndex = CATEGORY_ORDER.indexOf(block.category);

      if (!block.id.trim()) {
        pushIssue(errors, {
          ruleId: rule.id,
          blockId: block.id,
          path: `${rulePath}.blocks.${blockIndex}.id`,
          severity: "error",
          code: "duplicate_block_id",
          message: "Each block needs a non-empty id.",
        });
      } else if (seenBlockIds.has(block.id)) {
        pushIssue(errors, {
          ruleId: rule.id,
          blockId: block.id,
          path: `${rulePath}.blocks.${blockIndex}.id`,
          severity: "error",
          code: "duplicate_block_id",
          message: `Block id "${block.id}" is duplicated inside the rule.`,
        });
      } else {
        seenBlockIds.add(block.id);
      }

      if (currentCategoryIndex < previousCategoryIndex) {
        pushIssue(errors, {
          ruleId: rule.id,
          blockId: block.id,
          path: `${rulePath}.blocks`,
          severity: "error",
          code: "invalid_order",
          message:
            "Blocks must stay ordered as target -> condition -> effect -> modifier.",
        });
      }

      previousCategoryIndex = Math.max(previousCategoryIndex, currentCategoryIndex);
      typeCounts.set(block.type, (typeCounts.get(block.type) ?? 0) + 1);
      validateBlockPayload(rule, block, errors);
    });

    const targets = rule.blocks.filter(
      (block): block is ComposerTargetBlock => block.category === "target",
    );
    const effects = rule.blocks.filter(
      (block): block is ComposerEffectBlock => block.category === "effect",
    );

    if (targets.length === 0) {
      pushIssue(errors, {
        ruleId: rule.id,
        path: `${rulePath}.blocks`,
        severity: "error",
        code: "missing_target",
        message: "Each rule needs exactly one target block.",
      });
    }

    if (targets.length > 1) {
      pushIssue(errors, {
        ruleId: rule.id,
        path: `${rulePath}.blocks`,
        severity: "error",
        code: "multiple_targets",
        message: "Only one target block is allowed per rule.",
      });
    }

    if (effects.length === 0) {
      pushIssue(errors, {
        ruleId: rule.id,
        path: `${rulePath}.blocks`,
        severity: "error",
        code: "missing_effect",
        message: "Each rule needs at least one effect block.",
      });
    }

    rule.blocks.forEach((block) => {
      const definition = getComposerBlockDefinition(block.type, block.category);

      if (
        definition?.allowsMultiplePerRule === false &&
        (typeCounts.get(block.type) ?? 0) > 1
      ) {
        pushIssue(errors, {
          ruleId: rule.id,
          blockId: block.id,
          path: `${rule.id}.${block.id}`,
          severity: "error",
          code: "unsupported_combination",
          message: `${definition.label} can only appear once in the same rule.`,
        });
      }
    });

    if (!rule.enabled) {
      pushIssue(warnings, {
        ruleId: rule.id,
        path: rulePath,
        severity: "warning",
        code: "unsupported_combination",
        message: `"${rule.name}" is disabled and will not affect the run.`,
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
