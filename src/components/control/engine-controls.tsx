"use client";

import { Pause, Play, RotateCcw } from "lucide-react";

import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { getLocaleTag, translateStatus, translateUi } from "@/lib/i18n/ui";
import { useSimulationStore } from "@/store/simulationStore";

export function EngineControls() {
  const { language } = useLanguage();
  const status = useSimulationStore((state) => state.status);
  const seed = useSimulationStore((state) => state.seed);
  const runtimeStep = useSimulationStore((state) => state.runtimeStep);
  const capturedStep = useSimulationStore((state) => state.metrics.step);
  const averageWealth = useSimulationStore(
    (state) => state.metrics.averageWealth,
  );
  const meanHappiness = useSimulationStore(
    (state) => state.metrics.meanHappiness,
  );
  const populationSize = useSimulationStore(
    (state) => state.metrics.populationSize,
  );
  const resume = useSimulationStore((state) => state.resume);
  const pause = useSimulationStore((state) => state.pause);
  const resetSimulation = useSimulationStore((state) => state.resetSimulation);
  const localeTag = getLocaleTag(language);

  return (
    <div className="space-y-5 rounded-[1.75rem] border border-border/80 bg-white/80 p-6 shadow-[0_18px_50px_rgba(14,59,64,0.06)] backdrop-blur">
      <div className="space-y-2">
        <div className="inline-flex rounded-full border border-border/80 bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {language === "ko" ? "현재 세계 실행" : "Current World Controls"}
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight">
          {language === "ko"
            ? "먼저 baseline 세계를 돌려 보고, 같은 seed로 다시 재생해 비교합니다."
            : "Run the baseline world first, then replay the same seed for a fair comparison."}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {language === "ko"
            ? "이 카드가 조작하는 것은 지금 캔버스에 적용된 세계입니다. 오른쪽 설정 패널의 초안은 reset 전까지 현재 실행에 영향을 주지 않습니다."
            : "This card controls the world already applied to the canvas. Draft edits in the setup panel do not affect the active run until reset."}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button size="lg" onClick={resume} disabled={status === "running"}>
          <Play className="mr-2 h-4 w-4" />
          {status === "idle"
            ? translateUi(language, "Run Active World")
            : translateUi(language, "Resume")}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={pause}
          disabled={status !== "running"}
        >
          <Pause className="mr-2 h-4 w-4" />
          {translateUi(language, "Pause")}
        </Button>
        <Button size="lg" variant="outline" onClick={() => resetSimulation()}>
          <RotateCcw className="mr-2 h-4 w-4" />
          {translateUi(language, "Replay Active Seed")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-950 px-4 py-4 text-slate-50">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {translateUi(language, "Status")}
          </p>
          <p className="mt-2 text-2xl font-semibold capitalize">
            {translateStatus(language, status)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {translateUi(language, "Seed")} {seed.toLocaleString(localeTag)}
          </p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-border">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {translateUi(language, "Runtime Step")}
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {runtimeStep.toLocaleString(localeTag)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {translateUi(language, "Snapshot captured at step")}{" "}
            {capturedStep.toLocaleString(localeTag)}
          </p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-border">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {translateUi(language, "Avg Wealth")}
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {averageWealth.toLocaleString(localeTag, {
              maximumFractionDigits: 1,
              minimumFractionDigits: 1,
            })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {translateUi(language, "Population")}{" "}
            {populationSize.toLocaleString(localeTag)}
          </p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-border">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {translateUi(language, "Mean Happiness")}
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {meanHappiness.toLocaleString(localeTag, {
              maximumFractionDigits: 1,
              minimumFractionDigits: 1,
            })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {translateUi(language, "Visualized by agent color")}
          </p>
        </div>
      </div>
    </div>
  );
}
