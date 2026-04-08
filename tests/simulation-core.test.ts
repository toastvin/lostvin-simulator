import { describe, expect, it } from "vitest";

import {
  CURRENT_SCHEMA_VERSION,
  getConfigFieldDefinitions,
} from "@/lib/config/fields";
import { createDefaultConfig } from "@/lib/config/defaults";
import {
  detectAgentEventCollisions,
  isCollision,
  type CollisionRecord,
} from "@/lib/simulation/collision";
import {
  deriveEventCounts,
  deriveEventGridDimensions,
} from "@/lib/simulation/events";
import { deriveSimulationGridLayout } from "@/lib/simulation/grid";
import {
  initializePopulation,
  initializeSimulationState,
} from "@/lib/simulation/initialize";
import {
  moveEntity,
  resolveAgentEventCollisions,
  resolveEventCollisions,
} from "@/lib/simulation/movement";
import { stepSimulation } from "@/lib/simulation/step";

function createConfig() {
  return createDefaultConfig(
    getConfigFieldDefinitions(),
    CURRENT_SCHEMA_VERSION,
  );
}

function isCenteredOnGrid(value: number, cellSize: number) {
  const cellIndex = value / cellSize - 0.5;
  return Math.abs(cellIndex - Math.round(cellIndex)) < 1e-9;
}

function detectAgentEventCollisionsNaive(
  agents: ReturnType<typeof initializePopulation>["agents"],
  events: ReturnType<typeof initializePopulation>["events"],
): CollisionRecord[] {
  const collisions: CollisionRecord[] = [];

  agents.forEach((agent, agentIndex) => {
    events.forEach((event, eventIndex) => {
      if (isCollision(agent, event)) {
        collisions.push({
          agentIndex,
          eventIndex,
          kind: event.kind,
        });
      }
    });
  });

  return collisions;
}

