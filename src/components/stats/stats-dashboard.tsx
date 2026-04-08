"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { useLanguage } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";
import {
  getLocaleTag,
  translateMetricLabel,
  translateUi,
} from "@/lib/i18n/ui";
import { useSimulationStore } from "@/store/simulationStore";
import type { ComparisonCard } from "@/types/metrics";

const metricPreference: Record<ComparisonCard["key"], "higher" | "lower"> = {
  averageWealth: "higher",
  meanHappiness: "higher",
  giniCoefficient: "lower",
  povertyRate: "lower",
  top10WealthShare: "lower",
  policyCost: "lower",
};

function formatNumber(
  value: number,
  localeTag: string,
  maximumFractionDigits = 1,
) {
  return new Intl.NumberFormat(localeTag, {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatPercent(
  value: number,
  localeTag: string,
  maximumFractionDigits = 1,
) {
  return `${formatNumber(value * 100, localeTag, maximumFractionDigits)}%`;
}

function formatSigned(
  value: number,
  localeTag: string,
  maximumFractionDigits = 1,
) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, localeTag, maximumFractionDigits)}`;
}

function formatSignedPercent(
  value: number | null,
  localeTag: string,
  maximumFractionDigits = 1,
) {
  if (value === null) {
    return localeTag.startsWith("ko") ? "해당 없음" : "n/a";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, localeTag, maximumFractionDigits)}%`;
}

function StatCard({
  label,
  value,
  note,
  accent = "default",
}: {
  label: string;
  value: string;
  note: string;
  accent?: "default" | "dark" | "warm";
}) {
  return (
    <article
      className={cn(
        "rounded-[1.5rem] border p-5 shadow-[0_14px_40px_rgba(14,59,64,0.05)]",
        accent === "dark" &&
          "border-slate-900/80 bg-slate-950 text-slate-50 shadow-[0_18px_48px_rgba(15,23,42,0.24)]",
        accent === "warm" && "border-amber-200/70 bg-amber-50/80",
        accent === "default" && "border-border/70 bg-white/80",
      )}
    >
      <p
        className={cn(
          "text-xs uppercase tracking-[0.24em]",
          accent === "dark" ? "text-slate-400" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p
        className={cn(
          "mt-2 text-sm leading-6",
          accent === "dark" ? "text-slate-300" : "text-muted-foreground",
        )}
      >
        {note}
      </p>
    </article>
  );
}

function ComparisonCardView({
  card,
  localeTag,
  language,
}: {
  card: ComparisonCard;
  localeTag: string;
  language: "ko" | "en";
}) {
  const preference = metricPreference[card.key];
  const isPositiveOutcome =
    preference === "higher" ? card.delta >= 0 : card.delta <= 0;

  return (
    <article className="rounded-[1.35rem] border border-border/70 bg-white/85 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {translateMetricLabel(language, card.key)}
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {card.key === "giniCoefficient" ||
            card.key === "povertyRate" ||
            card.key === "top10WealthShare"
              ? formatPercent(card.current, localeTag)
              : formatNumber(card.current, localeTag)}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            isPositiveOutcome
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700",
          )}
        >
          {card.key === "giniCoefficient" ||
          card.key === "povertyRate" ||
          card.key === "top10WealthShare"
            ? `${card.delta > 0 ? "+" : ""}${formatPercent(card.delta, localeTag)}`
            : formatSigned(card.delta, localeTag)}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>{translateUi(language, "Baseline")} {card.key === "giniCoefficient" ||
        card.key === "povertyRate" ||
        card.key === "top10WealthShare"
          ? formatPercent(card.baseline, localeTag)
          : formatNumber(card.baseline, localeTag)}</span>
        <span>{formatSignedPercent(card.deltaPercent, localeTag)}</span>
      </div>
    </article>
  );
}

function ChartShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-[1.75rem] border border-border/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(14,59,64,0.05)]">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          {eyebrow}
        </p>
        <h3 className="font-[family-name:var(--font-display)] text-2xl leading-tight">
          {title}
        </h3>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="mt-5 h-[320px]">{children}</div>
    </article>
  );
}

function EmptyComparisonState() {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-border bg-white/60 p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
        Comparison Locked
      </p>
      <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl">
        Baseline snapshots are ready, but no policy set is applied yet.
      </h3>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Use the control studio above, keep the seed fixed, then press Apply + Reset.
        Presets and custom rules both feed this same-seed comparison surface.
      </p>
    </div>
  );
}

function ChartPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center rounded-[1.25rem] border border-dashed border-border/80 bg-muted/35 px-6 text-center text-sm leading-6 text-muted-foreground">
      Chart mounts on the client after layout is measured.
    </div>
  );
}

