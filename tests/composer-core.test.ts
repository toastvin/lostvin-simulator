import { describe, expect, it } from "vitest";

import {
  CURRENT_SCHEMA_VERSION,
  getConfigFieldDefinitions,
} from "@/lib/config/fields";
import { createDefaultConfig } from "@/lib/config/defaults";
import { applyComposerRules } from "@/lib/composer/applyComposer";
import { compileComposerDocument } from "@/lib/composer/compile";
import { importPoliciesToComposer } from "@/lib/composer/import";
import { validateComposerDocument } from "@/lib/composer/validate";
import { applyPolicies } from "@/lib/policies/applyPolicies";
import { initializeSimulationState } from "@/lib/simulation/initialize";
import type { Agent } from "@/types/simulation";
import type { ComposerDocument } from "@/types/composer";
import type { Policy } from "@/types/policies";

function createConfig() {
  return createDefaultConfig(
    getConfigFieldDefinitions(),
    CURRENT_SCHEMA_VERSION,
  );
}

describe("composer core", () => {
  it("imports existing policies into a valid composer document", () => {
    const policies: Policy[] = [
      {
        id: "ubi-yearly",
        type: "basicIncome",
        enabled: true,
        amount: 8,
        cadence: "year",
      },
      {
        id: "wealth-tax",
        type: "wealthTax",
        enabled: true,
        threshold: 250,
        rate: 0.06,
        cadence: "year",
      },
    ];

    const imported = importPoliciesToComposer(policies);
    const validation = validateComposerDocument(imported.document);
    const compiled = compileComposerDocument(imported.document);

    expect(imported.warnings).toHaveLength(0);
    expect(validation.valid).toBe(true);
    expect(compiled.compiledRules).toHaveLength(2);
    expect(compiled.compiledRules[0].target.kind).toBe("allAgents");
  });

  it("rejects invalid composer drafts", () => {
    const document: ComposerDocument = {
      version: 1,
      rules: [
        {
          id: "rule-1",
          name: "",
          enabled: true,
          cadence: "step",
          blocks: [
            {
              id: "allAgents-1",
              category: "target",
              type: "allAgents",
              payload: {},
            },
          ],
        },
      ],
    };

    const result = validateComposerDocument(document);

    expect(result.valid).toBe(false);
    expect(
      result.errors.some((issue) => issue.code === "missing_rule_name"),
    ).toBe(true);
    expect(result.errors.some((issue) => issue.code === "missing_effect")).toBe(
      true,
    );
  });

  it("applies visual composer grants with targeting and modifiers", () => {
    const config = createConfig();
    const state = initializeSimulationState(55, config);
    state.agents = state.agents.slice(0, 3).map((agent, index) => ({
      ...agent,
      wealth: [10, 20, 200][index],
      talent: [0.9, 0.5, 0.2][index],
      bankruptCount: [2, 0, 0][index],
      rescuedCount: 0,
    }));

    const document: ComposerDocument = {
      version: 1,
      rules: [
        {
          id: "rescue-priority",
          name: "Rescue Priority",
          enabled: true,
          cadence: "step",
          blocks: [
            {
              id: "allAgents-1",
              category: "target",
              type: "allAgents",
              payload: {},
            },
            {
              id: "wealthBelow-1",
              category: "condition",
              type: "wealthBelow",
              payload: { threshold: 50 },
            },
            {
              id: "grantAmount-1",
              category: "effect",
              type: "grantAmount",
              payload: { amount: 20 },
            },
            {
              id: "maxRecipients-1",
              category: "modifier",
              type: "maxRecipients",
              payload: { count: 1 },
            },
            {
              id: "priorityScoreWeight-1",
              category: "modifier",
              type: "priorityScoreWeight",
              payload: {
                talentWeight: 1,
                wealthWeight: -2,
                bankruptWeight: 2,
              },
            },
          ],
        },
      ],
    };

    const compiled = compileComposerDocument(document);
    const result = applyComposerRules(
      state.agents,
      compiled.compiledRules,
      config,
      1,
    );

    expect(result.agents[0].wealth).toBe(30);
    expect(result.agents[1].wealth).toBe(20);
    expect(result.summary.netCost).toBe(20);
    expect(result.summary.appliedPolicyIds).toContain("rescue-priority");
  });

  it("preserves bailout trigger semantics when importing legacy policies", () => {
    const config = createConfig();
    const agents: Agent[] = initializeSimulationState(77, config)
      .agents.slice(0, 3)
      .map((agent, index) => ({
        ...agent,
        wealth: [15, 14.5, 20][index],
        rescuedCount: [0, 1, 0][index],
        lastWealthDelta: 0,
      }));
    const policies: Policy[] = [
      {
        id: "bailout-threshold",
        type: "bailout",
        enabled: true,
        triggerWealth: 15,
        amount: 7,
        maxPerAgent: 2,
        cadence: "step",
      },
    ];

    const imported = importPoliciesToComposer(policies);
    const compiled = compileComposerDocument(imported.document);
    const legacyResult = applyPolicies(agents, policies, config, 1);
    const composerResult = applyComposerRules(
      agents,
      compiled.compiledRules,
      config,
      1,
    );

    expect(imported.warnings).toHaveLength(0);
    expect(legacyResult.agents).toEqual(composerResult.agents);
    expect({
      netCost: composerResult.summary.netCost,
      grossSpend: composerResult.summary.grossSpend,
      grossRevenue: composerResult.summary.grossRevenue,
    }).toEqual({
      netCost: legacyResult.summary.netCost,
      grossSpend: legacyResult.summary.grossSpend,
      grossRevenue: legacyResult.summary.grossRevenue,
    });
  });
});