describe("simulation core", () => {
  it("initializes talent values within range", () => {
    const config = createConfig();
    const { agents } = initializePopulation(2026, config);

    expect(agents.every((agent) => agent.talent >= 0 && agent.talent <= 1)).toBe(
      true,
    );
  });

  it("lays out event slots regularly while randomizing which slots are luck or bad luck", () => {
    const config = createConfig();
    config.population.agentCount = 0;
    config.events.luckSharePercent = 35;
    config.events.gridRingCount = 5;
    config.movement.eventSpeed = 0;

    const left = initializePopulation(101, config).events;
    const right = initializePopulation(202, config).events;
    const backdropGrid = deriveSimulationGridLayout(
      config.arena.width,
      config.arena.height,
    );
    const eventGrid = deriveEventGridDimensions(
      config.arena.width,
      config.arena.height,
      config.events.gridRingCount,
    );
    const { luckNodeCount, badLuckNodeCount, totalNodeCount } = deriveEventCounts(
      config.events.luckSharePercent,
      eventGrid.totalNodeCount,
    );

    expect(left).toHaveLength(totalNodeCount);
    expect(left.filter((event) => event.kind === "luck")).toHaveLength(
      luckNodeCount,
    );
    expect(left.filter((event) => event.kind === "badLuck")).toHaveLength(
      badLuckNodeCount,
    );
    expect(left.map((event) => [event.x, event.y])).toEqual(
      right.map((event) => [event.x, event.y]),
    );
    expect(new Set(left.map((event) => event.x)).size).toBeLessThan(left.length);
    expect(new Set(left.map((event) => event.y)).size).toBeLessThan(left.length);
    expect(left.map((event) => event.kind)).not.toEqual(
      right.map((event) => event.kind),
    );

    const rowCounts = Array.from(
      left.reduce<Map<number, number>>((rows, event) => {
        rows.set(event.y, (rows.get(event.y) ?? 0) + 1);
        return rows;
      }, new Map()).values(),
    );
    expect(Math.max(...rowCounts) - Math.min(...rowCounts)).toBeLessThanOrEqual(1);
    expect(
      left.every(
        (event) =>
          isCenteredOnGrid(event.x, backdropGrid.cellWidth) &&
          isCenteredOnGrid(event.y, backdropGrid.cellHeight),
      ),
    ).toBe(true);
  });

  it("adds event dots by whole outer rings instead of single cells", () => {
    const config = createConfig();
    const baseGrid = deriveEventGridDimensions(
      config.arena.width,
      config.arena.height,
      4,
    );
    const expandedGrid = deriveEventGridDimensions(
      config.arena.width,
      config.arena.height,
      5,
    );

    expect(expandedGrid.columns).toBe(baseGrid.columns + 2);
    expect(expandedGrid.rows).toBe(baseGrid.rows + 2);
    expect(expandedGrid.totalNodeCount - baseGrid.totalNodeCount).toBe(
      2 * (baseGrid.columns + baseGrid.rows) + 4,
    );
  });

  it("fills the full rectangular grid when the ring count reaches the max", () => {
    const config = createConfig();
    const backdropGrid = deriveSimulationGridLayout(
      config.arena.width,
      config.arena.height,
    );
    const eventGrid = deriveEventGridDimensions(
      config.arena.width,
      config.arena.height,
      999,
    );

    expect(eventGrid.columns).toBe(backdropGrid.columns);
    expect(eventGrid.rows).toBe(backdropGrid.rows);
  });

  it("reflects entities off arena bounds", () => {
    const moved = moveEntity(
      {
        x: 9,
        y: 5,
        vx: 3,
        vy: 0,
        radius: 2,
      },
      { width: 10, height: 10 },
      5,
    );

    expect(moved.x).toBe(8);
    expect(moved.vx).toBeLessThan(0);
  });

  it("deflects overlapping event dots when event drift is enabled", () => {
    const resolved = resolveEventCollisions(
      [
        {
          id: 1,
          kind: "luck",
          x: 100,
          y: 100,
          vx: 2,
          vy: 0,
          radius: 4,
        },
        {
          id: 2,
          kind: "badLuck",
          x: 106,
          y: 100,
          vx: 2,
          vy: 0,
          radius: 4,
        },
      ],
      { width: 400, height: 300 },
      4,
    );

    expect(Math.abs(resolved[0].vy)).toBeGreaterThan(0);
    expect(Math.abs(resolved[1].vy)).toBeGreaterThan(0);
  });

  it("bounces an agent off a fixed event dot instead of passing through", () => {
    const resolved = resolveAgentEventCollisions(
      [
        {
          id: 1,
          x: 55,
          y: 100,
          vx: 5,
          vy: 0,
          radius: 3,
          talent: 1,
          wealth: 10,
          happiness: 50,
          lastWealthDelta: 0,
          bankruptCount: 0,
          rescuedCount: 0,
        },
      ],
      [
        {
          id: 10,
          kind: "luck",
          x: 60,
          y: 100,
          vx: 0,
          vy: 0,
          radius: 4,
        },
      ],
      { width: 400, height: 300 },
      8,
      0,
    );

    expect(resolved.agents[0].vx).toBeLessThan(0);
    expect(resolved.agents[0].x).toBeLessThanOrEqual(53);
    expect(resolved.events[0].x).toBe(60);
    expect(resolved.events[0].y).toBe(100);
  });

  it("detects circle collisions", () => {
    expect(
      isCollision(
        { x: 0, y: 0, radius: 4 },
        { x: 6, y: 0, radius: 3 },
      ),
    ).toBe(true);
    expect(
      isCollision(
        { x: 0, y: 0, radius: 2 },
        { x: 10, y: 0, radius: 2 },
      ),
    ).toBe(false);
  });

  it("matches the naive collision detector across seeded populations", () => {
    const config = createConfig();
    config.population.agentCount = 120;
    config.events.gridRingCount = 5;

    [
      { seed: 101, ringCount: 3 },
      { seed: 202, ringCount: 5 },
      { seed: 303, ringCount: 999 },
    ].forEach(({ seed, ringCount }) => {
      config.events.gridRingCount = ringCount;
      const { agents, events } = initializePopulation(seed, config);

      expect(detectAgentEventCollisions(agents, events)).toEqual(
        detectAgentEventCollisionsNaive(agents, events),
      );
    });
  });

  it("produces identical state for same seed and same step count", () => {
    const config = createConfig();
    let left = initializeSimulationState(31415, config);
    let right = initializeSimulationState(31415, config);

    for (let index = 0; index < 5; index += 1) {
      left = stepSimulation(left, config);
      right = stepSimulation(right, config);
    }

    expect(left).toEqual(right);
  });

  it("keeps agents moving in straight lines until something collides", () => {
    const config = createConfig();
    config.movement.agentSpeed = 5;
    const initial = initializeSimulationState(11, config);

    initial.agents = [
      {
        ...initial.agents[0],
        x: 50,
        y: 60,
        vx: 3,
        vy: 4,
        radius: 3,
      },
    ];
    initial.events = [];

    const next = stepSimulation(initial, config);

    expect(next.agents[0].x).toBe(53);
    expect(next.agents[0].y).toBe(64);
    expect(next.agents[0].vx).toBe(3);
    expect(next.agents[0].vy).toBe(4);
  });

  it("bounces and applies wealth rules when an agent hits a fixed event in the full step", () => {
    const config = createConfig();
    config.movement.agentSpeed = 8;
    config.movement.eventSpeed = 0;
    const initial = initializeSimulationState(17, config);

    initial.agents = [
      {
        ...initial.agents[0],
        x: 50,
        y: 100,
        vx: 5,
        vy: 0,
        talent: 1,
        wealth: 20,
      },
    ];
    initial.events = [
      {
        id: 1,
        kind: "luck",
        x: 60,
        y: 100,
        vx: 0,
        vy: 0,
        radius: 4,
      },
    ];

    const next = stepSimulation(initial, config);

    expect(next.agents[0].wealth).toBeGreaterThan(20);
    expect(next.agents[0].vx).toBeLessThan(0);
    expect(next.events[0].x).toBe(60);
  });

  it("updates wealth and happiness when collisions occur", () => {
    const config = createConfig();
    config.movement.agentSpeed = 0;
    const initial = initializeSimulationState(1, config);

    initial.agents = [
      {
        ...initial.agents[0],
        x: 50,
        y: 50,
        vx: 0,
        vy: 0,
        wealth: 100,
        happiness: 50,
        talent: 1,
      },
    ];
    initial.events = [
      {
        id: 1,
        kind: "luck",
        x: 50,
        y: 50,
        vx: 0,
        vy: 0,
        radius: 4,
      },
    ];

    const next = stepSimulation(initial, config);

    expect(next.agents[0].wealth).toBeGreaterThan(100);
    expect(next.agents[0].lastWealthDelta).toBeGreaterThan(0);
    expect(next.agents[0].happiness).toBeGreaterThanOrEqual(0);
    expect(next.step).toBe(1);
  });

  it("halves wealth on bad luck collisions regardless of talent", () => {
    const config = createConfig();
    config.movement.agentSpeed = 0;
    const initial = initializeSimulationState(2, config);

    initial.agents = [
      {
        ...initial.agents[0],
        x: 80,
        y: 80,
        vx: 0,
        vy: 0,
        wealth: 40,
        talent: 1,
      },
    ];
    initial.events = [
      {
        id: 1,
        kind: "badLuck",
        x: 80,
        y: 80,
        vx: 0,
        vy: 0,
        radius: 4,
      },
    ];

    const next = stepSimulation(initial, config);

    expect(next.agents[0].wealth).toBe(20);
    expect(next.agents[0].lastWealthDelta).toBe(-20);
  });

  it("deflects overlapping agents instead of letting them keep one line", () => {
    const config = createConfig();
    config.movement.agentSpeed = 6;
    const initial = initializeSimulationState(7, config);

    initial.agents = [
      {
        ...initial.agents[0],
        x: 200,
        y: 200,
        vx: 4,
        vy: 0,
        radius: 4,
      },
      {
        ...initial.agents[1],
        x: 206,
        y: 200,
        vx: 4,
        vy: 0,
        radius: 4,
      },
    ];
    initial.events = [];

    const initialDistance = Math.hypot(
      initial.agents[0].x - initial.agents[1].x,
      initial.agents[0].y - initial.agents[1].y,
    );
    const next = stepSimulation(initial, config);
    const nextDistance = Math.hypot(
      next.agents[0].x - next.agents[1].x,
      next.agents[0].y - next.agents[1].y,
    );

    expect(nextDistance).toBeGreaterThan(initialDistance);
    expect(Math.abs(next.agents[0].vy)).toBeGreaterThan(0);
    expect(Math.abs(next.agents[1].vy)).toBeGreaterThan(0);
  });
});
