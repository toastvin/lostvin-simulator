"use client";

import { Play, Pause, RotateCcw, SlidersHorizontal } from "lucide-react";

import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { getLocaleTag } from "@/lib/i18n/ui";
import { deriveEventGridDimensions } from "@/lib/simulation/events";
import { useSimulationStore } from "@/store/simulationStore";
import type { ConfigFieldDefinition, SimulationConfig } from "@/types/config";

type SimpleField = {
  id: string;
  title: {
    ko: string;
    en: string;
  };
};

const simpleFields: SimpleField[] = [
  {
    id: "gridRingCount",
    title: {
      ko: "이벤트 링 수",
      en: "Event Rings",
    },
  },
  {
    id: "initialWealth",
    title: {
      ko: "시작 자산",
      en: "Initial Wealth",
    },
  },
  {
    id: "luckSharePercent",
    title: {
      ko: "초록점 비율",
      en: "Green Dot Share",
    },
  },
  {
    id: "luckyGainBase",
    title: {
      ko: "초록점 배수",
      en: "Green Multiplier",
    },
  },
  {
    id: "unluckyLossBase",
    title: {
      ko: "빨간점 결과",
      en: "Red Result",
    },
  },
  {
    id: "agentSpeed",
    title: {
      ko: "사람 이동 속도",
      en: "Agent Speed",
    },
  },
];

const playbackSpeeds = [1, 2, 4, 8, 16] as const;

function getNumberValue(
  config: SimulationConfig,
  field: ConfigFieldDefinition | undefined,
) {
  if (!field) {
    return 0;
  }

  const segments = field.targetPath.split(".");
  let value: unknown = config;

  for (const segment of segments) {
    if (typeof value !== "object" || value === null) {
      return field.valueType === "number" ? field.defaultValue : 0;
    }

    value = (value as Record<string, unknown>)[segment];
  }

  return typeof value === "number"
    ? value
    : field.valueType === "number"
      ? field.defaultValue
      : 0;
}

function formatValue(
  value: number,
  definition: ConfigFieldDefinition | undefined,
  localeTag: string,
) {
  const fractionDigits =
    definition?.valueType === "number" && definition.step && definition.step < 1
      ? Math.min(2, String(definition.step).split(".")[1]?.length ?? 0)
      : 0;

  const formatted = new Intl.NumberFormat(localeTag, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);

  return definition?.unit === "%" ? `${formatted}%` : formatted;
}

type BaselineModelControlsProps = {
  showActionButtons?: boolean;
};

