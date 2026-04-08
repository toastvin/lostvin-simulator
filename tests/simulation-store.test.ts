import { describe, expect, it } from "vitest";

import {
  createSimulationStore,
  DEFAULT_SIMULATION_SEED,
  getDraftConfigValue,
} from "@/store/simulationStore";
import { importPhase10CanvasToConnectedCanvas } from "@/lib/connected-canvas/import-from-phase10";
import { createConnectedCanvasPortId } from "@/lib/connected-canvas/defaults";
import { importPoliciesToComposer } from "@/lib/composer/import";
import { importComposerToCanvas } from "@/lib/composer-canvas/import";
import type { ComposerDocument } from "@/types/composer";
import type { Policy } from "@/types/policies";

const EDITOR_EQUIVALENCE_AGENT_COUNT = 96;
const EDITOR_EQUIVALENCE_STEPS = 25;

function configureEditorEquivalenceStore(seed: number) {
  const store = createSimulationStore(seed);
  store
    .getState()
    .setDraftConfigValue("agentCount", EDITOR_EQUIVALENCE_AGENT_COUNT);
  return store;
}

function captureComparableOutcome(
  store: ReturnType<typeof createSimulationStore>,
) {
  const state = store.getState();

  return {
    runtimeStep: state.runtimeStep,
    runtimePolicyCost: state.runtimePolicyCost,
    agents: state.agents,
    events: state.events,
    metrics: state.metrics,
    metricsHistory: state.metricsHistory,
    statsSnapshot: state.statsSnapshot,
    comparisonSnapshot: state.comparisonSnapshot,
    comparisonHistory: state.comparisonHistory,
  };
}

function runPoliciesEditorPath(seed: number, policies: Policy[]) {
  const store = configureEditorEquivalenceStore(seed);
  store.getState().setPoliciesDraft(structuredClone(policies));

  expect(store.getState().applyDraftAndReset(seed)).toBe(true);
  store.getState().advanceSimulation(EDITOR_EQUIVALENCE_STEPS);

  return captureComparableOutcome(store);
}

function runComposerEditorPath(seed: number, policies: Policy[]) {
  const store = configureEditorEquivalenceStore(seed);
  const imported = importPoliciesToComposer(structuredClone(policies));

  expect(imported.warnings).toHaveLength(0);
  store.getState().setComposerDraft(imported.document);
  expect(store.getState().applyDraftAndReset(seed)).toBe(true);
  store.getState().advanceSimulation(EDITOR_EQUIVALENCE_STEPS);

  return captureComparableOutcome(store);
}

function runCanvasEditorPath(seed: number, policies: Policy[]) {
  const store = configureEditorEquivalenceStore(seed);
  const imported = importPoliciesToComposer(structuredClone(policies));
  const canvas = importComposerToCanvas(imported.document).document;

  expect(imported.warnings).toHaveLength(0);
  store.getState().setCanvasDraft(canvas);
  expect(store.getState().applyDraftAndReset(seed)).toBe(true);
  store.getState().advanceSimulation(EDITOR_EQUIVALENCE_STEPS);

  return captureComparableOutcome(store);
}

function runConnectedCanvasEditorPath(seed: number, policies: Policy[]) {
  const store = configureEditorEquivalenceStore(seed);
  const imported = importPoliciesToComposer(structuredClone(policies));
  const canvas = importComposerToCanvas(imported.document).document;
  const connected = importPhase10CanvasToConnectedCanvas(canvas).document;

  expect(imported.warnings).toHaveLength(0);
  store.getState().setConnectedCanvasDraft(connected);
  expect(store.getState().applyDraftAndReset(seed)).toBe(true);
  store.getState().advanceSimulation(EDITOR_EQUIVALENCE_STEPS);

  return captureComparableOutcome(store);
}

