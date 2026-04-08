import {
  type MigrateConfigResult,
  type MigrationNote,
} from "@/types/config";

import { CURRENT_SCHEMA_VERSION } from "./fields";
import { isRecord } from "./path";

function coerceFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function migrateConfig(input: unknown): MigrateConfigResult {
  if (!isRecord(input)) {
    return {
      input: {},
      notes: [
        {
          fromVersion: null,
          toVersion: CURRENT_SCHEMA_VERSION,
          message: "Non-object input ignored. Falling back to defaults.",
        },
      ],
    };
  }

  const schemaVersion = input.schemaVersion;
  const fromVersion =
    typeof schemaVersion === "number" && Number.isFinite(schemaVersion)
      ? schemaVersion
      : null;

  const notes: MigrationNote[] = [];

  if (fromVersion === null) {
    notes.push({
      fromVersion,
      toVersion: CURRENT_SCHEMA_VERSION,
      message: "schemaVersion missing. Treating input as legacy config.",
    });
  } else if (fromVersion !== CURRENT_SCHEMA_VERSION) {
    notes.push({
      fromVersion,
      toVersion: CURRENT_SCHEMA_VERSION,
      message: "Schema version changed. Unknown fields will be ignored.",
    });
  }

  const migratedInput = { ...input };

  if (isRecord(migratedInput.events) && migratedInput.events.luckSharePercent === undefined) {
    const luckNodeCount = coerceFiniteNumber(migratedInput.events.luckNodeCount);
    const badLuckNodeCount = coerceFiniteNumber(
      migratedInput.events.badLuckNodeCount,
    );

    if (luckNodeCount !== null || badLuckNodeCount !== null) {
      const totalNodeCount = Math.max(
        0,
        (luckNodeCount ?? 0) + (badLuckNodeCount ?? 0),
      );

      migratedInput.events = {
        ...migratedInput.events,
        luckSharePercent:
          totalNodeCount > 0 ? (Math.max(luckNodeCount ?? 0, 0) / totalNodeCount) * 100 : 40,
      };
      notes.push({
        fromVersion,
        toVersion: CURRENT_SCHEMA_VERSION,
        message:
          "Legacy luck/bad luck counts were converted to a green-dot share percentage.",
      });
    }
  }

  return {
    input: { ...migratedInput, schemaVersion: CURRENT_SCHEMA_VERSION },
    notes,
  };
}
