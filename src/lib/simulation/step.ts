import { applyComposerRules } from "@/lib/composer/applyComposer";
import { median } from "@/lib/math";
import { applyPolicies } from "@/lib/policies/applyPolicies";
import type { SimulationConfig } from "@/types/config";
import type { CompiledComposerRule } from "@/types/composer";
import type { Policy } from "@/types/policies";
import type { Agent, SimulationRuntimeState } from "@/types/simulation";

import {
  type CollisionRecord,
  detectAgentEventCollisions,
} from "./collision";
import { calculateHappiness } from "./happiness";
import { getSpeedProfileMultiplier } from "./initialize";
import {
  moveAgents,
  moveEvents,
  resolveAgentCollisions,
  resolveAgentEventCollisions,
  resolveEventCollisions,
} from "./movement";

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

function groupCollisionsByAgent(collisions: CollisionRecord[]) {
  return collisions.reduce<Map<number, CollisionRecord[]>>((grouped, collision) => {
    const existing = grouped.get(collision.agentIndex) ?? [];
    existing.push(collision);
    grouped.set(collision.agentIndex, existing);
    return grouped;
  }, new Map());
}

function applyCollisionRules(
  agents: Agent[],
  collisions: CollisionRecord[],
  nextStep: number,
  config: SimulationConfig,
): Agent[] {
  const collisionsByAgent = groupCollisionsByAgent(collisions);
  const applyCapitalGrowth =
    nextStep % config.economy.yearInterval === 0;

  return agents.map((agent, index) => {
    const agentCollisions = collisionsByAgent.get(index) ?? [];
    let nextWealth = agent.wealth;

    agentCollisions.forEach((collision) => {
      if (collision.kind === "badLuck") {
        nextWealth *= config.events.unluckyLossBase;
        return;
      }

      const successRoll = deterministicUnit(
        agent.id,
        collision.eventIndex,
        nextStep,
        71,
      );

      if (successRoll <= agent.talent) {
        nextWealth *= config.events.luckyGainBase;
      }
    });

    const capitalGrowth = applyCapitalGrowth
      ? nextWealth *
        (config.economy.capitalReturnBase +
          agent.talent * config.economy.talentReturnBonus)
      : 0;
    const normalizedWealth = Number((nextWealth + capitalGrowth).toFixed(2));
    const boundedWealth =
      normalizedWealth <= config.population.wealthFloor + 0.01
        ? config.population.wealthFloor
        : Math.max(config.population.wealthFloor, normalizedWealth);
    const lastWealthDelta = boundedWealth - agent.wealth;
    const becameBankrupt =
      boundedWealth <= config.population.wealthFloor &&
      agent.wealth > config.population.wealthFloor;

    return {
      ...agent,
      wealth: boundedWealth,
      lastWealthDelta,
      bankruptCount: becameBankrupt
        ? agent.bankruptCount + 1
        : agent.bankruptCount,
    };
  });
}

export function stepSimulation(
  state: SimulationRuntimeState,
  config: SimulationConfig,
  policies: Policy[] = [],
  composerRules: CompiledComposerRule[] = [],
): SimulationRuntimeState {
  const speedScale = getSpeedProfileMultiplier(config.movement.speedProfile);
  const nextStep = state.step + 1;
  const bounds = {
    width: config.arena.width,
    height: config.arena.height,
  };
  const movedAgents = moveAgents(
    state.agents,
    bounds,
    config.movement.agentSpeed * speedScale,
  );
  const resolvedAgents = resolveAgentCollisions(
    movedAgents,
    bounds,
    config.movement.agentSpeed * speedScale,
  );
  const movedEvents = moveEvents(
    state.events,
    bounds,
    config.movement.eventSpeed * speedScale,
  );
  const resolvedEvents = resolveEventCollisions(
    movedEvents,
    bounds,
    config.movement.eventSpeed * speedScale,
  );
  const collisions = detectAgentEventCollisions(resolvedAgents, resolvedEvents);
  const mixedResolution = resolveAgentEventCollisions(
    resolvedAgents,
    resolvedEvents,
    bounds,
    config.movement.agentSpeed * speedScale,
    config.movement.eventSpeed * speedScale,
  );
  const wealthUpdatedAgents = applyCollisionRules(
    mixedResolution.agents,
    collisions,
    nextStep,
    config,
  );
  const policyResult = applyPolicies(
    wealthUpdatedAgents,
    policies,
    config,
    nextStep,
  );
  const composerResult = applyComposerRules(
    policyResult.agents,
    composerRules,
    config,
    nextStep,
  );
  const medianWealth = median(
    composerResult.agents.map((agent) => agent.wealth),
  );
  const nextAgents = composerResult.agents.map((agent) => ({
    ...agent,
    happiness: calculateHappiness(agent, medianWealth, config),
  }));

  return {
    step: nextStep,
    agents: nextAgents,
    events: mixedResolution.events,
    lastPolicyCost:
      policyResult.summary.netCost + composerResult.summary.netCost,
  };
}
