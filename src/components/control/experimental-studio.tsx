"use client";

import { useState } from "react";
import { Cable, Grip, SlidersHorizontal, Sparkles } from "lucide-react";

import { ConnectedPolicyCanvas } from "@/components/control/connected-policy-canvas";
import {
  ControlStudioExtensions,
  ControlStudioSetup,
} from "@/components/control/control-studio";
import { ScratchPolicyCanvas } from "@/components/control/scratch-policy-canvas";
import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSimulationStore } from "@/store/simulationStore";

type StudioTab = "connected" | "scratch" | "fallback";

const studioTabs: Array<{
  id: StudioTab;
  icon: typeof Cable;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
}> = [
  {
    id: "connected",
    icon: Cable,
    title: {
      ko: "연결형 캔버스",
      en: "Connected Canvas",
    },
    description: {
      ko: "연결선과 중첩 그룹까지 쓰는 가장 강한 사용자 정의 편집기",
      en: "The strongest custom editor with wires and nested groups.",
    },
  },
  {
    id: "scratch",
    icon: Grip,
    title: {
      ko: "스크래치 캔버스",
      en: "Scratch Canvas",
    },
    description: {
      ko: "자유 배치와 레인 기반 조합에 집중한 드래그 편집기",
      en: "A drag editor focused on free positioning and lane-based assembly.",
    },
  },
  {
    id: "fallback",
    icon: SlidersHorizontal,
    title: {
      ko: "세부 변수와 폴백 편집기",
      en: "Detailed Variables",
    },
    description: {
      ko: "세로 컴포저, 규칙 빌더, 상세 변수 패널을 한곳에 모은 보조 작업영역",
      en: "A support workspace for the vertical composer, rule builder, and detailed variables.",
    },
  },
];

