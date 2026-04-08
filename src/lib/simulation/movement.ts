import { clampVectorMagnitude } from "@/lib/math";
import type { EventNode, Agent } from "@/types/simulation";

type MovableEntity = Pick<Agent, "x" | "y" | "vx" | "vy" | "radius">;
type CollidableEntity = MovableEntity & { id: number };

type Bounds = {
  width: number;
  height: number;
};

function deterministicUnit(...values: number[]) {
  let state = 0x9e3779b9;

  values.forEach((value, index) => {
    state = (state + ((value | 0) ^ (index * 0x85ebca6b))) >>> 0;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
  });

  return (state >>> 0) / 4294967296;
}

function deterministicSigned(...values: number[]) {
  return deterministicUnit(...values) * 2 - 1;
}

function buildSpatialIndex<T extends CollidableEntity>(
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

function clampToBounds<T extends MovableEntity>(entity: T, bounds: Bounds): T {
  return {
    ...entity,
    x: Math.min(Math.max(entity.x, entity.radius), bounds.width - entity.radius),
    y: Math.min(Math.max(entity.y, entity.radius), bounds.height - entity.radius),
  };
}

export function moveEntity<T extends MovableEntity>(
  entity: T,
  bounds: Bounds,
  maxSpeed: number,
): T {
  let { vx, vy } = clampVectorMagnitude(entity.vx, entity.vy, maxSpeed);
  let x = entity.x + vx;
  let y = entity.y + vy;

  if (x - entity.radius < 0) {
    x = entity.radius;
    vx = Math.abs(vx);
  } else if (x + entity.radius > bounds.width) {
    x = bounds.width - entity.radius;
    vx = -Math.abs(vx);
  }

  if (y - entity.radius < 0) {
    y = entity.radius;
    vy = Math.abs(vy);
  } else if (y + entity.radius > bounds.height) {
    y = bounds.height - entity.radius;
    vy = -Math.abs(vy);
  }

  return {
    ...entity,
    x,
    y,
    vx,
    vy,
  };
}

export function moveAgents(
  agents: Agent[],
  bounds: Bounds,
  maxSpeed: number,
): Agent[] {
  return agents.map((agent) => moveEntity(agent, bounds, maxSpeed));
}

export function moveEvents(
  events: EventNode[],
  bounds: Bounds,
  maxSpeed: number,
): EventNode[] {
  return events.map((event) => moveEntity(event, bounds, maxSpeed));
}

function resolveEntityCollisions<T extends CollidableEntity>(
  entities: T[],
  bounds: Bounds,
  maxSpeed: number,
): T[] {
  if (entities.length <= 1 || maxSpeed <= 0) {
    return entities;
  }

  const resolved = entities.map((entity) => ({ ...entity }));
  const cellSize = Math.max(
    resolved[0]?.radius ? resolved[0].radius * 4 : 12,
    maxSpeed * 2,
    12,
  );
  const spatialIndex = buildSpatialIndex(resolved, cellSize);

  resolved.forEach((entity, entityIndex) => {
    const cellX = Math.floor(entity.x / cellSize);
    const cellY = Math.floor(entity.y / cellSize);

    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const bucket = spatialIndex.get(`${cellX + offsetX}:${cellY + offsetY}`);

        bucket?.forEach((neighborIndex) => {
          if (neighborIndex <= entityIndex) {
            return;
          }

          const left = resolved[entityIndex];
          const right = resolved[neighborIndex];
          const dx = left.x - right.x;
          const dy = left.y - right.y;
          const minimumDistance = left.radius + right.radius;
          const distance = Math.hypot(dx, dy);

          if (distance >= minimumDistance) {
            return;
          }

          let nx = 0;
          let ny = 0;

          if (distance <= 0.0001) {
            const angle =
              deterministicUnit(left.id, right.id, 401, entityIndex) *
              Math.PI *
              2;
            nx = Math.cos(angle);
            ny = Math.sin(angle);
          } else {
            nx = dx / distance;
            ny = dy / distance;
          }

          const overlap = minimumDistance - Math.max(distance, 0.0001);
          left.x += nx * (overlap / 2);
          left.y += ny * (overlap / 2);
          right.x -= nx * (overlap / 2);
          right.y -= ny * (overlap / 2);

          const leftNormal = left.vx * nx + left.vy * ny;
          const rightNormal = right.vx * nx + right.vy * ny;
          const relativeNormal = leftNormal - rightNormal;
          const leftTangentX = left.vx - nx * leftNormal;
          const leftTangentY = left.vy - ny * leftNormal;
          const rightTangentX = right.vx - nx * rightNormal;
          const rightTangentY = right.vy - ny * rightNormal;
          const tangentX = -ny;
          const tangentY = nx;
          const spin =
            deterministicSigned(left.id, right.id, 503, entityIndex) *
            Math.min(maxSpeed * 0.22, overlap * 0.35 + 0.08);

          if (relativeNormal < 0) {
            left.vx = leftTangentX + nx * rightNormal + tangentX * spin;
            left.vy = leftTangentY + ny * rightNormal + tangentY * spin;
            right.vx = rightTangentX + nx * leftNormal - tangentX * spin;
            right.vy = rightTangentY + ny * leftNormal - tangentY * spin;
          } else {
            left.vx += nx * (maxSpeed * 0.08) + tangentX * spin;
            left.vy += ny * (maxSpeed * 0.08) + tangentY * spin;
            right.vx -= nx * (maxSpeed * 0.08) + tangentX * spin;
            right.vy -= ny * (maxSpeed * 0.08) + tangentY * spin;
          }
        });
      }
    }
  });

  return resolved.map((entity) => {
    const velocity = clampVectorMagnitude(entity.vx, entity.vy, maxSpeed);

    return clampToBounds(
      {
        ...entity,
        vx: velocity.vx,
        vy: velocity.vy,
      },
      bounds,
    );
  });
}

