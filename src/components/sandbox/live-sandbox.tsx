"use client";

import { BaselineActionBar } from "@/components/control/baseline-action-bar";
import { BaselineModelControls } from "@/components/control/baseline-model-controls";
import { useLanguage } from "@/components/i18n/language-provider";
import { getLocaleTag } from "@/lib/i18n/ui";
import { SimulationCanvas } from "@/components/simulation/simulation-canvas";
import { BaselineStatsDashboard } from "@/components/stats/baseline-stats-dashboard";
import { useSimulationStore } from "@/store/simulationStore";

export function LiveSandbox() {
  const { language } = useLanguage();
  const localeTag = getLocaleTag(language);
  const metrics = useSimulationStore((state) => state.metrics);
  const agents = useSimulationStore((state) => state.agents);
  const draftConfig = useSimulationStore((state) => state.draftConfig);
  const averageHappiness =
    agents.length === 0
      ? 0
      : agents.reduce((sum, agent) => sum + agent.happiness, 0) / agents.length;
  const nearZeroWealthCount = agents.filter((agent) => agent.wealth <= 1).length;
  const formatNumber = (value: number, maximumFractionDigits = 1) =>
    new Intl.NumberFormat(localeTag, {
      maximumFractionDigits,
      minimumFractionDigits: 0,
    }).format(value);
  const formatPercent = (value: number) =>
    `${formatNumber(value * 100, 1)}%`;
  const redLossPercent = Math.max(
    0,
    (1 - draftConfig.events.unluckyLossBase) * 100,
  );
  const greenMultiplier = draftConfig.events.luckyGainBase;

  return (
    <section id="simulation-lab" className="space-y-4 py-4">
      <BaselineActionBar />

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-[10.25rem] lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-1">
          <BaselineModelControls showActionButtons={false} />
        </div>

        <div className="space-y-2 rounded-[1.85rem] border border-border/80 bg-white/80 p-4 shadow-[0_18px_50px_rgba(14,59,64,0.06)] backdrop-blur sm:p-5">
          <div className="grid gap-2 xl:grid-cols-2">
            <div className="rounded-[1rem] border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm font-medium text-rose-950">
              {language === "ko"
                ? `빨간점을 만나면 자산이 ${formatNumber(redLossPercent)}% 감소합니다`
                : `Red dots reduce wealth by ${formatNumber(redLossPercent)}%`}
            </div>
            <div className="rounded-[1rem] border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-sm font-medium text-emerald-950">
              {language === "ko"
                ? `초록점을 만나면 성공 시 자산이 ${formatNumber(greenMultiplier)}배가 됩니다`
                : `Green dots multiply wealth by ${formatNumber(greenMultiplier)}x on success`}
            </div>
          </div>

          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
            <div className="min-w-[150px] flex-1 rounded-[0.95rem] border border-border/70 bg-white/95 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {language === "ko" ? "평균 자산" : "Average Wealth"}
                </p>
                <p className="text-lg font-semibold leading-none">
                  {formatNumber(metrics.averageWealth)}
                </p>
              </div>
            </div>
            <div className="min-w-[150px] flex-1 rounded-[0.95rem] border border-border/70 bg-white/95 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {language === "ko" ? "중앙 자산" : "Median Wealth"}
                </p>
                <p className="text-lg font-semibold leading-none">
                  {formatNumber(metrics.medianWealth)}
                </p>
              </div>
            </div>
            <div className="min-w-[150px] flex-1 rounded-[0.95rem] border border-border/70 bg-white/95 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {language === "ko" ? "평균 행복" : "Mean Happiness"}
                </p>
                <p className="text-lg font-semibold leading-none">
                  {formatNumber(averageHappiness)}
                </p>
              </div>
            </div>
            <div className="min-w-[190px] flex-1 rounded-[0.95rem] border border-border/70 bg-white/95 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {language === "ko" ? "낮은 자산 인원" : "Near-Zero Wealth"}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] leading-3 text-muted-foreground">
                    Gini {formatPercent(metrics.giniCoefficient)}
                  </p>
                </div>
                <p className="text-lg font-semibold leading-none">
                  {formatNumber(nearZeroWealthCount, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.34fr)_minmax(330px,0.66fr)] xl:items-stretch">
            <div className="flex h-full flex-col">
              <SimulationCanvas compact />
            </div>

            <BaselineStatsDashboard compact hideSummary />
          </div>
        </div>
      </div>
    </section>
  );
}
