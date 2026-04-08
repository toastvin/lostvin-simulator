import { describe, expect, it } from "vitest";

import { deriveComposerFromCanvas } from "@/lib/composer-canvas/derive-composer";
import { importComposerToCanvas } from "@/lib/composer-canvas/import";
import { normalizeCanvasDocument } from "@/lib/composer-canvas/normalize";
import { validateCanvasDocument } from "@/lib/composer-canvas/validate";
import { createComposerBlock } from "@/lib/composer/defaults";
import { getComposerBlockDefinition } from "@/lib/composer/registry";
import type { ComposerDocument } from "@/types/composer";

describe("composer canvas", () => {
  it("resolves duplicated block types by category", () => {
    expect(getComposerBlockDefinition("wealthBelow")).toBeUndefined();
    expect(getComposerBlockDefinition("wealthBelow", "target")?.category).toBe(
      "target",
    );
    expect(
      getComposerBlockDefinition("wealthBelow", "condition")?.category,
    ).toBe("condition");
    expect(
      createComposerBlock("wealthBelow", [], undefined, "condition").category,
    ).toBe("condition");
  });

  it("derives semantic block order from canvas lane order", () => {
    const document: ComposerDocument = {
      version: 1,
      rules: [
        {
          id: "rule-1",
          name: "Lane Order Rule",
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
            {
              id: "setWealthFloor-1",
              category: "effect",
              type: "setWealthFloor",
              payload: { minimumWealth: 20 },
            },
            {
              id: "maxRecipients-1",
              category: "modifier",
              type: "maxRecipients",
              payload: { count: 5 },
            },
          ],
        },
      ],
    };

    const imported = importComposerToCanvas(document).document;
    imported.frames[0].laneOrder.effect = ["setWealthFloor-1", "grantAmount-1"];

    const derived = deriveComposerFromCanvas(imported);
    const derivedRule = derived.composer.rules[0];

    expect(derivedRule.blocks.map((block) => block.id)).toEqual([
      "allAgents-1",
      "setWealthFloor-1",
      "grantAmount-1",
      "maxRecipients-1",
    ]);
  });

  it("rebuilds missing frames and layouts during normalization", () => {
    const document: ComposerDocument = {
      version: 1,
      rules: [
        {
          id: "rule-1",
          name: "Normalization Rule",
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
              payload: { amount: 5 },
            },
          ],
        },
      ],
    };

    const imported = importComposerToCanvas(document).document;
    imported.frames = [];
    imported.blockLayouts = [];

    const normalized = normalizeCanvasDocument(imported);
    const validation = validateCanvasDocument(imported);

    expect(normalized.document.frames).toHaveLength(1);
    expect(normalized.document.blockLayouts).toHaveLength(2);
    expect(normalized.issues.some((issue) => issue.code === "missing_frame")).toBe(
      true,
    );
    expect(validation.valid).toBe(true);
    expect(validation.warnings.some((issue) => issue.code === "missing_frame")).toBe(
      true,
    );
  });
});
