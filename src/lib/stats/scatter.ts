import type { ScatterPoint } from "@/types/metrics";
import type { Agent } from "@/types/simulation";

export function buildTalentWealthScatter(
  agents: Agent[],
  maxPoints = 500,
): ScatterPoint[] {
  if (agents.length <= maxPoints) {
    return agents.map((agent) => ({
      talent: Number(agent.talent.toFixed(4)),
      wealth: Number(agent.wealth.toFixed(2)),
      happiness: Number(agent.happiness.toFixed(2)),
    }));
  }

  const stride = Math.ceil(agents.length / maxPoints);

  return agents
    .filter((_, index) => index % stride === 0)
    .map((agent) => ({
      talent: Number(agent.talent.toFixed(4)),
      wealth: Number(agent.wealth.toFixed(2)),
      happiness: Number(agent.happiness.toFixed(2)),
    }));
}
