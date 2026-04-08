import type { MetricsSnapshot } from "@/types/metrics";
import type { SimulationConfig } from "@/types/config";
import type { Agent, EventNode } from "@/types/simulation";

import { initializePopulation } from "./initialize";

function correlation(valuesA: number[], valuesB: number[]) {
  const n = valuesA.length;
  if (n === 0 || n !== valuesB.length) {
    return 0;
  }

  const meanA = valuesA.reduce((sum, value) => sum + value, 0) / n;
  const meanB = valuesB.reduce((sum, value) => sum + value, 0) / n;

  let numerator = 0;
  let sumSqA = 0;
  let sumSqB = 0;

  for (let index = 0; index < n; index += 1) {
    const deltaA = valuesA[index] - meanA;
    const deltaB = valuesB[index] - meanB;
    numerator += deltaA * deltaB;
    sumSqA += deltaA * deltaA;
    sumSqB += deltaB * deltaB;
  }

  if (sumSqA === 0 || sumSqB === 0) {
    return 0;
  }

  return numerator / Math.sqrt(sumSqA * sumSqB);
}

function gini(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const total = sorted.reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    return 0;
  }

  let weightedSum = 0;
  sorted.forEach((value, index) => {
    weightedSum += (index + 1) * value;
  });

  return (2 * weightedSum) / (sorted.length * total) - (sorted.length + 1) / sorted.length;
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function top10Share(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => right - left);
  const take = Math.max(1, Math.ceil(sorted.length * 0.1));
  const total = sorted.reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    return 0;
  }

  return (
    sorted.slice(0, take).reduce((sum, value) => sum + value, 0) /
    total
  );
}

export function createInitialPopulation(
  seed: number,
  config: SimulationConfig,
): { agents: Agent[]; events: EventNode[] } {
  return initializePopulation(seed, config);
}

export function createInitialMetricsSnapshot(
  agents: Agent[],
): MetricsSnapshot {
  return createMetricsSnapshot(0, agents, 0);
}

export function createMetricsSnapshot(
  step: number,
  agents: Agent[],
  policyCost: number,
): MetricsSnapshot {
  const wealths = agents.map((agent) => agent.wealth);
  const talents = agents.map((agent) => agent.talent);
  const happinessValues = agents.map((agent) => agent.happiness);
  const totalWealth = wealths.reduce((sum, value) => sum + value, 0);
  const populationSize = agents.length;

  return {
    step,
    totalWealth,
    averageWealth: populationSize === 0 ? 0 : totalWealth / populationSize,
    medianWealth: median(wealths),
    top10WealthShare: top10Share(wealths),
    giniCoefficient: gini(wealths),
    povertyRate:
      populationSize === 0
        ? 0
        : wealths.filter((wealth) => wealth <= 0).length / populationSize,
    bankruptcyRate:
      populationSize === 0
        ? 0
        : agents.filter((agent) => agent.bankruptCount > 0).length /
          populationSize,
    meanHappiness:
      populationSize === 0
        ? 0
        : happinessValues.reduce((sum, value) => sum + value, 0) /
          populationSize,
    talentWealthCorrelation: correlation(talents, wealths),
    policyCost,
    populationSize,
  };
}
