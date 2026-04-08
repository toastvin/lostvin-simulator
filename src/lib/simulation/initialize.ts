import { clamp } from "@/lib/math";
import { boxMuller, createSeededRandom, randomBetween } from "@/lib/random";
import type { SimulationConfig } from "@/types/config";
import type { Agent, EventNode, SimulationRuntimeState } from "@/types/simulation";

import {
  buildEventGridSlots,
  deriveEventCounts,
  deriveEventGridDimensions,
} from "./events";
import { calculateHappiness } from "./happiness";

export function getSpeedProfileMultiplier(
  profile: SimulationConfig["movement"]["speedProfile"],
): number {
  if (profile === "slow") {
    return 0.8;
  }

  if (profile === "fast") {
    return 1.2;
  }

  return 1;
}

function createVelocity(
  angle: number,
  speed: number,
) {
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

function shuffleKinds<T>(values: T[], random: { next: () => number }) {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random.next() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }

  return shuffled;
}

export function initializePopulation(
  seed: number,
  config: SimulationConfig,
): { agents: Agent[]; events: EventNode[] } {
  const random = createSeededRandom(seed);
  const speedScale = getSpeedProfileMultiplier(config.movement.speedProfile);
  const agentMaxSpeed = config.movement.agentSpeed * speedScale;
  const eventMaxSpeed = config.movement.eventSpeed * speedScale;
  const eventGrid = deriveEventGridDimensions(
    config.arena.width,
    config.arena.height,
    config.events.gridRingCount,
  );
  const { luckNodeCount, badLuckNodeCount } = deriveEventCounts(
    config.events.luckSharePercent,
    eventGrid.totalNodeCount,
  );

  const agents = Array.from(
    { length: config.population.agentCount },
    (_, id): Agent => {
      const angle = randomBetween(random, 0, Math.PI * 2);
      const speed = agentMaxSpeed <= 0 ? 0 : agentMaxSpeed;
      const { vx, vy } = createVelocity(angle, speed);

      return {
        id,
        x: randomBetween(random, 0, config.arena.width),
        y: randomBetween(random, 0, config.arena.height),
        vx,
        vy,
        radius: config.population.agentRadius,
        talent: clamp(boxMuller(random, 0.6, 0.15), 0, 1),
        wealth: config.population.initialWealth,
        happiness: 0,
        lastWealthDelta: 0,
        bankruptCount: 0,
        rescuedCount: 0,
      };
    },
  );

  const createEvent = (
    id: number,
    kind: EventNode["kind"],
    position: { x: number; y: number },
  ): EventNode => {
    const angle = randomBetween(random, 0, Math.PI * 2);
    const speed =
      eventMaxSpeed <= 0
        ? 0
        : randomBetween(random, 0.5, Math.max(0.5, eventMaxSpeed));
    const { vx, vy } = createVelocity(angle, speed);

    return {
      id,
      kind,
      x: position.x,
      y: position.y,
      vx,
      vy,
      radius: config.population.agentRadius + 1,
    };
  };

  const eventKinds = shuffleKinds(
    [
      ...Array.from(
        { length: luckNodeCount },
        (): EventNode["kind"] => "luck",
      ),
      ...Array.from(
        { length: badLuckNodeCount },
        (): EventNode["kind"] => "badLuck",
      ),
    ],
    random,
  );
  const eventSlots = buildEventGridSlots(
    config.arena.width,
    config.arena.height,
    config.events.gridRingCount,
  );
  const events = eventKinds.map((kind, index) =>
    createEvent(index, kind, eventSlots[index]),
  );

  return {
    agents: agents.map((agent) => ({
      ...agent,
      happiness: calculateHappiness(
        agent,
        config.population.initialWealth,
        config,
      ),
    })),
    events,
  };
}

export function initializeSimulationState(
  seed: number,
  config: SimulationConfig,
): SimulationRuntimeState {
  const { agents, events } = initializePopulation(seed, config);

  return {
    step: 0,
    agents,
    events,
    lastPolicyCost: 0,
  };
}
