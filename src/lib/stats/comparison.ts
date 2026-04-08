import type {
  ComparisonCard,
  ComparisonHistoryPoint,
  MetricsComparison,
  MetricsSnapshot,
} from "@/types/metrics";

function buildCard(
  key: string,
  label: string,
  current: number,
  baseline: number,
): ComparisonCard {
  const delta = current - baseline;
  const deltaPercent =
    baseline === 0 ? null : (delta / Math.abs(baseline)) * 100;

  return {
    key,
    label,
    current,
    baseline,
    delta,
    deltaPercent,
  };
}

export function buildMetricsComparison(
  current: MetricsSnapshot,
  baseline: MetricsSnapshot,
): MetricsComparison {
  return {
    step: current.step,
    current,
    baseline,
    cards: [
      buildCard(
        "averageWealth",
        "Average Wealth",
        current.averageWealth,
        baseline.averageWealth,
      ),
      buildCard(
        "meanHappiness",
        "Mean Happiness",
        current.meanHappiness,
        baseline.meanHappiness,
      ),
      buildCard(
        "giniCoefficient",
        "Gini",
        current.giniCoefficient,
        baseline.giniCoefficient,
      ),
      buildCard(
        "povertyRate",
        "Poverty Rate",
        current.povertyRate,
        baseline.povertyRate,
      ),
      buildCard(
        "top10WealthShare",
        "Top 10% Share",
        current.top10WealthShare,
        baseline.top10WealthShare,
      ),
      buildCard(
        "policyCost",
        "Policy Cost",
        current.policyCost,
        baseline.policyCost,
      ),
    ],
  };
}

export function buildComparisonHistoryPoint(
  current: MetricsSnapshot,
  baseline: MetricsSnapshot,
): ComparisonHistoryPoint {
  return {
    step: current.step,
    currentGini: current.giniCoefficient,
    baselineGini: baseline.giniCoefficient,
    currentHappiness: current.meanHappiness,
    baselineHappiness: baseline.meanHappiness,
    currentPoverty: current.povertyRate,
    baselinePoverty: baseline.povertyRate,
  };
}