describe("simulation store", () => {
  it("produces the same initial population for the same seed", () => {
    const store = createSimulationStore(DEFAULT_SIMULATION_SEED);
    const firstState = store.getState();
    const firstAgents = firstState.agents.slice(0, 3);
    const firstEvents = firstState.events.slice(0, 3);

    store.getState().resetSimulation(DEFAULT_SIMULATION_SEED);

    const secondState = store.getState();
    const secondAgents = secondState.agents.slice(0, 3);
    const secondEvents = secondState.events.slice(0, 3);

    expect(secondAgents).toEqual(firstAgents);
    expect(secondEvents).toEqual(firstEvents);
  });

  it("keeps draft and applied config separate until apply", () => {
    const store = createSimulationStore();
    const beforeApplied = store.getState().appliedConfig.population.agentCount;

    store.getState().setDraftConfigValue("agentCount", 1500);

    expect(store.getState().draftConfig.population.agentCount).toBe(1500);
    expect(store.getState().appliedConfig.population.agentCount).toBe(
      beforeApplied,
    );
  });

  it("keeps draft seed separate until apply", () => {
    const store = createSimulationStore(321);

    store.getState().setDraftSeed(654);

    expect(store.getState().draftSeed).toBe(654);
    expect(store.getState().seed).toBe(321);

    expect(store.getState().applyDraftAndReset()).toBe(true);
    expect(store.getState().seed).toBe(654);
    expect(store.getState().draftSeed).toBe(654);
  });

  it("applies draft config on reset and regenerates deterministic state", () => {
    const store = createSimulationStore(777);

    store.getState().setDraftConfigValue("agentCount", 1500);
    const applied = store.getState().applyDraftAndReset(777);

    expect(applied).toBe(true);
    expect(store.getState().appliedConfig.population.agentCount).toBe(1500);
    expect(store.getState().agents).toHaveLength(1500);
    expect(getDraftConfigValue(store.getState().draftConfig, "agentCount")).toBe(
      1500,
    );
  });

  it("generates different initial positions for different seeds", () => {
    const storeA = createSimulationStore(101);
    const storeB = createSimulationStore(202);

    expect(storeA.getState().agents[0]).not.toEqual(storeB.getState().agents[0]);
  });

  it("advances one deterministic engine tick through the store", () => {
    const store = createSimulationStore(999);
    const before = store.getState();

    store.getState().tickSimulation();

    const after = store.getState();
    expect(after.runtimeStep).toBe(before.runtimeStep + 1);
    expect(after.metrics.step).toBe(before.metrics.step);
    expect(after.agents).not.toEqual(before.agents);
  });

  it("stores playback speed separately from runtime status", () => {
    const store = createSimulationStore(999);

    store.getState().setPlaybackSpeed(8);

    expect(store.getState().playbackSpeed).toBe(8);
    expect(store.getState().status).toBe("idle");
  });

  it("can fast-forward multiple simulation steps at once", () => {
    const store = createSimulationStore(999);

    store.getState().advanceSimulation(50);

    const after = store.getState();
    expect(after.runtimeStep).toBe(50);
    expect(after.metrics.step).toBe(50);
    expect(after.metricsHistory.length).toBeGreaterThan(2);
  });

  it("captures metrics snapshots on the throttled cadence", () => {
    const store = createSimulationStore(999);

    for (let index = 0; index < 5; index += 1) {
      store.getState().tickSimulation();
    }

    const after = store.getState();
    expect(after.runtimeStep).toBe(5);
    expect(after.metrics.step).toBe(5);
    expect(after.metricsHistory).toHaveLength(2);
    expect(after.statsSnapshot.metrics.step).toBe(5);
  });

  it("tracks same-seed baseline comparison once a policy run is applied", () => {
    const store = createSimulationStore(404);
    const policies: Policy[] = [
      {
        id: "ubi-step",
        type: "basicIncome",
        enabled: true,
        amount: 5,
        cadence: "step",
      },
    ];

    store.getState().setPoliciesDraft(policies);
    expect(store.getState().applyDraftAndReset(404)).toBe(true);

    const initial = store.getState();
    expect(initial.comparisonBaselineRuntime).not.toBeNull();
    expect(initial.comparisonSnapshot).not.toBeNull();
    expect(initial.comparisonHistory).toHaveLength(1);

    for (let index = 0; index < 5; index += 1) {
      store.getState().tickSimulation();
    }

    const after = store.getState();
    expect(after.comparisonSnapshot).not.toBeNull();
    expect(after.comparisonHistory).toHaveLength(2);
    expect(after.comparisonSnapshot?.step).toBe(5);
    expect(after.comparisonSnapshot?.current.averageWealth).toBeGreaterThan(
      after.comparisonSnapshot?.baseline.averageWealth ?? 0,
    );
    expect(after.metrics.policyCost).toBeGreaterThan(0);
  });

  it("does not apply invalid draft policies", () => {
    const store = createSimulationStore(808);
    const invalidPolicies: Policy[] = [
      {
        id: "bad-tax",
        type: "wealthTax",
        enabled: true,
        threshold: -1,
        rate: 2,
        cadence: "year",
      },
    ];

    store.getState().setPoliciesDraft(invalidPolicies);

    expect(store.getState().applyDraftAndReset()).toBe(false);
    expect(store.getState().policiesApplied).toEqual([]);
    expect(store.getState().policyValidationIssues.length).toBeGreaterThan(0);
  });

  it("applies composer drafts and keeps same-seed comparison enabled", () => {
    const store = createSimulationStore(909);
    const composerDraft: ComposerDocument = {
      version: 1,
      rules: [
        {
          id: "composer-ubi",
          name: "Composer UBI",
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
              id: "grantAmount-1",
              category: "effect",
              type: "grantAmount",
              payload: { amount: 2 },
            },
          ],
        },
      ],
    };

    store.getState().setComposerDraft(composerDraft);

    expect(store.getState().applyDraftAndReset(909)).toBe(true);
    expect(store.getState().composerApplied.rules).toHaveLength(1);
    expect(store.getState().comparisonBaselineRuntime).not.toBeNull();

    for (let index = 0; index < 5; index += 1) {
      store.getState().tickSimulation();
    }

    expect(store.getState().metrics.policyCost).toBeGreaterThan(0);
    expect(store.getState().comparisonSnapshot).not.toBeNull();
  });

  it("does not apply invalid composer drafts", () => {
    const store = createSimulationStore(1001);
    const invalidComposerDraft: ComposerDocument = {
      version: 1,
      rules: [
        {
          id: "broken-composer",
          name: "Broken Composer",
          enabled: true,
          cadence: "year",
          blocks: [
            {
              id: "allAgents-1",
              category: "target",
              type: "allAgents",
              payload: {},
            },
            {
              id: "bad-tax-1",
              category: "effect",
              type: "wealthTax",
              payload: {
                threshold: 100,
                rate: 2,
              },
            },
          ],
        },
      ],
    };

    store.getState().setComposerDraft(invalidComposerDraft);

    expect(store.getState().applyDraftAndReset()).toBe(false);
    expect(store.getState().composerApplied.rules).toEqual([]);
    expect(store.getState().composerValidationIssues.length).toBeGreaterThan(0);
  });

  it("derives composer draft ordering from canvas lane ordering", () => {
    const store = createSimulationStore(1111);
    const composerDraft: ComposerDocument = {
      version: 1,
      rules: [
        {
          id: "canvas-order-rule",
          name: "Canvas Order Rule",
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
              id: "grantAmount-1",
              category: "effect",
              type: "grantAmount",
              payload: { amount: 2 },
            },
            {
              id: "setWealthFloor-1",
              category: "effect",
              type: "setWealthFloor",
              payload: { minimumWealth: 10 },
            },
          ],
        },
      ],
    };

    store.getState().setComposerDraft(composerDraft);
    const canvasDraft = structuredClone(store.getState().canvasDraft);
    canvasDraft.frames[0].laneOrder.effect = ["setWealthFloor-1", "grantAmount-1"];

    store.getState().setCanvasDraft(canvasDraft);

    const effectBlockIds = store
      .getState()
      .composerDraft.rules[0]
      .blocks.filter((block) => block.category === "effect")
      .map((block) => block.id);

    expect(effectBlockIds).toEqual(["setWealthFloor-1", "grantAmount-1"]);
  });

  it("syncs connected canvas edits back into the composer draft", () => {
    const store = createSimulationStore(1212);
    const composerDraft: ComposerDocument = {
      version: 1,
      rules: [
        {
          id: "connected-sync-rule",
          name: "Connected Sync Rule",
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
              id: "grantAmount-1",
              category: "effect",
              type: "grantAmount",
              payload: { amount: 3 },
            },
            {
              id: "setWealthFloor-1",
              category: "effect",
              type: "setWealthFloor",
              payload: { minimumWealth: 12 },
            },
          ],
        },
      ],
    };

    store.getState().setComposerDraft(composerDraft);
    const phase10Canvas = importComposerToCanvas(composerDraft).document;
    phase10Canvas.frames[0].laneOrder.effect = ["setWealthFloor-1", "grantAmount-1"];
    const connected = importPhase10CanvasToConnectedCanvas(phase10Canvas).document;

    store.getState().setConnectedCanvasDraft(connected);

    const effectBlockIds = store
      .getState()
      .composerDraft.rules[0]
      .blocks.filter((block) => block.category === "effect")
      .map((block) => block.id);

    expect(effectBlockIds).toEqual(["setWealthFloor-1", "grantAmount-1"]);
    expect(store.getState().connectedCanvasDraft.edges.length).toBeGreaterThan(0);
  });

  it("does not apply connected canvas drafts with invalid root wiring", () => {
    const store = createSimulationStore(1313);
    const composerDraft: ComposerDocument = {
      version: 1,
      rules: [
        {
          id: "connected-invalid-rule",
          name: "Connected Invalid Rule",
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
              id: "grantAmount-1",
              category: "effect",
              type: "grantAmount",
              payload: { amount: 2 },
            },
          ],
        },
      ],
    };

    store.getState().setComposerDraft(composerDraft);
    const connected = structuredClone(store.getState().connectedCanvasDraft);
    const frameNode = connected.nodes.find((node) => node.kind === "rule-frame")!;

    connected.edges = connected.edges.filter(
      (edge) =>
        edge.toPortId !== createConnectedCanvasPortId(frameNode.id, "input", "effect"),
    );

    store.getState().setConnectedCanvasDraft(connected);

    expect(store.getState().applyDraftAndReset()).toBe(false);
    expect(
      store
        .getState()
        .connectedCanvasValidationIssues.some(
          (issue) => issue.code === "missing_effect_connection",
        ),
    ).toBe(true);
  });

  it("keeps equivalent results across policies, composer, canvas, and connected canvas editors", () => {
    const seed = 1414;
    const policies: Policy[] = [
      {
        id: "equiv-ubi",
        type: "basicIncome",
        enabled: true,
        amount: 3,
        cadence: "step",
      },
      {
        id: "equiv-wealth-tax",
        type: "wealthTax",
        enabled: true,
        threshold: 220,
        rate: 0.04,
        cadence: "year",
      },
      {
        id: "equiv-progressive-tax",
        type: "progressiveTax",
        enabled: true,
        cadence: "year",
        brackets: [
          { threshold: 0, rate: 0.01 },
          { threshold: 250, rate: 0.05 },
          { threshold: 500, rate: 0.09 },
        ],
      },
      {
        id: "equiv-floor",
        type: "bankruptcyFloor",
        enabled: true,
        minimumWealth: 14,
        cadence: "step",
      },
      {
        id: "equiv-bailout",
        type: "bailout",
        enabled: true,
        triggerWealth: 14,
        amount: 6,
        maxPerAgent: 2,
        cadence: "step",
      },
      {
        id: "equiv-talent-grant",
        type: "talentGrant",
        enabled: true,
        talentThreshold: 0.82,
        wealthCeiling: 60,
        amount: 9,
        cadence: "year",
      },
    ];

    const policiesOutcome = runPoliciesEditorPath(seed, policies);
    const composerOutcome = runComposerEditorPath(seed, policies);
    const canvasOutcome = runCanvasEditorPath(seed, policies);
    const connectedCanvasOutcome = runConnectedCanvasEditorPath(seed, policies);

    expect(composerOutcome).toEqual(policiesOutcome);
    expect(canvasOutcome).toEqual(policiesOutcome);
    expect(connectedCanvasOutcome).toEqual(policiesOutcome);
  });
});
