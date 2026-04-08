import { distanceSquared } from "@/lib/math";
import type { Agent, EventNode } from "@/types/simulation";

export type CollisionRecord = {
  agentIndex: number;
  eventIndex: number;
  kind: EventNode["kind"];
};

type SpatialIndexEntity = {
  x: number;
  y: number;
};

function buildSpatialIndex<T extends SpatialIndexEntity>(
  entities: T[],
  cellSize: number,
): Map<string, number[]> {
  return entities.reduce<Map<string, number[]>>((index, entity, entityIndex) => {
    const cellX = Math.floor(entity.x / cellSize);
    const cellY = Math.floor(entity.y / cellSize);
    const key = `${cellX}:${cellY}`;
    const bucket = index.get(key) ?? [];

    bucket.push(entityIndex);
    index.set(key, bucket);

    return index;
  }, new Map());
}

function getAgentEventCellSize(
  agents: Agent[],
  events: EventNode[],
) {
  const maxAgentRadius = agents.reduce(
    (maximum, agent) => Math.max(maximum, agent.radius),
    0,
  );
  const maxEventRadius = events.reduce(
    (maximum, event) => Math.max(maximum, event.radius),
    0,
  );

  return Math.max(maxAgentRadius + maxEventRadius, 1);
}

export function isCollision(
  left: Pick<Agent, "x" | "y" | "radius"> | Pick<EventNode, "x" | "y" | "radius">,
  right: Pick<Agent, "x" | "y" | "radius"> | Pick<EventNode, "x" | "y" | "radius">,
): boolean {
  const radiusSum = left.radius + right.radius;

  return distanceSquared(left, right) <= radiusSum * radiusSum;
}

export function detectAgentEventCollisions(
  agents: Agent[],
  events: EventNode[],
): CollisionRecord[] {
  if (agents.length === 0 || events.length === 0) {
    return [];
  }

  const cellSize = getAgentEventCellSize(agents, events);
  const eventSpatialIndex = buildSpatialIndex(events, cellSize);
  const collisions: CollisionRecord[] = [];

  agents.forEach((agent, agentIndex) => {
    const cellX = Math.floor(agent.x / cellSize);
    const cellY = Math.floor(agent.y / cellSize);
    const candidateEventIndices: number[] = [];

    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const bucket = eventSpatialIndex.get(`${cellX + offsetX}:${cellY + offsetY}`);

        if (bucket) {
          candidateEventIndices.push(...bucket);
        }
      }
    }

    candidateEventIndices.sort((left, right) => left - right);

    candidateEventIndices.forEach((eventIndex) => {
      const event = events[eventIndex];

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
