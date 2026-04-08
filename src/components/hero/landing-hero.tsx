"use client";

import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";

type LandingHeroProps = {
  onOpenBaseline?: () => void;
  onOpenCustomStudio?: () => void;
};

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function LandingHero({
  onOpenBaseline,
  onOpenCustomStudio,
}: LandingHeroProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <section className="space-y-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex rounded-full border border-border/80 bg-white/70 px-4 py-1 text-sm font-medium text-muted-foreground backdrop-blur">
          {language === "ko" ? "단순한 기본모델" : "Simple Baseline Model"}
        </span>
        <div className="inline-flex rounded-full border border-border/80 bg-white/80 p-1 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => setLanguage("ko")}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              language === "ko"
                ? "bg-slate-950 text-white"
                : "text-muted-foreground"
            }`}
          >
            한국어
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              language === "en"
                ? "bg-slate-950 text-white"
                : "text-muted-foreground"
            }`}
          >
            English
          </button>
        </div>
      </div>

      <div className="rounded-[2rem] border border-border/80 bg-white/85 p-8 shadow-[0_20px_60px_rgba(14,59,64,0.06)] backdrop-blur">
        <h1 className="max-w-4xl font-[family-name:var(--font-display)] text-5xl leading-tight tracking-tight sm:text-6xl">
          {language === "ko"
            ? "조건을 바꾸면 자산과 행복 분포가 어떻게 달라지는지 본다"
            : "Change the baseline conditions and watch wealth and happiness distributions shift"}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
          {language === "ko"
            ? "왼쪽에서 시작 자산, 초록점 비율, 초록점 배수, 빨간점 결과를 바꾸고, 오른쪽에서 시뮬레이션과 실시간 분포를 바로 확인합니다."
            : "Adjust starting wealth, green-dot share, green multiplier, and red outcome on the left, then read the live simulation and distributions on the right."}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            size="lg"
            onClick={() =>
              onOpenBaseline ? onOpenBaseline() : scrollToSection("simulation-lab")
            }
          >
            {language === "ko" ? "바로 실험하기" : "Start Experiment"}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() =>
              onOpenCustomStudio
                ? onOpenCustomStudio()
                : scrollToSection("custom-experiment-studio")
            }
          >
            {language === "ko"
              ? "사용자 정의 실험 열기"
              : "Open Custom Studio"}
          </Button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.4rem] border border-border/70 bg-white/90 p-4">
            <p className="text-sm font-semibold">
              {language === "ko" ? "1. 기본모델 조건을 조절" : "1. Adjust baseline rules"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {language === "ko"
                ? "빨간점과 초록점이 자산에 미치는 영향을 숫자로 바로 바꿉니다."
                : "Directly change how red and green dots affect wealth."}
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-border/70 bg-white/90 p-4">
            <p className="text-sm font-semibold">
              {language === "ko" ? "2. 시뮬레이션을 본다" : "2. Watch the simulation"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {language === "ko"
                ? "사람들이 움직이며 행운과 불운을 만나는 모습을 바로 봅니다."
                : "See agents move and run into luck and bad luck in real time."}
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-border/70 bg-white/90 p-4">
            <p className="text-sm font-semibold">
              {language === "ko" ? "3. 분포를 읽는다" : "3. Read the distributions"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {language === "ko"
                ? "자산과 행복이 어떤 모양으로 퍼지는지 히스토그램으로 확인합니다."
                : "Read the resulting wealth and happiness histograms."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
