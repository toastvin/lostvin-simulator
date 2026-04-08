"use client";

import { Pause, Play, RotateCcw } from "lucide-react";

import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { getLocaleTag, translateStatus, translateUi } from "@/lib/i18n/ui";
import { useSimulationStore } from "@/store/simulationStore";

export function BaselineActionBar() {
  const { language } = useLanguage();
  const localeTag = getLocaleTag(language);
  const status = useSimulationStore((state) => state.status);
  const seed = useSimulationStore((state) => state.seed);
  const runtimeStep = useSimulationStore((state) => state.runtimeStep);
  const draftConfig = useSimulationStore((state) => state.draftConfig);
  const appliedConfig = useSimulationStore((state) => state.appliedConfig);
  const resume = useSimulationStore((state) => state.resume);
  const pause = useSimulationStore((state) => state.pause);
  const resetSimulation = useSimulationStore((state) => state.resetSimulation);
  const applyDraftAndReset = useSimulationStore(
    (state) => state.applyDraftAndReset,
  );

  const hasPendingChanges =
    JSON.stringify(draftConfig) !== JSON.stringify(appliedConfig);

  return (
    <section className="sticky top-[4.85rem] z-30 rounded-[1.15rem] border border-border/80 bg-white/92 p-3 shadow-[0_18px_50px_rgba(14,59,64,0.12)] backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-slate-50">
            {translateUi(language, "Status")} {translateStatus(language, status)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border">
            {translateUi(language, "Seed")} {seed.toLocaleString(localeTag)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border">
            {translateUi(language, "Step")} {runtimeStep.toLocaleString(localeTag)}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {hasPendingChanges
              ? translateUi(language, "Draft differs from active run")
              : translateUi(language, "Draft matches active run")}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            className="h-9 px-4"
            onClick={() => applyDraftAndReset()}
            disabled={!hasPendingChanges}
          >
            {translateUi(language, "Apply + Reset")}
          </Button>
          <Button
            className="h-9 px-4"
            variant="secondary"
            onClick={resume}
            disabled={status === "running"}
          >
            <Play className="mr-2 h-4 w-4" />
            {status === "idle"
              ? translateUi(language, "Run Active World")
              : translateUi(language, "Resume")}
          </Button>
          <Button
            className="h-9 px-4"
            variant="outline"
            onClick={pause}
            disabled={status !== "running"}
          >
            <Pause className="mr-2 h-4 w-4" />
            {translateUi(language, "Pause")}
          </Button>
          <Button
            className="h-9 px-4"
            variant="outline"
            onClick={() => resetSimulation()}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {translateUi(language, "Replay Active Seed")}
          </Button>
        </div>
      </div>
    </section>
  );
}
