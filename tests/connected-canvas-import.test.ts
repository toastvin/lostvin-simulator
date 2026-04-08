import { describe, expect, it } from "vitest";

import { importConnectedCanvasJson } from "@/lib/connected-canvas/import";
import { importPhase10CanvasToConnectedCanvas } from "@/lib/connected-canvas/import-from-phase10";
import { importComposerToCanvas } from "@/lib/composer-canvas/import";
import type { ComposerDocument } from "@/types/composer";

function createConnectedCanvasJson() {
  const composer: ComposerDocument = {
    version: 1,
    rules: [
      {
        id: "rule-1",
        name: "Import Test Rule",
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
            payload: { amount: 12 },
          },
        ],
      },
    ],
  };

  return JSON.stringify(
    importPhase10CanvasToConnectedCanvas(importComposerToCanvas(composer).document)
      .document,
  );
}

describe("connected canvas import", () => {
  it("parses a valid connected canvas JSON document", () => {
    const result = importConnectedCanvasJson(createConnectedCanvasJson());

    expect(result.ok).toBe(true);
    expect(result.ok ? result.document.version : null).toBe(1);
    expect(result.ok ? result.document.nodes.length : 0).toBeGreaterThan(0);
  });

  it("returns an error for invalid JSON", () => {
    const result = importConnectedCanvasJson("{not-valid-json");

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.error).toMatch(/could not be parsed/i);
  });

  it("returns an error for the wrong document shape", () => {
    const result = importConnectedCanvasJson(
      JSON.stringify({
        version: 99,
        nodes: [],
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.error).toMatch(/not a valid connected canvas/i);
  });
});
