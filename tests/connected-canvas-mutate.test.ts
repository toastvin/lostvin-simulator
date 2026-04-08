import { describe, expect, it } from "vitest";

import {
  canNestNodeInContainer,
  createGroupContainer,
  deleteConnectedCanvasNode,
  moveContainerChild,
  moveNodeIntoContainer,
  toggleGroupCollapsed,
} from "@/lib/connected-canvas/mutate";
import { importPhase10CanvasToConnectedCanvas } from "@/lib/connected-canvas/import-from-phase10";
import { importComposerToCanvas } from "@/lib/composer-canvas/import";
import type { ComposerDocument } from "@/types/composer";

function createBaseConnectedCanvas() {
  const composer: ComposerDocument = {
    version: 1,
    rules: [
      {
        id: "rule-1",
        name: "Mutate Rule",
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
            payload: { amount: 10 },
          },
          {
            id: "setWealthFloor-1",
            category: "effect",
            type: "setWealthFloor",
            payload: { minimumWealth: 15 },
          },
        ],
      },
    ],
  };

  return importPhase10CanvasToConnectedCanvas(importComposerToCanvas(composer).document)
    .document;
}

describe("connected canvas mutate helpers", () => {
  it("creates additional root groups for a rule", () => {
    const document = createBaseConnectedCanvas();
    const next = createGroupContainer(document, "rule-1", "effect");
    const addedGroup = next.nodes.find(
      (node) => node.kind === "effect-group" && !document.nodes.some((prev) => prev.id === node.id),
    );

    expect(addedGroup).toBeDefined();
    expect(
      next.edges.some(
        (edge) => edge.fromPortId === `${addedGroup?.id}:output:output`,
      ),
    ).toBe(true);
    expect(
      next.containers.some((container) => container.containerNodeId === addedGroup?.id),
    ).toBe(true);
  });

  it("moves nodes into nested groups and preserves child ordering", () => {
    const document = createBaseConnectedCanvas();
    const rootEffectGroup = document.nodes.find(
      (node) => node.kind === "effect-group",
    )!;
    const withNestedGroup = createGroupContainer(
      document,
      "rule-1",
      "effect",
      rootEffectGroup.id,
    );
    const nestedGroup = withNestedGroup.nodes.find(
      (node) =>
        node.kind === "effect-group" &&
        node.id !== rootEffectGroup.id,
    )!;
    const effectBlock = withNestedGroup.nodes.find(
      (node) => node.kind === "effect-block" && node.block.id === "grantAmount-1",
    )!;

    expect(canNestNodeInContainer(withNestedGroup, effectBlock.id, nestedGroup.id)).toBe(
      true,
    );

    const moved = moveNodeIntoContainer(withNestedGroup, effectBlock.id, nestedGroup.id);
    const reordered = moveContainerChild(
      moved,
      rootEffectGroup.id,
      nestedGroup.id,
      "down",
    );

    expect(
      reordered.containers.find((container) => container.containerNodeId === nestedGroup.id)
        ?.childNodeIds,
    ).toContain(effectBlock.id);
    expect(
      reordered.containers.find((container) => container.containerNodeId === rootEffectGroup.id)
        ?.childNodeIds.at(-1),
    ).toBe(nestedGroup.id);
  });

  it("toggles collapsed state on group nodes", () => {
    const document = createBaseConnectedCanvas();
    const effectGroup = document.nodes.find((node) => node.kind === "effect-group")!;
    const toggled = toggleGroupCollapsed(document, effectGroup.id);
    const nextGroup = toggled.nodes.find((node) => node.id === effectGroup.id);

    expect(nextGroup && "collapsed" in nextGroup ? nextGroup.collapsed : null).toBe(
      true,
    );
  });

  it("deletes nested groups by hoisting their children into the parent container", () => {
    const document = createBaseConnectedCanvas();
    const rootEffectGroup = document.nodes.find((node) => node.kind === "effect-group")!;
    const withNestedGroup = createGroupContainer(
      document,
      "rule-1",
      "effect",
      rootEffectGroup.id,
    );
    const nestedGroup = withNestedGroup.nodes.find(
      (node) => node.kind === "effect-group" && node.id !== rootEffectGroup.id,
    )!;
    const effectBlock = withNestedGroup.nodes.find(
      (node) => node.kind === "effect-block" && node.block.id === "grantAmount-1",
    )!;
    const moved = moveNodeIntoContainer(withNestedGroup, effectBlock.id, nestedGroup.id);
    const next = deleteConnectedCanvasNode(moved, nestedGroup.id);

    expect(next.nodes.some((node) => node.id === nestedGroup.id)).toBe(false);
    expect(
      next.containers.find((container) => container.containerNodeId === rootEffectGroup.id)
        ?.childNodeIds,
    ).toContain(effectBlock.id);
    expect(
      next.containers.some((container) => container.containerNodeId === nestedGroup.id),
    ).toBe(false);
  });

  it("deletes root groups by reconnecting their children to the rule frame", () => {
    const document = createBaseConnectedCanvas();
    const effectGroup = document.nodes.find((node) => node.kind === "effect-group")!;
    const frameNode = document.nodes.find((node) => node.kind === "rule-frame")!;
    const childNodeIds =
      document.containers.find((container) => container.containerNodeId === effectGroup.id)
        ?.childNodeIds ?? [];
    const next = deleteConnectedCanvasNode(document, effectGroup.id);

    expect(next.nodes.some((node) => node.id === effectGroup.id)).toBe(false);
    expect(
      next.edges.some(
        (edge) =>
          edge.fromPortId === `${childNodeIds[0]}:output:output` &&
          edge.toPortId === `${frameNode.id}:input:effect`,
      ),
    ).toBe(true);
    expect(
      next.containers.some((container) => container.containerNodeId === effectGroup.id),
    ).toBe(false);
  });
});
