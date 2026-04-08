import type { HistogramBin } from "@/types/metrics";
import type { Agent } from "@/types/simulation";

export function buildWealthHistogram(
  agents: Agent[],
  binCount = 12,
): HistogramBin[] {
  if (agents.length === 0) {
    return [];
  }

  const wealths = agents.map((agent) => agent.wealth);
  const maxWealth = Math.max(...wealths, 1);
  const binSize = Math.max(1, maxWealth / binCount);

  const bins = Array.from({ length: binCount }, (_, index) => {
    const min = index * binSize;
    const max = index === binCount - 1 ? maxWealth : (index + 1) * binSize;

    return {
      label: `${Math.round(min)}-${Math.round(max)}`,
      min,
      max,
      count: 0,
    };
  });

  wealths.forEach((wealth) => {
    const rawIndex = Math.floor(wealth / binSize);
    const index = Math.min(rawIndex, binCount - 1);
    bins[index].count += 1;
  });

  return bins;
}
