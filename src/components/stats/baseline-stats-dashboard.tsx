"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { getLocaleTag } from "@/lib/i18n/ui";
import { cn } from "@/lib/utils";
import { useSimulationStore } from "@/store/simulationStore";

type DistributionBin = {
  label: string;
  min: number;
  max: number;
  count: number;
};

type ScaleMode = "raw" | "log";

function buildDistribution(
  values: number[],
  options: {
    binCount: number;
    maxValue?: number;
    fixedMax?: boolean;
    transform?: (value: number) => number;
    inverseTransform?: (value: number) => number;
    labelFormatter?: (min: number, max: number) => string;
  },
): DistributionBin[] {
  if (values.length === 0) {
    return [];
  }

  const transform = options.transform ?? ((value: number) => value);
  const inverseTransform =
    options.inverseTransform ?? ((value: number) => value);
  const rawMaxValue = options.fixedMax
    ? Math.max(options.maxValue ?? 1, 1)
    : Math.max(...values, options.maxValue ?? 1, 1);
  const transformedMaxValue = Math.max(transform(rawMaxValue), 1e-6);
  const binSize = transformedMaxValue / options.binCount;

  const bins = Array.from({ length: options.binCount }, (_, index) => {
    const transformedMin = index * binSize;
    const transformedMax =
      index === options.binCount - 1
        ? transformedMaxValue
        : (index + 1) * binSize;
    const min = inverseTransform(transformedMin);
    const max = inverseTransform(transformedMax);

    return {
      label:
        options.labelFormatter?.(min, max) ??
        `${Math.round(min)}-${Math.round(max)}`,
      min,
      max,
      count: 0,
    };
  });

  values.forEach((value) => {
    const boundedRawValue = Math.min(Math.max(value, 0), rawMaxValue);
    const boundedTransformedValue = Math.min(
      Math.max(transform(boundedRawValue), 0),
      transformedMaxValue,
    );
    const rawIndex = Math.floor(
      (boundedTransformedValue / transformedMaxValue) * options.binCount,
    );
    const index = Math.min(rawIndex, options.binCount - 1);
    bins[index].count += 1;
  });

  return bins;
}

function StatCard({
  title,
  value,
  note,
  compact = false,
}: {
  title: string;
  value: string;
  note: string;
  compact?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-[1.4rem] border border-border/70 bg-white/90 shadow-[0_14px_40px_rgba(14,59,64,0.04)]",
        compact ? "p-4" : "p-5",
      )}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </p>
      <p className={cn("mt-3 font-semibold", compact ? "text-2xl" : "text-3xl")}>
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
    </article>
  );
}

function CompactStatCell({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[1rem] bg-white/95 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      <p className="mt-1 text-xl font-semibold leading-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{note}</p>
    </div>
  );
}

function ChartCard({
  title,
  description,
  axisNote,
  countLabel,
  data,
  barColor,
  controls,
  compact = false,
  compactNote,
}: {
  title: string;
  description: string;
  axisNote: string;
  countLabel: string;
  data: DistributionBin[];
  barColor: string;
  controls?: ReactNode;
  compact?: boolean;
  compactNote?: string;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <article
      className={cn(
        "rounded-[1.7rem] border border-border/70 bg-white/90 shadow-[0_18px_50px_rgba(14,59,64,0.05)]",
        compact ? "flex h-full flex-col p-2.5" : "p-5",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3
          className={cn(
            "font-[family-name:var(--font-display)] leading-tight",
            compact ? "text-base" : "text-2xl",
          )}
        >
          {title}
        </h3>
        {controls}
      </div>
      {compact ? (
        <p className="mt-0.5 text-[10px] leading-3 text-muted-foreground">
          {compactNote ?? description}
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {axisNote}
          </p>
        </>
      )}
      <div
        className={cn(
          compact ? "mt-1.5 min-h-0 flex-1" : "mt-4 h-[300px]",
        )}
      >
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(17,72,79,0.08)"
              />
              <XAxis
                dataKey="label"
                stroke="#4b6165"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={18}
                tickMargin={8}
              />
              <YAxis
                stroke="#4b6165"
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                width={42}
              />
              <Tooltip
                formatter={(value) => [value, countLabel]}
                labelFormatter={(_, payload) => {
                  const bin = payload?.[0]?.payload as DistributionBin | undefined;

                  if (!bin) {
                    return "";
                  }

                  return bin.label;
                }}
              />
              <Bar dataKey="count" fill={barColor} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[1.25rem] border border-dashed border-border/80 bg-muted/35 px-6 text-center text-sm leading-6 text-muted-foreground">
            Chart loads after layout is measured.
          </div>
        )}
      </div>
    </article>
  );
}

