"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { LandingHero } from "@/components/hero/landing-hero";
import { useLanguage } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";

type HomeTab = "intro" | "baseline" | "custom";

const LiveSandbox = dynamic(
  () =>
    import("@/components/sandbox/live-sandbox").then((module) => ({
      default: module.LiveSandbox,
    })),
  {
    loading: () => <TabLoadingPanel />,
  },
);

const ExperimentalStudio = dynamic(
  () =>
    import("@/components/control/experimental-studio").then((module) => ({
      default: module.ExperimentalStudio,
    })),
  {
    loading: () => <TabLoadingPanel />,
  },
);

function TabLoadingPanel() {
  return (
    <section className="rounded-[2rem] border border-border/80 bg-white/80 p-8 shadow-[0_20px_60px_rgba(14,59,64,0.06)] backdrop-blur">
      <div className="space-y-3">
        <div className="h-3 w-32 rounded-full bg-muted/80" />
        <div className="h-8 w-72 rounded-full bg-muted/70" />
        <div className="h-4 w-full max-w-3xl rounded-full bg-muted/60" />
        <div className="h-4 w-full max-w-2xl rounded-full bg-muted/50" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="h-[360px] rounded-[1.6rem] bg-muted/50" />
        <div className="h-[360px] rounded-[1.6rem] bg-muted/40" />
      </div>
    </section>
  );
}

export function HomeWorkspace() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<HomeTab>("intro");

  const tabs = [
    {
      id: "intro" as const,
      label: language === "ko" ? "사이트 소개" : "Site Intro",
    },
    {
      id: "baseline" as const,
      label: language === "ko" ? "기본 실험" : "Baseline Lab",
    },
    {
      id: "custom" as const,
      label: language === "ko" ? "사용자 정의 실험" : "Custom Studio",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="sticky top-4 z-40 rounded-[1.2rem] border border-border/80 bg-white/92 p-2 shadow-[0_18px_50px_rgba(14,59,64,0.12)] backdrop-blur">
        <div
          role="tablist"
          aria-label={language === "ko" ? "홈 작업영역 탭" : "Home workspace tabs"}
          className="grid gap-2 md:grid-cols-3"
        >
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "min-h-10 rounded-[0.95rem] border px-4 py-2 text-sm font-semibold transition-colors",
                  selected
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-border/70 bg-white text-foreground hover:bg-secondary/70",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      <div>
        {activeTab === "intro" ? (
          <LandingHero
            onOpenBaseline={() => setActiveTab("baseline")}
            onOpenCustomStudio={() => setActiveTab("custom")}
          />
        ) : null}

        {activeTab === "baseline" ? <LiveSandbox /> : null}

        {activeTab === "custom" ? <ExperimentalStudio /> : null}
      </div>
    </div>
  );
}
