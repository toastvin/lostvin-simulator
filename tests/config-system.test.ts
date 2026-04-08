import { describe, expect, it } from "vitest";

import {
  CURRENT_SCHEMA_VERSION,
  getConfigFieldDefinitions,
} from "@/lib/config/fields";
import { createDefaultConfig } from "@/lib/config/defaults";
import { migrateConfig } from "@/lib/config/migrate";
import { normalizeConfig } from "@/lib/config/normalize";
import { validateConfig } from "@/lib/config/validate";

describe("config registry system", () => {
  it("creates a valid default config from field definitions", () => {
    const definitions = getConfigFieldDefinitions();
    const config = createDefaultConfig(definitions, CURRENT_SCHEMA_VERSION);
    const validation = validateConfig(config, definitions);

    expect(config.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(config.population.agentCount).toBe(1000);
    expect(config.events.gridRingCount).toBe(5);
    expect(config.events.luckSharePercent).toBe(40);
    expect(validation.valid).toBe(true);
  });

  it("migrates legacy event counts into a green-dot share percent", () => {
    const migrated = migrateConfig({
      schemaVersion: 1,
      events: {
        luckNodeCount: 80,
        badLuckNodeCount: 120,
      },
    });

    expect(migrated.input.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(
      (migrated.input.events as { luckSharePercent?: number }).luckSharePercent,
    ).toBe(40);
  });

  it("normalizes missing, coerced, clamped, and invalid option values", () => {
    const definitions = getConfigFieldDefinitions();
    const result = normalizeConfig(
      {
        population: {
          agentCount: "5200",
        },
        movement: {
          speedProfile: "warp",
        },
        economy: {
          capitalReturnBase: "-1",
        },
      },
      definitions,
      CURRENT_SCHEMA_VERSION,
    );

    expect(result.config.population.agentCount).toBe(5000);
    expect(result.config.movement.speedProfile).toBe("normal");
    expect(result.config.economy.capitalReturnBase).toBe(0);
    expect(result.issues.some((issue) => issue.code === "coerced")).toBe(true);
    expect(
      result.issues.some((issue) => issue.code === "invalid_option"),
    ).toBe(true);
    expect(result.issues.some((issue) => issue.code === "above_max")).toBe(
      true,
    );
    expect(result.issues.some((issue) => issue.code === "below_min")).toBe(
      true,
    );
  });

  it("catches cross-field validation errors", () => {
    const definitions = getConfigFieldDefinitions();
    const config = createDefaultConfig(definitions, CURRENT_SCHEMA_VERSION);
    config.population.wealthFloor = 200;
    config.population.initialWealth = 100;

    const validation = validateConfig(config, definitions);

    expect(validation.valid).toBe(false);
    expect(
      validation.errors.some((issue) =>
        issue.message.includes("wealthFloor cannot exceed initialWealth"),
      ),
    ).toBe(true);
  });
});
