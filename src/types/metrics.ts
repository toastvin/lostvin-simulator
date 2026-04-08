export type MetricsSnapshot = {
  step: number;
  totalWealth: number;
  averageWealth: number;
  medianWealth: number;
  top10WealthShare: number;
  giniCoefficient: number;
  povertyRate: number;
  bankruptcyRate: number;
  meanHappiness: number;
  talentWealthCorrelation: number;
  policyCost: number;
  populationSize: number;
};

export type HistogramBin = {
  label: string;
  min: number;
  max: number;
  count: number;
};

export type ScatterPoint = {
  talent: number;
  wealth: number;
  happiness: number;
};

export type StatsSnapshot = {
  metrics: MetricsSnapshot;
  wealthHistogram: HistogramBin[];
  talentWealthScatter: ScatterPoint[];
};

export type ComparisonCard = {
  key: string;
  label: string;
  current: number;
  baseline: number;
  delta: number;
  deltaPercent: number | null;
};

export type MetricsComparison = {
  step: number;
  current: MetricsSnapshot;
  baseline: MetricsSnapshot;
  cards: ComparisonCard[];
};

export type ComparisonHistoryPoint = {
  step: number;
  currentGini: number;
  baselineGini: number;
  currentHappiness: number;
  baselineHappiness: number;
  currentPoverty: number;
  baselinePoverty: number;
};