function scrollToWorkspace(setActiveTab: (tab: StudioTab) => void, tab: StudioTab) {
  setActiveTab(tab);
  window.setTimeout(() => {
    document.getElementById("custom-experiment-workspace")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 0);
}

export function ExperimentalStudio() {
  const { language } = useLanguage();
  const policiesDraft = useSimulationStore((state) => state.policiesDraft);
  const composerDraft = useSimulationStore((state) => state.composerDraft);
  const connectedCanvasDraft = useSimulationStore(
    (state) => state.connectedCanvasDraft,
  );
  const importPoliciesToComposerDraft = useSimulationStore(
    (state) => state.importPoliciesToComposerDraft,
  );
  const [activeTab, setActiveTab] = useState<StudioTab>("connected");

  const activeStudioTab =
    studioTabs.find((tab) => tab.id === activeTab) ?? studioTabs[0];

  return (
    <section id="custom-experiment-studio" className="space-y-6 py-10">
      <div className="rounded-[2rem] border border-border/80 bg-white/85 p-8 shadow-[0_20px_60px_rgba(14,59,64,0.06)] backdrop-blur">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <span className="inline-flex rounded-full border border-border/80 bg-secondary px-4 py-1 text-sm font-medium text-secondary-foreground">
              {language === "ko"
                ? "사용자 정의 사회실험 스튜디오"
                : "Custom Social Experiment Studio"}
            </span>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl">
              {language === "ko"
                ? "기본기능은 위에 유지하고, 복잡한 실험 설계는 아래 작업영역으로 분리했습니다."
                : "The baseline stays simple above, while complex experiment design moves into a dedicated workspace below."}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              {language === "ko"
                ? "상세 설정이 많아질수록 기본모델 패널과 같은 레이아웃에 억지로 넣는 방식은 한계가 있습니다. 그래서 실험 준비 패널은 유지하되, 드래그 기반 편집기와 세부 변수 패널은 탭형 작업영역으로 분리해 원래 의도했던 사용자 정의 사회실험 흐름을 다시 열었습니다."
                : "As detailed settings grow, forcing them into the same layout as the baseline panel stops scaling. The setup panel stays intact, while drag-based editors and detailed variable panels move into a tabbed workspace so the original custom experiment flow is usable again."}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-stone-50/85 p-5 xl:max-w-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {language === "ko" ? "현재 초안 상태" : "Current Draft"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border">
                {language === "ko"
                  ? `정책 초안 ${policiesDraft.length}개`
                  : `${policiesDraft.length} draft policies`}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border">
                {language === "ko"
                  ? `비주얼 규칙 ${composerDraft.rules.length}개`
                  : `${composerDraft.rules.length} visual rules`}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border">
                {language === "ko"
                  ? `연결 노드 ${connectedCanvasDraft.nodes.length}개`
                  : `${connectedCanvasDraft.nodes.length} connected nodes`}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {language === "ko"
                ? "프리셋을 고른 뒤 바로 아래에서 편집기로 가져오면, same-seed 비교 흐름을 유지한 채 세부 정책 실험으로 넘어갈 수 있습니다."
                : "Choose a preset, then load it into an editor below to move into detailed policy experiments without breaking the same-seed comparison flow."}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          <article className="rounded-[1.4rem] border border-border/70 bg-white/92 p-4">
            <p className="text-sm font-semibold">
              {language === "ko"
                ? "1. 실험 준비 패널에서 초안을 만든다"
                : "1. Prepare the draft in the setup panel"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {language === "ko"
                ? "시드, 프리셋, 적용 여부를 먼저 고정해서 비교 조건을 안정화합니다."
                : "Lock seed, preset, and apply timing first so comparison conditions stay stable."}
            </p>
          </article>
          <article className="rounded-[1.4rem] border border-border/70 bg-white/92 p-4">
            <p className="text-sm font-semibold">
              {language === "ko"
                ? "2. 드래그 편집기로 정책 구조를 조립한다"
                : "2. Assemble policy structure in a drag editor"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {language === "ko"
                ? "스크래치형 프레임 캔버스와 연결형 그래프를 용도에 따라 선택할 수 있습니다."
                : "Choose between the scratch frame canvas and the connected graph depending on how much structure you need."}
            </p>
          </article>
          <article className="rounded-[1.4rem] border border-border/70 bg-white/92 p-4">
            <p className="text-sm font-semibold">
              {language === "ko"
                ? "3. 상세 변수는 별도 작업영역에서 다룬다"
                : "3. Handle detailed variables in a separate workspace"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {language === "ko"
                ? "기본기능 화면을 망치지 않도록, 복잡한 시뮬레이션 변수와 폴백 편집기는 따로 분리했습니다."
                : "Complex simulation variables and fallback editors are separated so they do not overwhelm the baseline screen."}
            </p>
          </article>
        </div>
      </div>

      <ControlStudioSetup />

      <section
        id="custom-experiment-workspace"
        className="rounded-[2rem] border border-border/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(14,59,64,0.06)] backdrop-blur"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              {language === "ko" ? "작업영역 선택" : "Workspace"}
            </p>
            <h3 className="font-[family-name:var(--font-display)] text-3xl leading-tight">
              {language === "ko"
                ? activeStudioTab.title.ko
                : activeStudioTab.title.en}
            </h3>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {language === "ko"
                ? activeStudioTab.description.ko
                : activeStudioTab.description.en}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                importPoliciesToComposerDraft(policiesDraft);
                setActiveTab("connected");
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {language === "ko"
                ? "현재 초안을 편집기로 불러오기"
                : "Load Draft Into Editor"}
            </Button>
            <Button
              variant="outline"
              onClick={() => scrollToWorkspace(setActiveTab, "scratch")}
            >
              <Grip className="mr-2 h-4 w-4" />
              {language === "ko"
                ? "스크래치 캔버스로 이동"
                : "Open Scratch Canvas"}
            </Button>
            <Button
              variant="outline"
              onClick={() => scrollToWorkspace(setActiveTab, "fallback")}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {language === "ko"
                ? "세부 변수 작업영역"
                : "Open Detailed Variables"}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {studioTabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-[1.4rem] border p-4 text-left transition-colors",
                  activeTab === tab.id
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-border/70 bg-white/92 text-foreground hover:bg-secondary/60",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={cn(
                        "text-xs uppercase tracking-[0.18em]",
                        activeTab === tab.id
                          ? "text-white/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {language === "ko" ? "편집기" : "Editor"}
                    </p>
                    <h4 className="mt-2 text-base font-semibold">
                      {language === "ko" ? tab.title.ko : tab.title.en}
                    </h4>
                  </div>
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      activeTab === tab.id ? "text-white" : "text-muted-foreground",
                    )}
                  />
                </div>
                <p
                  className={cn(
                    "mt-3 text-sm leading-6",
                    activeTab === tab.id
                      ? "text-white/85"
                      : "text-muted-foreground",
                  )}
                >
                  {language === "ko" ? tab.description.ko : tab.description.en}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {activeTab === "connected" ? (
            <ConnectedPolicyCanvas />
          ) : activeTab === "scratch" ? (
            <ScratchPolicyCanvas />
          ) : (
            <ControlStudioExtensions />
          )}
        </div>
      </section>
    </section>
  );
}