export function BaselineModelControls({
  showActionButtons = true,
}: BaselineModelControlsProps) {
  const { language } = useLanguage();
  const localeTag = getLocaleTag(language);
  const status = useSimulationStore((state) => state.status);
  const playbackSpeed = useSimulationStore((state) => state.playbackSpeed);
  const draftConfig = useSimulationStore((state) => state.draftConfig);
  const appliedConfig = useSimulationStore((state) => state.appliedConfig);
  const fieldDefinitions = useSimulationStore((state) => state.fieldDefinitions);
  const setDraftConfigValue = useSimulationStore(
    (state) => state.setDraftConfigValue,
  );
  const setPlaybackSpeed = useSimulationStore(
    (state) => state.setPlaybackSpeed,
  );
  const applyDraftAndReset = useSimulationStore(
    (state) => state.applyDraftAndReset,
  );
  const resume = useSimulationStore((state) => state.resume);
  const pause = useSimulationStore((state) => state.pause);
  const resetSimulation = useSimulationStore((state) => state.resetSimulation);
  const advanceSimulation = useSimulationStore(
    (state) => state.advanceSimulation,
  );

  const activeLuckyMultiplier = appliedConfig.events.luckyGainBase;
  const activeBadLuckMultiplier = appliedConfig.events.unluckyLossBase;
  const draftEventGrid = deriveEventGridDimensions(
    draftConfig.arena.width,
    draftConfig.arena.height,
    draftConfig.events.gridRingCount,
  );

  return (
    <section className="space-y-3 rounded-[1.4rem] border border-border/80 bg-white/88 p-4 shadow-[0_18px_50px_rgba(14,59,64,0.06)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight">
          {language === "ko" ? "기본모델 설정" : "Baseline Settings"}
        </h2>
        <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-secondary-foreground">
          {language === "ko" ? "컴팩트" : "Compact"}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-[1rem] border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm font-semibold text-rose-900">
          {language === "ko" ? "빨간점" : "Red"} ·{" "}
          {formatValue(
            activeBadLuckMultiplier,
            fieldDefinitions.find((field) => field.id === "unluckyLossBase"),
            localeTag,
          )}
        </div>
        <div className="rounded-[1rem] border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-sm font-semibold text-emerald-900">
          {language === "ko" ? "초록점" : "Green"} ·{" "}
          {formatValue(
            activeLuckyMultiplier,
            fieldDefinitions.find((field) => field.id === "luckyGainBase"),
            localeTag,
          )}
        </div>
      </div>

      <div className="rounded-[1.1rem] border border-border/70 bg-white/92 p-3">
        <p className="text-sm font-semibold">
          {language === "ko" ? "실행 속도" : "Playback Speed"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {playbackSpeeds.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => setPlaybackSpeed(speed)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                playbackSpeed === speed
                  ? "bg-slate-950 text-white"
                  : "border border-border/70 bg-white text-foreground"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[1.1rem] border border-border/70 bg-white/92 p-3">
        <p className="text-sm font-semibold">
          {language === "ko" ? "빠른 진행" : "Fast Forward"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[200, 1000].map((steps) => (
            <button
              key={steps}
              type="button"
              onClick={() => advanceSimulation(steps)}
              className="rounded-full border border-border/70 bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              {language === "ko" ? `${steps} step 진행` : `+${steps} steps`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        {simpleFields.map((simpleField) => {
          const definition = fieldDefinitions.find(
            (field) => field.id === simpleField.id,
          );

          if (!definition || definition.valueType !== "number") {
            return null;
          }

          const draftValue = getNumberValue(draftConfig, definition);
          const maxValue =
            simpleField.id === "gridRingCount"
              ? draftEventGrid.maxGridRingCount
              : definition.max;

          return (
            <label
              key={simpleField.id}
              className="rounded-[1.1rem] border border-border/70 bg-white/92 p-3"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">
                  {simpleField.title[language]}
                </p>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_96px]">
                <input
                  type="range"
                  min={definition.min}
                  max={maxValue}
                  step={definition.step ?? 1}
                  value={draftValue}
                  onChange={(event) =>
                    setDraftConfigValue(
                      simpleField.id,
                      Number(event.currentTarget.value),
                    )
                  }
                  className="w-full accent-primary"
                />
                <input
                  type="number"
                  min={definition.min}
                  max={maxValue}
                  step={definition.step ?? 1}
                  value={draftValue}
                  onChange={(event) =>
                    setDraftConfigValue(
                      simpleField.id,
                      Number(event.currentTarget.value),
                    )
                  }
                  className="h-9 rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </label>
          );
        })}
      </div>

      {showActionButtons ? (
        <div className="flex flex-wrap gap-2">
          <Button className="h-9 px-4" onClick={() => applyDraftAndReset()}>
            {language === "ko" ? "적용 + 리셋" : "Apply + Reset"}
          </Button>
          <Button className="h-9 px-4" onClick={resume} disabled={status === "running"}>
            <Play className="mr-2 h-4 w-4" />
            {language === "ko"
              ? status === "idle"
                ? "시뮬레이션 실행"
                : "재개"
              : status === "idle"
                ? "Run Simulation"
                : "Resume"}
          </Button>
          <Button
            className="h-9 px-4"
            variant="secondary"
            onClick={pause}
            disabled={status !== "running"}
          >
            <Pause className="mr-2 h-4 w-4" />
            {language === "ko" ? "일시정지" : "Pause"}
          </Button>
          <Button className="h-9 px-4" variant="outline" onClick={() => resetSimulation()}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {language === "ko" ? "현재 조건으로 다시 시작" : "Reset Current World"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
