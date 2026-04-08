import {
  type ConfigFieldDefinition,
  type ValidateConfigResult,
  type ValidationIssue,
  type SimulationConfig,
} from "@/types/config";
import {
  deriveEventCounts,
  deriveEventGridDimensions,
} from "@/lib/simulation/events";

function pushIssue(
  issues: ValidationIssue[],
  issue: ValidationIssue,
) {
  issues.push(issue);
}

export function validateConfig(
  config: SimulationConfig,
  definitions: ConfigFieldDefinition[],
): ValidateConfigResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  definitions
    .filter((field) => field.scope === "simulation")
    .forEach((field) => {
      const pathSegments = field.targetPath.split(".");
      let value: unknown = config as unknown;

      for (const segment of pathSegments) {
        if (
          typeof value !== "object" ||
          value === null ||
          !(segment in value)
        ) {
          pushIssue(errors, {
            fieldId: field.id,
            path: field.targetPath,
            severity: "error",
            code: "required",
            message: `${field.label} is missing.`,
          });
          return;
        }

        value = (value as Record<string, unknown>)[segment];
      }

      if (field.valueType === "number" && typeof value === "number") {
        if (field.min !== undefined && value < field.min) {
          pushIssue(errors, {
            fieldId: field.id,
            path: field.targetPath,
            severity: "error",
            code: "range",
            message: `${field.label} must be greater than or equal to ${field.min}.`,
          });
        }

        if (field.max !== undefined && value > field.max) {
          pushIssue(errors, {
            fieldId: field.id,
            path: field.targetPath,
            severity: "error",
            code: "range",
            message: `${field.label} must be less than or equal to ${field.max}.`,
          });
        }
      }

      if (field.valueType === "select" && typeof value === "string") {
        const valid = field.options.some((option) => option.value === value);
        if (!valid) {
          pushIssue(errors, {
            fieldId: field.id,
            path: field.targetPath,
            severity: "error",
            code: "option",
            message: `${field.label} has an unsupported option.`,
          });
        }
      }
    });

  if (config.population.wealthFloor > config.population.initialWealth) {
    pushIssue(errors, {
      severity: "error",
      code: "cross_field",
      message: "wealthFloor cannot exceed initialWealth.",
    });
  }

  if (config.arena.width <= config.population.agentRadius * 2) {
    pushIssue(errors, {
      severity: "error",
      code: "cross_field",
      message: "Arena width must be greater than twice the agent radius.",
    });
  }

  if (config.arena.height <= config.population.agentRadius * 2) {
    pushIssue(errors, {
      severity: "error",
      code: "cross_field",
      message: "Arena height must be greater than twice the agent radius.",
    });
  }

  const eventGrid = deriveEventGridDimensions(
    config.arena.width,
    config.arena.height,
    config.events.gridRingCount,
  );
  const { luckNodeCount, badLuckNodeCount } = deriveEventCounts(
    config.events.luckSharePercent,
    eventGrid.totalNodeCount,
  );

  if (config.events.gridRingCount > eventGrid.maxGridRingCount) {
    pushIssue(errors, {
      severity: "error",
      code: "cross_field",
      message: `Event Grid Rings cannot exceed ${eventGrid.maxGridRingCount} for the current arena size.`,
    });
  }

  if (config.economy.yearInterval < 1) {
    pushIssue(errors, {
      severity: "error",
      code: "cross_field",
      message: "yearInterval must be at least 1.",
    });
  }

  if (config.population.agentCount > 3000) {
    pushIssue(warnings, {
      severity: "warning",
      code: "cross_field",
      message:
        "Large agent counts may reduce interactivity before the canvas engine is optimized.",
    });
  }

  if (eventGrid.totalNodeCount > 300) {
    pushIssue(warnings, {
      severity: "warning",
      code: "cross_field",
      message:
        "Large event grids increase collision density and may make the scene harder to read.",
    });
  }

  if (badLuckNodeCount === 0) {
    pushIssue(warnings, {
      severity: "warning",
      code: "cross_field",
      message:
        "With zero bad luck nodes, baseline inequality dynamics may be less visible.",
    });
  }

  if (luckNodeCount === 0) {
    pushIssue(warnings, {
      severity: "warning",
      code: "cross_field",
      message:
        "With zero green dots, the model becomes pure loss exposure and upside events disappear.",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