type BaselineStatsDashboardProps = {
  compact?: boolean;
  hideSummary?: boolean;
};

export function BaselineStatsDashboard({
  compact = false,
  hideSummary = false,
}: BaselineStatsDashboardProps) {
  const { language } = useLanguage();
  const localeTag = getLocaleTag(language);
  const agents = useSimulationStore((state) => state.agents);
  const metrics = useSimulationStore((state) => state.metrics);
  const [wealthScale, setWealthScale] = useState<ScaleMode>("log");

  const formatNumber = (value: number, maximumFractionDigits = 1) =>
    new Intl.NumberFormat(localeTag, {
      maximumFractionDigits,
      minimumFractionDigits: 0,
    }).format(value);

  const formatDistributionRange = (min: number, max: number) =>
    `${formatNumber(min, max >= 10 ? 0 : 1)}-${formatNumber(
      max,
      max >= 10 ? 0 : 1,
    )}`;

  const wealthDistribution = buildDistribution(
    agents.map((agent) => agent.wealth),
    wealthScale === "log"
      ? {
          binCount: 12,
          transform: (value) => Math.log10(value + 1),
          inverseTransform: (value) => Math.max(0, 10 ** value - 1),
          labelFormatter: formatDistributionRange,
        }
      : {
          binCount: 12,
          labelFormatter: formatDistributionRange,
        },
  );
  const happinessDistribution = buildDistribution(
    agents.map((agent) => agent.happiness),
    {
      binCount: 10,
      maxValue: 100,
      fixedMax: true,
      labelFormatter: formatDistributionRange,
    },
  );
  const peopleNearZero = agents.filter((agent) => agent.wealth <= 1).length;
  const averageHappiness =
    agents.length === 0
      ? 0
      : agents.reduce((sum, agent) => sum + agent.happiness, 0) / agents.length;

  const formatPercent = (value: number) => `${formatNumber(value * 100)}%`;
  const normalityNote =
    language === "ko"
      ? "정규분포인 것은 초기 재능뿐입니다. 자산은 긴 꼬리를 만들 수 있고 행복은 0~100 범위에서 잘립니다."
      : "Only initial talent starts normal. Wealth can develop a long tail, and happiness is clipped into a 0-100 range.";
  const compactMetricNotes =
    language === "ko"
      ? {
          averageWealth: "1인 평균",
          medianWealth: "중간값",
          meanHappiness: "0~100 체감",
          nearZeroWealth: `Gini ${formatPercent(metrics.giniCoefficient)}`,
        }
      : {
          averageWealth: "per person",
          medianWealth: "middle point",
          meanHappiness: "felt score",
          nearZeroWealth: `Gini ${formatPercent(metrics.giniCoefficient)}`,
        };

  return (
    <section
      className={cn(
        "py-2",
        compact ? "space-y-4" : "space-y-6",
        compact && hideSummary && "flex h-full flex-col py-0",
      )}
    >
      {compact && !hideSummary ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex rounded-full border border-border/70 bg-white px-3 py-1 text-xs font-medium text-foreground">
              {language === "ko" ? "실시간 분포" : "Live Distributions"}
            </span>
            <p className="max-w-[15rem] text-right text-[11px] leading-4 text-muted-foreground">
              {normalityNote}
            </p>
          </div>
          <div className="grid gap-2 rounded-[1.3rem] border border-border/70 bg-muted/25 p-2 sm:grid-cols-2">
            <CompactStatCell
              title={language === "ko" ? "평균 자산" : "Average Wealth"}
              value={formatNumber(metrics.averageWealth)}
              note={compactMetricNotes.averageWealth}
            />
            <CompactStatCell
              title={language === "ko" ? "중앙 자산" : "Median Wealth"}
              value={formatNumber(metrics.medianWealth)}
              note={compactMetricNotes.medianWealth}
            />
            <CompactStatCell
              title={language === "ko" ? "평균 행복" : "Mean Happiness"}
              value={formatNumber(averageHappiness)}
              note={compactMetricNotes.meanHappiness}
            />
            <CompactStatCell
              title={language === "ko" ? "낮은 자산 인원" : "Near-Zero Wealth"}
              value={formatNumber(peopleNearZero, 0)}
              note={compactMetricNotes.nearZeroWealth}
            />
          </div>
        </div>
      ) : !compact ? (
        <>
          <div
            className={cn(
              "rounded-[1.9rem] border border-border/80 bg-white/80 shadow-[0_20px_60px_rgba(14,59,64,0.05)] backdrop-blur",
              "p-6",
            )}
          >
            <span className="inline-flex rounded-full border border-border/70 bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {language === "ko" ? "실시간 분포" : "Live Distributions"}
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight">
              {language === "ko"
                ? "사람들의 자산과 행복이 지금 어떤 분포를 만들고 있는지 바로 봅니다."
                : "Watch the live wealth and happiness distributions as the world evolves."}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              {language === "ko"
                ? "복잡한 정책 비교보다 먼저, 현재 기본모델이 실제로 어떤 모양의 분포를 만드는지 읽는 것이 중요합니다."
                : "Before any policy comparison, the important thing is to read what shape the baseline model is producing right now."}
            </p>
            <div className="mt-5 rounded-[1.4rem] border border-amber-200/80 bg-amber-50/85 p-4">
              <p className="text-sm font-semibold text-amber-950">
                {language === "ko"
                  ? "이 분포가 정규분포라고 가정하면 안 됩니다."
                  : "Do not assume these outputs are normal distributions."}
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-950/80">
                {language === "ko"
                  ? "정규분포인 것은 초기 재능 분포뿐입니다. 자산 분포는 초록점/빨간점의 곱셈 효과 때문에 한쪽으로 긴 꼬리를 가질 수 있고, 행복 분포는 0~100 범위에 잘린 결과값이라 정규분포가 아닐 수 있습니다."
                  : "Only initial talent is normally distributed. Wealth can become skewed because green and red dots change wealth multiplicatively, and happiness is bounded between 0 and 100, so its shape is not expected to stay normal."}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title={language === "ko" ? "평균 자산" : "Average Wealth"}
              value={formatNumber(metrics.averageWealth)}
              note={
                language === "ko"
                  ? "사람 1명당 평균적으로 얼마를 가지고 있는지"
                  : "The average wealth per person"
              }
            />
            <StatCard
              title={language === "ko" ? "중앙 자산" : "Median Wealth"}
              value={formatNumber(metrics.medianWealth)}
              note={
                language === "ko"
                  ? "딱 가운데 사람의 자산 수준"
                  : "The wealth level of the middle person"
              }
            />
            <StatCard
              title={language === "ko" ? "평균 행복" : "Mean Happiness"}
              value={formatNumber(averageHappiness)}
              note={
                language === "ko"
                  ? "현재 자산 상태가 체감 행복에 어떻게 반영되는지"
                  : "How current conditions are mapping into felt wellbeing"
              }
            />
            <StatCard
              title={language === "ko" ? "낮은 자산 인원" : "Near-Zero Wealth"}
              value={formatNumber(peopleNearZero, 0)}
              note={
                language === "ko"
                  ? `지니계수 ${formatPercent(metrics.giniCoefficient)}`
                  : `Gini ${formatPercent(metrics.giniCoefficient)}`
              }
            />
          </div>
        </>
      ) : null}

      <div
        className={cn(
          "grid",
          compact
            ? hideSummary
              ? "h-full flex-1 grid-rows-2 gap-2"
              : "gap-4"
            : "gap-6 xl:grid-cols-2",
        )}
      >
        <ChartCard
          title={language === "ko" ? "자산 분포" : "Wealth Distribution"}
          description={
            wealthScale === "log"
              ? language === "ko"
                ? "로그 모드에서는 긴 꼬리를 눌러서, 낮은 자산 구간과 높은 자산 구간을 함께 읽기 쉽게 만듭니다."
                : "Log mode compresses the long tail so low-wealth and high-wealth regions remain readable together."
              : language === "ko"
                ? "정규분포 여부를 보는 차트가 아니라, 자산이 어느 구간에 얼마나 몰려 있는지 보는 결과 분포입니다."
                : "This is an outcome distribution, not a normality check. It shows where wealth is clustering."
          }
          axisNote={
            wealthScale === "log"
              ? language === "ko"
                ? "x축 = 로그 간격으로 나눈 자산 구간, y축 = 그 구간에 있는 사람 수"
                : "x-axis = wealth bins spaced on a log scale, y-axis = number of people in that range"
              : language === "ko"
                ? "x축 = 자산 구간, y축 = 그 구간에 있는 사람 수"
                : "x-axis = wealth range, y-axis = number of people in that range"
          }
          countLabel={language === "ko" ? "사람 수" : "people"}
          data={wealthDistribution}
          barColor="#0f7a83"
          compact={compact}
          compactNote={
            wealthScale === "log"
              ? language === "ko"
                ? "로그 모드로 긴 꼬리를 눌러 낮은 구간과 높은 구간을 같이 읽습니다."
                : "Log mode compresses the long tail so low and high ranges stay readable."
              : language === "ko"
                ? "자산이 어느 구간에 몰리는지 바로 읽습니다."
                : "Read where wealth is clustering."
          }
          controls={
            <div className="inline-flex rounded-full border border-border/80 bg-secondary/70 p-1">
              <Button
                size="default"
                variant={wealthScale === "raw" ? "default" : "outline"}
                className="h-8 px-3 text-xs"
                onClick={() => setWealthScale("raw")}
              >
                {language === "ko" ? "기본" : "Raw"}
              </Button>
              <Button
                size="default"
                variant={wealthScale === "log" ? "default" : "outline"}
                className="h-8 px-3 text-xs"
                onClick={() => setWealthScale("log")}
              >
                {language === "ko" ? "로그" : "Log"}
              </Button>
            </div>
          }
        />
        <ChartCard
          title={language === "ko" ? "행복 분포" : "Happiness Distribution"}
          description={
            language === "ko"
              ? "행복 점수 0~100이 어떤 구간에 몰리는지 보여줍니다. 이것도 결과 분포이지 정규분포 가정 차트가 아닙니다."
              : "Shows where 0-100 happiness scores are clustering. This is also an output distribution, not a normality chart."
          }
          axisNote={
            language === "ko"
              ? "x축 = 행복 점수 구간(0~100), y축 = 그 구간에 있는 사람 수"
              : "x-axis = happiness score range (0-100), y-axis = number of people in that range"
          }
          countLabel={language === "ko" ? "사람 수" : "people"}
          data={happinessDistribution}
          barColor="#d97706"
          compact={compact}
          compactNote={
            language === "ko"
              ? "0~100 행복 점수가 어느 구간에 몰리는지 바로 읽습니다."
              : "Read where 0-100 happiness scores are clustering."
          }
        />
      </div>
    </section>
  );
}