export function StatsDashboard() {
  const { language } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);
  const localeTag = getLocaleTag(language);
  const runtimeStep = useSimulationStore((state) => state.runtimeStep);
  const statsSnapshot = useSimulationStore((state) => state.statsSnapshot);
  const metricsHistory = useSimulationStore((state) => state.metricsHistory);
  const comparisonSnapshot = useSimulationStore(
    (state) => state.comparisonSnapshot,
  );
  const comparisonHistory = useSimulationStore((state) => state.comparisonHistory);
  const policiesApplied = useSimulationStore((state) => state.policiesApplied);

  const metrics = statsSnapshot.metrics;
  const trendData = metricsHistory.map((point) => ({
    step: point.step,
    averageWealth: Number(point.averageWealth.toFixed(2)),
    meanHappiness: Number(point.meanHappiness.toFixed(2)),
    gini: Number((point.giniCoefficient * 100).toFixed(2)),
    poverty: Number((point.povertyRate * 100).toFixed(2)),
    policyCost: Number(point.policyCost.toFixed(2)),
  }));
  const comparisonData = comparisonHistory.map((point) => ({
    step: point.step,
    currentGini: Number((point.currentGini * 100).toFixed(2)),
    baselineGini: Number((point.baselineGini * 100).toFixed(2)),
    currentHappiness: Number(point.currentHappiness.toFixed(2)),
    baselineHappiness: Number(point.baselineHappiness.toFixed(2)),
    currentPoverty: Number((point.currentPoverty * 100).toFixed(2)),
    baselinePoverty: Number((point.baselinePoverty * 100).toFixed(2)),
  }));
  const comparisonActive = policiesApplied.length > 0;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section className="space-y-6 py-2">
      <div className="space-y-3 rounded-[1.9rem] border border-border/80 bg-white/75 p-6 shadow-[0_20px_60px_rgba(14,59,64,0.05)] backdrop-blur">
        <div className="inline-flex w-fit rounded-full border border-border/70 bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {language === "ko" ? "같은 seed 비교" : "Same-Seed Evidence"}
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight">
          {language === "ko"
            ? "이 구역에서는 움직임이 아니라 결과를 읽어야 합니다."
            : "This section should read as evidence, not just motion."}
        </h2>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          {language === "ko"
            ? "baseline과 개입 결과는 같은 seed에서 비교해야 합니다. 그래야 Gini, 행복, 빈곤율, 상위 10% 점유율 변화가 정책 때문인지 읽을 수 있습니다."
            : "Baseline and intervention results only make sense on the same seed. That is what lets you read Gini, happiness, poverty, and top-share deltas as policy effects."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label={translateUi(language, "Runtime Step")}
          value={formatNumber(runtimeStep, localeTag, 0)}
          note={`${translateUi(language, "Captured metrics currently at step")} ${metrics.step.toLocaleString(localeTag)}.`}
          accent="dark"
        />
        <StatCard
          label={translateUi(language, "Gini")}
          value={formatPercent(metrics.giniCoefficient, localeTag)}
          note={translateUi(
            language,
            "Lower means wealth is distributed more evenly.",
          )}
        />
        <StatCard
          label={translateUi(language, "Poverty Rate")}
          value={formatPercent(metrics.povertyRate, localeTag)}
          note={translateUi(
            language,
            "Share of agents at or below the effective wealth floor.",
          )}
        />
        <StatCard
          label={translateUi(language, "Bankruptcy Rate")}
          value={formatPercent(metrics.bankruptcyRate, localeTag)}
          note={translateUi(
            language,
            "Share of agents who have crossed into bankruptcy at least once.",
          )}
        />
        <StatCard
          label={translateUi(language, "Policy Cost")}
          value={formatNumber(metrics.policyCost, localeTag)}
          note={translateUi(
            language,
            "Positive is spend. Negative indicates net revenue from taxes.",
          )}
          accent="warm"
        />
      </div>

      {comparisonActive && comparisonSnapshot ? (
        <section className="space-y-4 rounded-[1.9rem] border border-border/80 bg-white/75 p-6 shadow-[0_20px_60px_rgba(14,59,64,0.05)] backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                {translateUi(language, "Baseline vs Policy")}
              </p>
              <h3 className="font-[family-name:var(--font-display)] text-3xl leading-tight">
                {translateUi(language, "Same seed, same world, different rules.")}
              </h3>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {translateUi(
                  language,
                  "Delta cards below compare the active policy run against the no-policy baseline initialized from the same seed.",
                )}
              </p>
            </div>
            <div className="rounded-full border border-border/70 bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground">
              {translateUi(language, "Step")}{" "}
              {comparisonSnapshot.step.toLocaleString(localeTag)}
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {comparisonSnapshot.cards.map((card) => (
              <ComparisonCardView
                key={card.key}
                card={card}
                language={language}
                localeTag={localeTag}
              />
            ))}
          </div>
        </section>
      ) : (
        <EmptyComparisonState />
      )}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <ChartShell
          eyebrow={translateUi(language, "Trend")}
          title={translateUi(language, "Core KPI trajectory")}
          description={translateUi(
            language,
            "Average wealth is plotted against happiness and inequality snapshots captured every five ticks.",
          )}
        >
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(17,72,79,0.08)"
                />
                <XAxis dataKey="step" stroke="#4b6165" />
                <YAxis yAxisId="wealth" stroke="#0f4f56" />
                <YAxis yAxisId="social" orientation="right" stroke="#9a4b2b" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="wealth"
                  type="monotone"
                  dataKey="averageWealth"
                  stroke="#0f7a83"
                  strokeWidth={2.5}
                  dot={false}
                  name={translateUi(language, "Average wealth")}
                />
                <Line
                  yAxisId="social"
                  type="monotone"
                  dataKey="meanHappiness"
                  stroke="#d97706"
                  strokeWidth={2.25}
                  dot={false}
                  name={translateUi(language, "Mean happiness")}
                />
                <Line
                  yAxisId="social"
                  type="monotone"
                  dataKey="gini"
                  stroke="#be123c"
                  strokeWidth={2}
                  dot={false}
                  name={translateUi(language, "Gini (%)")}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartPlaceholder />
          )}
        </ChartShell>

        <ChartShell
          eyebrow={translateUi(language, "Distribution")}
          title={translateUi(language, "Wealth histogram")}
          description={translateUi(
            language,
            "Distribution bins are derived from the captured agent state, not from the canvas render path.",
          )}
        >
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsSnapshot.wealthHistogram}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(17,72,79,0.08)"
                />
                <XAxis dataKey="label" hide />
                <YAxis stroke="#4b6165" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f7a83" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartPlaceholder />
          )}
        </ChartShell>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <ChartShell
          eyebrow={translateUi(language, "Scatter")}
          title={translateUi(language, "Talent vs wealth")}
          description={translateUi(
            language,
            "Each dot is an agent snapshot. Bubble size tracks happiness so upward mobility and welfare can be read together.",
          )}
        >
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 12, bottom: 12, left: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(17,72,79,0.08)"
                />
                <XAxis
                  type="number"
                  dataKey="talent"
                  name={translateUi(language, "Talent")}
                  stroke="#4b6165"
                  domain={[0, 1]}
                />
                <YAxis
                  type="number"
                  dataKey="wealth"
                  name={translateUi(language, "Wealth")}
                  stroke="#4b6165"
                />
                <ZAxis
                  type="number"
                  dataKey="happiness"
                  name={translateUi(language, "Happiness")}
                  range={[50, 220]}
                />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter
                  data={statsSnapshot.talentWealthScatter}
                  fill="rgba(217,119,6,0.75)"
                />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <ChartPlaceholder />
          )}
        </ChartShell>

        <ChartShell
          eyebrow={translateUi(language, "Comparison")}
          title={translateUi(language, "Policy run against baseline")}
          description={translateUi(
            language,
            "Once a policy set is applied, inequality, poverty, and happiness lines stay paired to the same seed for fair comparison.",
          )}
        >
          {comparisonActive && comparisonData.length > 0 && isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(17,72,79,0.08)"
                />
                <XAxis dataKey="step" stroke="#4b6165" />
                <YAxis yAxisId="index" stroke="#0f7a83" />
                <YAxis yAxisId="percent" orientation="right" stroke="#9a4b2b" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="index"
                  type="monotone"
                  dataKey="currentHappiness"
                  stroke="#0f7a83"
                  strokeWidth={2.4}
                  dot={false}
                  name={translateUi(language, "Current happiness")}
                />
                <Line
                  yAxisId="index"
                  type="monotone"
                  dataKey="baselineHappiness"
                  stroke="#7dd3fc"
                  strokeWidth={2}
                  dot={false}
                  name={translateUi(language, "Baseline happiness")}
                />
                <Line
                  yAxisId="percent"
                  type="monotone"
                  dataKey="currentGini"
                  stroke="#be123c"
                  strokeWidth={2.2}
                  dot={false}
                  name={translateUi(language, "Current gini (%)")}
                />
                <Line
                  yAxisId="percent"
                  type="monotone"
                  dataKey="baselineGini"
                  stroke="#fda4af"
                  strokeWidth={2}
                  dot={false}
                  name={translateUi(language, "Baseline gini (%)")}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[1.25rem] border border-dashed border-border/80 bg-muted/35 px-6 text-center text-sm leading-6 text-muted-foreground">
              {translateUi(
                language,
                "Apply a preset or custom rule set from the control panel with the same seed to unlock paired baseline history.",
              )}
            </div>
          )}
        </ChartShell>
      </div>
    </section>
  );
}
