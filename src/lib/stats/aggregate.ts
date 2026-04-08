import type { MetricsSnapshot, StatsSnapshot } from "@/types/metrics";
import type { Agent } from "@/types/simulation";

import { buildWealthHistogram } from "./histogram";
import { buildTalentWealthScatter } from "./scatter";

export function createStatsSnapshot(
  metrics: MetricsSnapshot,
  agents: Agent[],
): StatsSnapshot {
  return {
    metrics,
    wealthHistogram: buildWealthHistogram(agents),
    talentWealthScatter: buildTalentWealthScatter(agents),
  };
}
