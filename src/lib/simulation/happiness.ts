import { clamp } from "@/lib/math";
import type { SimulationConfig } from "@/types/config";
import type { Agent } from "@/types/simulation";

export function calculateHappiness(
  agent: Agent,
  medianWealth: number,
  config: SimulationConfig,
): number {
  const securityScore = clamp(
    agent.wealth / config.happiness.comfortableWealth,
    0,
    1,
  );
  const trendScore = clamp(
    (agent.lastWealthDelta + config.happiness.trendClamp) /
      (2 * config.happiness.trendClamp),
    0,
    1,
  );
  const relativeScore = clamp(agent.wealth / Math.max(medianWealth, 1), 0, 1);
  const bankruptcyPenalty =
    agent.wealth <= config.population.wealthFloor
      ? config.happiness.bankruptcyPenalty
      : 0;

  const happiness01 =
    securityScore * 0.5 +
    trendScore * 0.25 +
    relativeScore * 0.25 -
    bankruptcyPenalty;

  return clamp(happiness01, 0, 1) * 100;
}