export function resolveAgentCollisions(
  agents: Agent[],
  bounds: Bounds,
  maxSpeed: number,
): Agent[] {
  return resolveEntityCollisions(agents, bounds, maxSpeed);
}

export function resolveEventCollisions(
  events: EventNode[],
  bounds: Bounds,
  maxSpeed: number,
): EventNode[] {
  return resolveEntityCollisions(events, bounds, maxSpeed);
}

export function resolveAgentEventCollisions(
  agents: Agent[],
  events: EventNode[],
  bounds: Bounds,
  agentMaxSpeed: number,
  eventMaxSpeed: number,
): { agents: Agent[]; events: EventNode[] } {
  if (agents.length === 0 || events.length === 0) {
    return { agents, events };
  }

  const resolvedAgents = agents.map((agent) => ({ ...agent }));
  const resolvedEvents = events.map((event) => ({ ...event }));
  const cellSize = Math.max(
    (resolvedAgents[0]?.radius ?? 3) + (resolvedEvents[0]?.radius ?? 4),
    agentMaxSpeed + eventMaxSpeed,
    12,
  );
  const eventIndex = buildSpatialIndex(resolvedEvents, cellSize);

  resolvedAgents.forEach((agent, agentIndex) => {
    const cellX = Math.floor(agent.x / cellSize);
    const cellY = Math.floor(agent.y / cellSize);

    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const bucket = eventIndex.get(`${cellX + offsetX}:${cellY + offsetY}`);

        bucket?.forEach((eventIndexInBucket) => {
          const currentAgent = resolvedAgents[agentIndex];
          const currentEvent = resolvedEvents[eventIndexInBucket];
          const dx = currentAgent.x - currentEvent.x;
          const dy = currentAgent.y - currentEvent.y;
          const minimumDistance = currentAgent.radius + currentEvent.radius;
          const distance = Math.hypot(dx, dy);

          if (distance >= minimumDistance) {
            return;
          }

          let nx = 0;
          let ny = 0;

          if (distance <= 0.0001) {
            const angle =
              deterministicUnit(
                currentAgent.id,
                currentEvent.id,
                701,
                agentIndex,
              ) *
              Math.PI *
              2;
            nx = Math.cos(angle);
            ny = Math.sin(angle);
          } else {
            nx = dx / distance;
            ny = dy / distance;
          }

          const overlap = minimumDistance - Math.max(distance, 0.0001);
          const tangentX = -ny;
          const tangentY = nx;
          const spin =
            deterministicSigned(
              currentAgent.id,
              currentEvent.id,
              809,
              agentIndex,
            ) * Math.min(Math.max(agentMaxSpeed, eventMaxSpeed) * 0.16, 0.45);

          if (eventMaxSpeed <= 0) {
            currentAgent.x += nx * overlap;
            currentAgent.y += ny * overlap;

            const agentNormal = currentAgent.vx * nx + currentAgent.vy * ny;
            if (agentNormal < 0) {
              currentAgent.vx -= 2 * agentNormal * nx;
              currentAgent.vy -= 2 * agentNormal * ny;
              currentAgent.vx += tangentX * spin;
              currentAgent.vy += tangentY * spin;
            }
            return;
          }

          if (agentMaxSpeed <= 0) {
            currentEvent.x -= nx * overlap;
            currentEvent.y -= ny * overlap;

            const eventNormal = currentEvent.vx * nx + currentEvent.vy * ny;
            if (eventNormal > 0) {
              currentEvent.vx -= 2 * eventNormal * nx;
              currentEvent.vy -= 2 * eventNormal * ny;
              currentEvent.vx -= tangentX * spin;
              currentEvent.vy -= tangentY * spin;
            }
            return;
          }

          currentAgent.x += nx * (overlap / 2);
          currentAgent.y += ny * (overlap / 2);
          currentEvent.x -= nx * (overlap / 2);
          currentEvent.y -= ny * (overlap / 2);

          const agentNormal = currentAgent.vx * nx + currentAgent.vy * ny;
          const eventNormal = currentEvent.vx * nx + currentEvent.vy * ny;
          const relativeNormal = agentNormal - eventNormal;
          const agentTangentX = currentAgent.vx - nx * agentNormal;
          const agentTangentY = currentAgent.vy - ny * agentNormal;
          const eventTangentX = currentEvent.vx - nx * eventNormal;
          const eventTangentY = currentEvent.vy - ny * eventNormal;

          if (relativeNormal < 0) {
            currentAgent.vx = agentTangentX + nx * eventNormal + tangentX * spin;
            currentAgent.vy = agentTangentY + ny * eventNormal + tangentY * spin;
            currentEvent.vx = eventTangentX + nx * agentNormal - tangentX * spin;
            currentEvent.vy = eventTangentY + ny * agentNormal - tangentY * spin;
          } else {
            currentAgent.vx += nx * (agentMaxSpeed * 0.08) + tangentX * spin;
            currentAgent.vy += ny * (agentMaxSpeed * 0.08) + tangentY * spin;
            currentEvent.vx -= nx * (eventMaxSpeed * 0.08) + tangentX * spin;
            currentEvent.vy -= ny * (eventMaxSpeed * 0.08) + tangentY * spin;
          }
        });
      }
    }
  });

  return {
    agents: resolvedAgents.map((agent) => {
      const velocity = clampVectorMagnitude(agent.vx, agent.vy, agentMaxSpeed);

      return clampToBounds(
        {
          ...agent,
          vx: velocity.vx,
          vy: velocity.vy,
        },
        bounds,
      );
    }),
    events: resolvedEvents.map((event) => {
      const velocity = clampVectorMagnitude(event.vx, event.vy, eventMaxSpeed);

      return clampToBounds(
        {
          ...event,
          vx: velocity.vx,
          vy: velocity.vy,
        },
        bounds,
      );
    }),
  };
}
