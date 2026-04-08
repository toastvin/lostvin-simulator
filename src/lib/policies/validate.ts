import { getPolicyTypeDefinition, supportsCadence } from "@/lib/policies/metadata";
import type {
  Policy,
  PolicyBracket,
  PolicyValidationIssue,
  ValidatePoliciesResult,
} from "@/types/policies";

function pushIssue(
  issues: PolicyValidationIssue[],
  issue: PolicyValidationIssue,
) {
  issues.push(issue);
}

function validateBracketArray(
  policy: Extract<Policy, { type: "progressiveTax" }>,
  errors: PolicyValidationIssue[],
) {
  if (policy.brackets.length === 0) {
    pushIssue(errors, {
      policyId: policy.id,
      path: `${policy.id}.brackets`,
      severity: "error",
      code: "empty_brackets",
      message: "Progressive Tax requires at least one bracket.",
    });
    return;
  }

  let previousThreshold = -Infinity;

  policy.brackets.forEach((bracket: PolicyBracket, index) => {
    const path = `${policy.id}.brackets.${index}`;

    if (!Number.isFinite(bracket.threshold) || !Number.isFinite(bracket.rate)) {
      pushIssue(errors, {
        policyId: policy.id,
        path,
        severity: "error",
        code: "invalid_bracket",
        message: "Each bracket needs a numeric threshold and rate.",
      });
      return;
    }

    if (bracket.threshold < 0) {
      pushIssue(errors, {
        policyId: policy.id,
        path: `${path}.threshold`,
        severity: "error",
        code: "below_min",
        message: "Bracket thresholds cannot be negative.",
      });
    }

    if (bracket.rate < 0 || bracket.rate > 1) {
      pushIssue(errors, {
        policyId: policy.id,
        path: `${path}.rate`,
        severity: "error",
        code: bracket.rate < 0 ? "below_min" : "above_max",
        message: "Bracket rates must stay between 0 and 1.",
      });
    }

    if (bracket.threshold <= previousThreshold) {
      pushIssue(errors, {
        policyId: policy.id,
        path: `${policy.id}.brackets`,
        severity: "error",
        code: "unsorted_brackets",
        message: "Progressive tax brackets must be ordered by increasing threshold.",
      });
    }

    previousThreshold = bracket.threshold;
  });
}

export function validatePolicies(policies: Policy[]): ValidatePoliciesResult {
  const errors: PolicyValidationIssue[] = [];
  const warnings: PolicyValidationIssue[] = [];
  const seenIds = new Set<string>();

  policies.forEach((policy) => {
    if (!policy.id.trim()) {
      pushIssue(errors, {
        policyId: policy.id,
        path: `${policy.type}.id`,
        severity: "error",
        code: "required",
        message: `${getPolicyTypeDefinition(policy.type).label} needs an id.`,
      });
    } else if (seenIds.has(policy.id)) {
      pushIssue(errors, {
        policyId: policy.id,
        path: `${policy.id}.id`,
        severity: "error",
        code: "duplicate_id",
        message: `Policy id "${policy.id}" is duplicated.`,
      });
    } else {
      seenIds.add(policy.id);
    }

    if (!supportsCadence(policy.type, policy.cadence)) {
      pushIssue(errors, {
        policyId: policy.id,
        path: `${policy.id}.cadence`,
        severity: "error",
        code: "unsupported_cadence",
        message: `${getPolicyTypeDefinition(policy.type).label} does not support ${policy.cadence} cadence.`,
      });
    }

    const definition = getPolicyTypeDefinition(policy.type);
    definition.parameters.forEach((parameter) => {
      if (parameter.valueType === "brackets") {
        if (policy.type === "progressiveTax") {
          validateBracketArray(policy, errors);
        }
        return;
      }

      const value = policy[parameter.key as keyof Policy];

      if (typeof value !== "number" || !Number.isFinite(value)) {
        pushIssue(errors, {
          policyId: policy.id,
          path: `${policy.id}.${parameter.key}`,
          severity: "error",
          code: "invalid_number",
          message: `${parameter.label} must be a valid number.`,
        });
        return;
      }

      if (parameter.min !== undefined && value < parameter.min) {
        pushIssue(errors, {
          policyId: policy.id,
          path: `${policy.id}.${parameter.key}`,
          severity: "error",
          code: "below_min",
          message: `${parameter.label} must be at least ${parameter.min}.`,
        });
      }

      if (parameter.max !== undefined && value > parameter.max) {
        pushIssue(errors, {
          policyId: policy.id,
          path: `${policy.id}.${parameter.key}`,
          severity: "error",
          code: "above_max",
          message: `${parameter.label} must be at most ${parameter.max}.`,
        });
      }
    });

    if (!policy.enabled) {
      pushIssue(warnings, {
        policyId: policy.id,
        path: `${policy.id}.enabled`,
        severity: "warning",
        code: "required",
        message: `${getPolicyTypeDefinition(policy.type).label} is currently disabled and will not affect the run.`,
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
