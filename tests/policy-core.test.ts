import { describe, expect, it } from "vitest";

import {
  CURRENT_SCHEMA_VERSION,
  getConfigFieldDefinitions,
} from "@/lib/config/fields";
import { createDefaultConfig } from "@/lib/config/defaults";
import { applyPolicies } from "@/lib/policies/applyPolicies";
import {
  createDefaultPolicy,
  createPolicyId,
  getPolicyTypeDefinitions,
  supportsCadence,
} from "@/lib/policies/metadata";
import { getPolicyPresets } from "@/lib/policies/presets";
import { validatePolicies } from "@/lib/policies/validate";
import { initializeSimulationState } from "@/lib/simulation/initialize";
import { stepSimulation } from "@/lib/simulation/step";
import type { Policy } from "@/types/policies";

function createConfig() {
  return createDefaultConfig(
    getConfigFieldDefinitions(),
    CURRENT_SCHEMA_VERSION,
  );
}

describe("policy core", () => {
  it("returns no-op when policies are disabled", () => {
    const config = createConfig();
    const state = initializeSimulationState(7, config);
    const result = applyPolicies(
      state.agents,
      [
        {
          id: "off-ubi",
          type: "basicIncome",
          enabled: false,
          amount: 10,
          cadence: "step",
        },
      ],
      config,
      1,
    );

    expect(result.agents).toBe(state.agents);
    expect(result.summary.netCost).toBe(0);
    expect(result.summary.appliedPolicyIds).toHaveLength(0);
  });

  it("applies basic income as positive net cost", () => {
    const config = createConfig();
    const state = initializeSimulationState(9, config);
    const result = applyPolicies(
      state.agents,
      [
        {
          id: "ubi-step",
          type: "basicIncome",
          enabled: true,
          amount: 10,
          cadence: "step",
        },
      ],
      config,
      1,
    );

    expect(result.agents[0].wealth).toBe(state.agents[0].wealth + 10);
    expect(result.summary.netCost).toBe(10 * state.agents.length);
  });

  it("reduces top wealth with wealth tax", () => {
    const config = createConfig();
    const state = initializeSimulationState(11, config);
    state.agents = state.agents.slice(0, 2).map((agent, index) => ({
      ...agent,
      wealth: index === 0 ? 500 : 50,
    }));

    const result = applyPolicies(
      state.agents,
      [
        {
          id: "wealth-tax",
          type: "wealthTax",
          enabled: true,
          threshold: 100,
          rate: 0.1,
          cadence: "year",
        },
      ],
      config,
      config.economy.yearInterval,
    );

    expect(result.agents[0].wealth).toBe(460);
    expect(result.agents[1].wealth).toBe(50);
    expect(result.summary.netCost).toBe(-40);
  });

  it("applies bailout only under threshold and limit", () => {
    const config = createConfig();
    const state = initializeSimulationState(13, config);
    state.agents = state.agents.slice(0, 2).map((agent, index) => ({
      ...agent,
      wealth: index === 0 ? 0 : 30,
      rescuedCount: index === 0 ? 0 : 5,
    }));

    const result = applyPolicies(
      state.agents,
      [
        {
          id: "bailout",
          type: "bailout",
          enabled: true,
          triggerWealth: 0,
          amount: 12,
          maxPerAgent: 2,
          cadence: "step",
        },
      ],
      config,
      1,
    );

    expect(result.agents[0].wealth).toBe(12);
    expect(result.agents[0].rescuedCount).toBe(1);
    expect(result.agents[1].wealth).toBe(30);
  });

  it("targets talent grants to high-talent low-wealth agents", () => {
    const config = createConfig();
    const state = initializeSimulationState(15, config);
    state.agents = state.agents.slice(0, 2).map((agent, index) => ({
      ...agent,
      talent: index === 0 ? 0.9 : 0.4,
      wealth: index === 0 ? 50 : 50,
    }));

    const result = applyPolicies(
      state.agents,
      [
        {
          id: "talent-grant",
          type: "talentGrant",
          enabled: true,
          talentThreshold: 0.8,
          wealthCeiling: 60,
          amount: 25,
          cadence: "year",
        },
      ],
      config,
      config.economy.yearInterval,
    );

    expect(result.agents[0].wealth).toBe(75);
    expect(result.agents[1].wealth).toBe(50);
  });

  it("honors yearly cadence inside stepSimulation", () => {
    const config = createConfig();
    const state = initializeSimulationState(17, config);
    const yearlyPolicy: Policy[] = [
      {
        id: "yearly-ubi",
        type: "basicIncome",
        enabled: true,
        amount: 5,
        cadence: "year",
      },
    ];

    const firstStep = stepSimulation(state, config, yearlyPolicy);
    expect(firstStep.lastPolicyCost).toBe(0);

    let current = state;
    for (let step = 0; step < config.economy.yearInterval; step += 1) {
      current = stepSimulation(current, config, yearlyPolicy);
    }

    expect(current.lastPolicyCost).toBe(5 * current.agents.length);
  });

  it("exposes metadata and presets for later UI phases", () => {
    const definitions = getPolicyTypeDefinitions();
    const presets = getPolicyPresets();

    expect(definitions.some((definition) => definition.type === "basicIncome")).toBe(
      true,
    );
    expect(supportsCadence("wealthTax", "year")).toBe(true);
    expect(supportsCadence("wealthTax", "step")).toBe(false);
    expect(createDefaultPolicy("bankruptcyFloor").type).toBe("bankruptcyFloor");
    expect(presets.map((preset) => preset.id)).toContain("laissez-faire");
    expect(presets.map((preset) => preset.id)).toContain(
      "balanced-welfare-state",
    );
  });

  it("creates unique ids for newly added rule-builder policies", () => {
    const policies: Policy[] = [
      createDefaultPolicy("basicIncome", "basicIncome-1"),
      createDefaultPolicy("basicIncome", "basicIncome-2"),
    ];

    expect(createPolicyId("basicIncome", policies)).toBe("basicIncome-3");
  });

  it("rejects invalid policy drafts", () => {
    const result = validatePolicies([
      {
        id: "broken-tax",
        type: "wealthTax",
        enabled: true,
        threshold: -10,
        rate: 1.5,
        cadence: "year",
      },
      {
        id: "broken-progressive",
        type: "progressiveTax",
        enabled: true,
        cadence: "year",
        brackets: [
          { threshold: 200, rate: 0.05 },
          { threshold: 100, rate: 0.1 },
        ],
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.some((issue) => issue.code === "below_min")).toBe(true);
    expect(result.errors.some((issue) => issue.code === "above_max")).toBe(true);
    expect(
      result.errors.some((issue) => issue.code === "unsorted_brackets"),
    ).toBe(true);
  });
});
