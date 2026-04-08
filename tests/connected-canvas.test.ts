import { describe, expect, it } from "vitest";

import { deriveComposerFromConnectedCanvas } from "@/lib/connected-canvas/derive-composer";
import { createConnectedCanvasBlockNode, createConnectedCanvasFrameNode, createConnectedCanvasGroupNode, createConnectedCanvasPortId, createConnectedCanvasPortsForNode, createEmptyConnectedCanvasDocument } from "@/lib/connected-canvas/defaults";
import { importPhase10CanvasToConnectedCanvas } from "@/lib/connected-canvas/import-from-phase10";
import { normalizeConnectedCanvasDocument } from "@/lib/connected-canvas/normalize";
import { validateConnectedCanvasDocument } from "@/lib/connected-canvas/validate";
import { importComposerToCanvas } from "@/lib/composer-canvas/import";
import type { ComposerDocument } from "@/types/composer";

describe("connected canvas", () => {
  it("imports phase 10 canvas and derives the same semantic order", () => {
    const composer: ComposerDocument = {
      version: 1,
      rules: [
        {
          id: "rule-1",
          name: "Connected Import",
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
              payload: { threshold: 80 },
            },
            {
              id: "grantAmount-1",
              category: "effect",
              type: "grantAmount",
              payload: { amount: 12 },
            },
            {
              id: "setWealthFloor-1",
              category: "effect",
              type: "setWealthFloor",
              payload: { minimumWealth: 30 },
            },
            {
              id: "budgetCap-1",
              category: "modifier",
              type: "budgetCap",
              payload: { maxBudget: 200 },
            },
          ],
        },
      ],
    };

    const phase10 = importComposerToCanvas(composer).document;
    phase10.frames[0].laneOrder.effect = ["setWealthFloor-1", "grantAmount-1"];
    const imported = importPhase10CanvasToConnectedCanvas(phase10);
    const validation = validateConnectedCanvasDocument(imported.document);
    const derived = deriveComposerFromConnectedCanvas(imported.document);

    expect(validation.valid).toBe(true);
    expect(
      imported.document.nodes.some((node) => node.kind === "effect-group"),
    ).toBe(true);
    expect(derived.composer.rules[0].blocks.map((block) => block.id)).toEqual([
      "allAgents-1",
      "wealthBelow-1",
      "setWealthFloor-1",
      "grantAmount-1",
      "budgetCap-1",
    ]);
  });

  it("rebuilds missing layouts and containers during normalization", () => {
    const composer: ComposerDocument = {
      version: 1,
      rules: [
        {
          id: "rule-1",
          name: "Normalization",
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
              payload: { amount: 10 },
            },
          ],
        },
      ],
    };

    const connected = importPhase10CanvasToConnectedCanvas(
      importComposerToCanvas(composer).document,
    ).document;
    connected.layouts = [];
    connected.containers = [];

    const normalized = normalizeConnectedCanvasDocument(connected);

    expect(normalized.document.layouts.length).toBe(normalized.document.nodes.length);
    expect(normalized.document.containers.length).toBeGreaterThan(0);
    expect(
      normalized.issues.some((issue) => issue.code === "missing_layout"),
    ).toBe(true);
    expect(
      normalized.issues.some((issue) => issue.code === "missing_container"),
    ).toBe(true);
  });

  it("flags cross-frame connections as invalid", () => {
    const composer: ComposerDocument = {
      version: 1,
      rules: [
        {
          id: "rule-1",
          name: "Rule One",
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
              payload: { amount: 10 },
            },
          ],
        },
        {
          id: "rule-2",
          name: "Rule Two",
          enabled: true,
          cadence: "step",
          blocks: [
            {
              id: "wealthBelow-2",
              category: "target",
              type: "wealthBelow",
              payload: { threshold: 50 },
            },
            {
              id: "setWealthFloor-2",
              category: "effect",
              type: "setWealthFloor",
              payload: { minimumWealth: 20 },
            },
          ],
        },
      ],
    };

    const connected = importPhase10CanvasToConnectedCanvas(
      importComposerToCanvas(composer).document,
    ).document;
    const frameOne = connected.nodes.find(
      (node) => node.kind === "rule-frame" && node.ruleId === "rule-1",
    )!;
    const ruleTwoTarget = connected.nodes.find(
      (node) => node.kind === "target-block" && node.ruleId === "rule-2",
    )!;

    connected.edges.push({
      id: "edge:cross-frame",
      fromPortId: createConnectedCanvasPortId(ruleTwoTarget.id, "output", "output"),
      toPortId: createConnectedCanvasPortId(frameOne.id, "input", "target"),
    });

    const validation = validateConnectedCanvasDocument(connected);

    expect(validation.valid).toBe(false);
    expect(
      validation.errors.some((issue) => issue.code === "cross_frame_connection"),
    ).toBe(true);
  });

  it("flattens nested group containers into composer block order", () => {
    const document = createEmptyConnectedCanvasDocument();
    const frameNode = createConnectedCanvasFrameNode(
      {
        id: "rule-1",
        name: "Nested Effects",
        enabled: true,
        cadence: "step",
      },
      "frame-node:rule-1",
    );
    const targetNode = createConnectedCanvasBlockNode(
      "rule-1",
      {
        id: "allAgents-1",
        category: "target",
        type: "allAgents",
        payload: {},
      },
      "block-node:rule-1:allAgents-1",
    );
    const outerEffectGroup = createConnectedCanvasGroupNode(
      "rule-1",
      "effect",
      "group-node:rule-1:effect:outer",
    );
    const innerEffectGroup = createConnectedCanvasGroupNode(
      "rule-1",
      "effect",
      "group-node:rule-1:effect:inner",
    );
    const effectOne = createConnectedCanvasBlockNode(
      "rule-1",
      {
        id: "grantAmount-1",
        category: "effect",
        type: "grantAmount",
        payload: { amount: 5 },
      },
      "block-node:rule-1:grantAmount-1",
    );
    const effectTwo = createConnectedCanvasBlockNode(
      "rule-1",
      {
        id: "setWealthFloor-1",
        category: "effect",
        type: "setWealthFloor",
        payload: { minimumWealth: 25 },
      },
      "block-node:rule-1:setWealthFloor-1",
    );

    document.nodes.push(
      frameNode,
      targetNode,
      outerEffectGroup,
      innerEffectGroup,
      effectOne,
      effectTwo,
    );
    document.ports.push(
      ...document.nodes.flatMap((node) => createConnectedCanvasPortsForNode(node)),
    );
    document.edges.push(
      {
        id: "edge:target-root",
        fromPortId: createConnectedCanvasPortId(targetNode.id, "output", "output"),
        toPortId: createConnectedCanvasPortId(frameNode.id, "input", "target"),
      },
      {
        id: "edge:effect-root",
        fromPortId: createConnectedCanvasPortId(
          outerEffectGroup.id,
          "output",
          "output",
        ),
        toPortId: createConnectedCanvasPortId(frameNode.id, "input", "effect"),
      },
    );
    document.containers.push(
      {
        containerNodeId: outerEffectGroup.id,
        childNodeIds: [innerEffectGroup.id, effectTwo.id],
      },
      {
        containerNodeId: innerEffectGroup.id,
        childNodeIds: [effectOne.id],
      },
    );

    const derived = deriveComposerFromConnectedCanvas(document);

    expect(derived.composer.rules).toHaveLength(1);
    expect(derived.composer.rules[0].blocks.map((block) => block.id)).toEqual([
      "allAgents-1",
      "grantAmount-1",
      "setWealthFloor-1",
    ]);
  });
});
