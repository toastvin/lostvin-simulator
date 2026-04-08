import {
  type ConfigFieldDefinition,
  type ConfigValuePrimitive,
  type NormalizeConfigResult,
  type NormalizeIssue,
  type SimulationConfig,
} from "@/types/config";

import { createDefaultConfig } from "./defaults";
import { getAtPath, setAtPath } from "./path";

function pushIssue(
  issues: NormalizeIssue[],
  fieldId: string,
  path: string,
  code: NormalizeIssue["code"],
  input: unknown,
  output: ConfigValuePrimitive,
) {
  issues.push({
    fieldId,
    path,
    code,
    input,
    output,
  });
}

function coerceToNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function coerceToBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === 1 || value === "1" || value === "true") {
    return true;
  }

  if (value === 0 || value === "0" || value === "false") {
    return false;
  }

  return null;
}

function normalizeNumberField(
  field: Extract<ConfigFieldDefinition, { valueType: "number" }>,
  rawValue: unknown,
  issues: NormalizeIssue[],
): number {
  if (rawValue === undefined) {
    pushIssue(
      issues,
      field.id,
      field.targetPath,
      "missing",
      rawValue,
      field.defaultValue,
    );
    return field.defaultValue;
  }

  const coerced = coerceToNumber(rawValue);
  if (coerced === null) {
    pushIssue(
      issues,
      field.id,
      field.targetPath,
      "invalid_type",
      rawValue,
      field.defaultValue,
    );
    return field.defaultValue;
  }

  let normalized = coerced;
  if (rawValue !== coerced) {
    pushIssue(
      issues,
      field.id,
      field.targetPath,
      "coerced",
      rawValue,
      coerced,
    );
  }

  if (field.normalize?.clamp) {
    if (field.min !== undefined && normalized < field.min) {
      normalized = field.min;
      pushIssue(
        issues,
        field.id,
        field.targetPath,
        "below_min",
        rawValue,
        normalized,
      );
    }

    if (field.max !== undefined && normalized > field.max) {
      normalized = field.max;
      pushIssue(
        issues,
        field.id,
        field.targetPath,
        "above_max",
        rawValue,
        normalized,
      );
    }
  }

  if (field.integer) {
    const rounded = Math.round(normalized);
    if (rounded !== normalized) {
      normalized = rounded;
      pushIssue(
        issues,
        field.id,
        field.targetPath,
        "rounded_to_step",
        rawValue,
        normalized,
      );
    }
  } else if (field.normalize?.roundToStep && field.step) {
    const rounded =
      Math.round(normalized / field.step) * field.step;
    if (rounded !== normalized) {
      normalized = rounded;
      pushIssue(
        issues,
        field.id,
        field.targetPath,
        "rounded_to_step",
        rawValue,
        normalized,
      );
    }
  }

  if (field.normalize?.precision !== undefined) {
    normalized = Number(normalized.toFixed(field.normalize.precision));
  }

  return normalized;
}

function normalizeBooleanField(
  field: Extract<ConfigFieldDefinition, { valueType: "boolean" }>,
  rawValue: unknown,
  issues: NormalizeIssue[],
): boolean {
  if (rawValue === undefined) {
    pushIssue(
      issues,
      field.id,
      field.targetPath,
      "missing",
      rawValue,
      field.defaultValue,
    );
    return field.defaultValue;
  }

  const coerced = coerceToBoolean(rawValue);
  if (coerced === null) {
    pushIssue(
      issues,
      field.id,
      field.targetPath,
      "invalid_type",
      rawValue,
      field.defaultValue,
    );
    return field.defaultValue;
  }

  if (coerced !== rawValue) {
    pushIssue(
      issues,
      field.id,
      field.targetPath,
      "coerced",
      rawValue,
      coerced,
    );
  }

  return coerced;
}

function normalizeSelectField(
  field: Extract<ConfigFieldDefinition, { valueType: "select" }>,
  rawValue: unknown,
  issues: NormalizeIssue[],
): string {
  if (rawValue === undefined) {
    pushIssue(
      issues,
      field.id,
      field.targetPath,
      "missing",
      rawValue,
      field.defaultValue,
    );
    return field.defaultValue;
  }

  if (typeof rawValue !== "string") {
    pushIssue(
      issues,
      field.id,
      field.targetPath,
      "invalid_type",
      rawValue,
      field.defaultValue,
    );
    return field.defaultValue;
  }

  const valid = field.options.some((option) => option.value === rawValue);
  if (!valid) {
    pushIssue(
      issues,
      field.id,
      field.targetPath,
      "invalid_option",
      rawValue,
      field.defaultValue,
    );
    return field.defaultValue;
  }

  return rawValue;
}

export function normalizeConfig(
  input: unknown,
  definitions: ConfigFieldDefinition[],
  schemaVersion: number,
): NormalizeConfigResult {
  const issues: NormalizeIssue[] = [];
  const root = createDefaultConfig(definitions, schemaVersion) as Record<
    string,
    unknown
  >;

  definitions
    .filter((field) => field.scope === "simulation")
    .forEach((field) => {
      const rawValue = getAtPath(input, field.targetPath);

      if (field.valueType === "number") {
        const normalized = normalizeNumberField(field, rawValue, issues);
        setAtPath(root, field.targetPath, normalized);
        return;
      }

      if (field.valueType === "boolean") {
        const normalized = normalizeBooleanField(field, rawValue, issues);
        setAtPath(root, field.targetPath, normalized);
        return;
      }

      const normalized = normalizeSelectField(field, rawValue, issues);
      setAtPath(root, field.targetPath, normalized);
    });

  root.schemaVersion = schemaVersion;

  return {
    config: root as SimulationConfig,
    issues,
  };
}
