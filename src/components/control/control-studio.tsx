"use client";

import { useMemo } from "react";

import { useLanguage } from "@/components/i18n/language-provider";
import { PolicyRuleBuilder } from "@/components/control/policy-rule-builder";
import { ScratchPolicyCanvas } from "@/components/control/scratch-policy-canvas";
import { VisualPolicyComposer } from "@/components/control/visual-policy-composer";
import { Button } from "@/components/ui/button";
import {
  getLocaleTag,
  localizeConfigFieldDefinition,
  localizePolicyPreset,
  localizePolicyTypeDefinition,
  translateUi,
} from "@/lib/i18n/ui";
import { cn } from "@/lib/utils";
import { getPolicyTypeDefinition } from "@/lib/policies/metadata";
import { getPolicyPresets } from "@/lib/policies/presets";
import {
  getDraftConfigValue,
  useSimulationStore,
} from "@/store/simulationStore";
import type {
  ConfigFieldDefinition,
  ConfigFieldGroup,
  SimulationConfig,
  ValidationIssue,
} from "@/types/config";
import type { Policy, PolicyPreset } from "@/types/policies";

const policyPresets = getPolicyPresets();

const groupMeta: Record<
  ConfigFieldGroup,
  { label: string; description: string; defaultOpen: boolean }
> = {
  population: {
    label: "Population",
    description: "How many agents exist, what equal wealth they start with, and where the floor begins.",
    defaultOpen: true,
  },
  arena: {
    label: "Arena",
    description: "World size for movement and collisions.",
    defaultOpen: false,
  },
  movement: {
    label: "Movement",
    description: "How agents wander and whether luck dots stay fixed or drift.",
    defaultOpen: true,
  },
  events: {
    label: "Luck Events",
    description: "How the fixed event grid is split between green and red dots, and how strong each collision is.",
    defaultOpen: true,
  },
  economy: {
    label: "Economy",
    description: "Optional compounding rules layered on top of the baseline model.",
    defaultOpen: false,
  },
  happiness: {
    label: "Happiness",
    description: "How wealth, trends, and bankruptcy penalties map into visible wellbeing.",
    defaultOpen: false,
  },
  policies: {
    label: "Policies",
    description: "Policy controls are driven by presets in this phase.",
    defaultOpen: false,
  },
  advanced: {
    label: "Advanced",
    description: "Reserved for future variables and experimental controls.",
    defaultOpen: false,
  },
};

function serializePolicies(policies: Policy[]) {
  return JSON.stringify(policies);
}

function findPresetByPolicies(policies: Policy[]): PolicyPreset | null {
  if (policies.length === 0) {
    return policyPresets.find((preset) => preset.id === "laissez-faire") ?? null;
  }

  const key = serializePolicies(policies);

  return (
    policyPresets.find((preset) => serializePolicies(preset.policies) === key) ??
    null
  );
}

function formatNumericValue(
  value: number,
  localeTag: string,
  definition?: ConfigFieldDefinition,
) {
  const fractionDigits =
    definition?.valueType === "number" && definition.step && definition.step < 1
      ? Math.min(3, String(definition.step).split(".")[1]?.length ?? 0)
      : 0;

  const formatted = new Intl.NumberFormat(localeTag, {
    maximumFractionDigits: fractionDigits,
  }).format(value);

  return definition?.unit ? `${formatted} ${definition.unit}` : formatted;
}

function formatFieldValue(
  value: unknown,
  definition: ConfigFieldDefinition,
  localeTag: string,
  language: "ko" | "en",
) {
  if (definition.valueType === "select" && typeof value === "string") {
    return (
      definition.options.find((option) => option.value === value)?.label ?? value
    );
  }

  if (typeof value === "number") {
    return formatNumericValue(value, localeTag, definition);
  }

  if (typeof value === "boolean") {
    return value ? translateUi(language, "On") : translateUi(language, "Off");
  }

  return String(value ?? "");
}

function isFieldChanged(
  definition: ConfigFieldDefinition,
  draftConfig: SimulationConfig,
  appliedConfig: SimulationConfig,
) {
  return (
    getDraftConfigValue(draftConfig, definition.id) !==
    getDraftConfigValue(appliedConfig, definition.id)
  );
}

function PresetSummary({ preset }: { preset: PolicyPreset }) {
  const { language } = useLanguage();

  if (preset.policies.length === 0) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        {translateUi(
          language,
          "No intervention. Use this to observe the baseline world with the same seed.",
        )}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {preset.policies.map((policy) => (
        <span
          key={policy.id}
          className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
        >
          {localizePolicyTypeDefinition(
            getPolicyTypeDefinition(policy.type),
            language,
          ).label}
        </span>
      ))}
    </div>
  );
}

function IssueList({
  title,
  issues,
  tone,
}: {
  title: string;
  issues: ValidationIssue[] | Array<{ fieldId?: string; code: string; path?: string }>;
  tone: "warning" | "danger";
}) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-[1.35rem] border px-4 py-4",
        tone === "warning"
          ? "border-amber-200 bg-amber-50/80"
          : "border-rose-200 bg-rose-50/90",
      )}
    >
      <p
        className={cn(
          "text-xs uppercase tracking-[0.2em]",
          tone === "warning" ? "text-amber-700" : "text-rose-700",
        )}
      >
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground/80">
        {issues.map((issue, index) => (
          <li key={`${issue.fieldId ?? issue.path ?? issue.code}-${index}`}>
            {"message" in issue
              ? issue.message
              : `${issue.fieldId ?? issue.path ?? "config"} adjusted during normalization (${issue.code}).`}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FieldControl({
  definition,
  draftConfig,
  appliedConfig,
  onChange,
}: {
  definition: ConfigFieldDefinition;
  draftConfig: SimulationConfig;
  appliedConfig: SimulationConfig;
  onChange: (fieldId: string, value: unknown) => void;
}) {
  const { language } = useLanguage();
  const localeTag = getLocaleTag(language);
  const draftValue = getDraftConfigValue(draftConfig, definition.id);
  const appliedValue = getDraftConfigValue(appliedConfig, definition.id);
  const changed = isFieldChanged(definition, draftConfig, appliedConfig);

  return (
    <label className="block rounded-[1.35rem] border border-border/70 bg-white/90 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{definition.label}</p>
          <p className="text-xs leading-5 text-muted-foreground">
            {definition.description}
          </p>
        </div>
        {changed ? (
          <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
            {language === "ko" ? "초안 변경됨" : "Draft changed"}
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        {definition.valueType === "number" ? (
          <input
            type="number"
            min={definition.min}
            max={definition.max}
            step={definition.step ?? 1}
            value={typeof draftValue === "number" ? draftValue : definition.defaultValue}
            onChange={(event) => {
              const nextValue =
                event.currentTarget.value === ""
                  ? definition.defaultValue
                  : Number(event.currentTarget.value);
              onChange(definition.id, nextValue);
            }}
            className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
          />
        ) : definition.valueType === "select" ? (
          <select
            value={typeof draftValue === "string" ? draftValue : definition.defaultValue}
            onChange={(event) => onChange(definition.id, event.currentTarget.value)}
            className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
          >
            {definition.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {language === "ko" ? "적용값" : "Applied"}{" "}
          {formatFieldValue(appliedValue, definition, localeTag, language)}
        </span>
        <span>
          {definition.applyMode === "draft-reset"
            ? translateUi(language, "Reset to apply")
            : translateUi(language, "Live")}
        </span>
      </div>
    </label>
  );
}

export function ControlStudioSetup() {
  const { language } = useLanguage();
  const localeTag = getLocaleTag(language);
  const seed = useSimulationStore((state) => state.seed);
  const draftSeed = useSimulationStore((state) => state.draftSeed);
  const draftConfig = useSimulationStore((state) => state.draftConfig);
  const appliedConfig = useSimulationStore((state) => state.appliedConfig);
  const policiesDraft = useSimulationStore((state) => state.policiesDraft);
  const policiesApplied = useSimulationStore((state) => state.policiesApplied);
  const composerDraft = useSimulationStore((state) => state.composerDraft);
  const composerApplied = useSimulationStore((state) => state.composerApplied);
  const selectedPresetId = useSimulationStore((state) => state.selectedPresetId);
  const normalizationIssues = useSimulationStore(
    (state) => state.normalizationIssues,
  );
  const validationIssues = useSimulationStore((state) => state.validationIssues);
  const policyValidationIssues = useSimulationStore(
    (state) => state.policyValidationIssues,
  );
  const composerValidationIssues = useSimulationStore(
    (state) => state.composerValidationIssues,
  );
  const composerCompileWarnings = useSimulationStore(
    (state) => state.composerCompileWarnings,
  );
  const setDraftSeed = useSimulationStore((state) => state.setDraftSeed);
  const setDraftConfigValue = useSimulationStore(
    (state) => state.setDraftConfigValue,
  );
  const setPoliciesDraft = useSimulationStore((state) => state.setPoliciesDraft);
  const setSelectedPresetId = useSimulationStore(
    (state) => state.setSelectedPresetId,
  );
  const applyDraftAndReset = useSimulationStore(
    (state) => state.applyDraftAndReset,
  );
  const resetSimulation = useSimulationStore((state) => state.resetSimulation);

  const draftPreset =
    policyPresets.find((preset) => preset.id === selectedPresetId) ??
    findPresetByPolicies(policiesDraft);
  const appliedPreset = findPresetByPolicies(policiesApplied);
  const localizedPolicyPresets = useMemo(
    () => policyPresets.map((preset) => localizePolicyPreset(preset, language)),
    [language],
  );

  const isConfigDirty = JSON.stringify(draftConfig) !== JSON.stringify(appliedConfig);
  const isPoliciesDirty =
    serializePolicies(policiesDraft) !== serializePolicies(policiesApplied);
  const isComposerDirty =
    JSON.stringify(composerDraft) !== JSON.stringify(composerApplied);
  const isSeedDirty = draftSeed !== seed;
  const hasPendingChanges =
    isConfigDirty || isPoliciesDirty || isComposerDirty || isSeedDirty;
  const errorIssues = validationIssues.filter((issue) => issue.severity === "error");
  const warningIssues = validationIssues.filter(
    (issue) => issue.severity === "warning",
  );
  const policyErrorIssues = policyValidationIssues.filter(
    (issue) => issue.severity === "error",
  );
  const policyWarningIssues = policyValidationIssues.filter(
    (issue) => issue.severity === "warning",
  );
  const composerErrorIssues = composerValidationIssues.filter(
    (issue) => issue.severity === "error",
  );
  const composerWarningIssues = composerValidationIssues.filter(
    (issue) =>
      issue.severity === "warning" && issue.code !== "empty_document",
  );
  const visibleComposerCompileWarnings = composerCompileWarnings.filter(
    (warning) =>
      warning !== "Composer draft is empty. Only preset or raw policy rules will run.",
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[1.9rem] border border-border/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(14,59,64,0.06)] backdrop-blur">
        <div className="inline-flex rounded-full border border-border/80 bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {language === "ko" ? "다음 실험 준비" : "Prepare The Next Run"}
        </div>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight">
          {language === "ko"
            ? "기본 세계를 본 뒤, 여기서 변수나 정책을 한 번에 하나씩 바꿉니다."
            : "After you watch the baseline world, change variables or policies here one step at a time."}
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            {language === "ko"
              ? "이 패널은 현재 실행 중인 세계를 즉시 바꾸는 곳이 아닙니다. 다음 실험 조건을 만드는 곳입니다."
              : "This panel does not mutate the currently running world immediately. It prepares the next experiment."}
          </p>
          <p>
            {language === "ko"
              ? "비교가 의미 있으려면 seed를 고정한 채 규칙만 바꿔야 합니다. 그래야 초기 랜덤 배치 노이즈와 정책 효과를 분리할 수 있습니다."
              : "Comparison only means anything when the seed stays fixed. That isolates rule changes from initialization noise."}
          </p>
          <p>
            {translateUi(language, "Draft values do nothing until you press")}{" "}
            <span className="font-medium text-foreground">
              {translateUi(language, "Apply + Reset")}
            </span>
            .{" "}
            {language === "ko"
              ? "이 구조 덕분에 baseline을 보면서도 다음 비교 실험을 안정적으로 준비할 수 있습니다."
              : "That keeps the active run stable while you line up the next comparison."}
          </p>
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-border/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(14,59,64,0.06)] backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              {translateUi(language, "Experiment Setup")}
            </p>
            <h3 className="font-[family-name:var(--font-display)] text-3xl leading-tight">
              {translateUi(
                language,
                "Prepare the next run before you reset the world.",
              )}
            </h3>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {translateUi(
                language,
                "Draft seed, draft preset, and draft variables can diverge from the currently running simulation. The active world only changes on reset.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-slate-50">
              {translateUi(language, "Active")}{" "}
              {appliedPreset
                ? localizePolicyPreset(appliedPreset, language).name
                : translateUi(language, "Custom Run")}
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                hasPendingChanges
                  ? "bg-accent text-accent-foreground"
                  : "bg-emerald-100 text-emerald-700",
              )}
            >
              {hasPendingChanges
                ? translateUi(language, "Draft differs from active run")
                : translateUi(language, "Draft matches active run")}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-[1.45rem] border border-border/70 bg-white/90 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {translateUi(language, "Seed")}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-muted-foreground">
                  {translateUi(language, "Draft seed")}
                </span>
                <input
                  type="number"
                  value={draftSeed}
                  onChange={(event) => setDraftSeed(Number(event.currentTarget.value))}
                  className="mt-2 h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <div>
                <span className="text-xs text-muted-foreground">
                  {translateUi(language, "Active seed")}
                </span>
                <div className="mt-2 flex h-11 items-center rounded-2xl border border-border bg-muted/30 px-4 text-sm font-medium">
                  {seed.toLocaleString(localeTag)}
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {translateUi(
                language,
                "Keep this fixed when comparing baseline against a preset. Change it only when you want a new world sample.",
              )}
            </p>
          </div>

          <div className="rounded-[1.45rem] border border-border/70 bg-white/90 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {translateUi(language, "Apply Rules")}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => {
                  applyDraftAndReset();
                }}
                disabled={
                  !hasPendingChanges ||
                  errorIssues.length > 0 ||
                  policyErrorIssues.length > 0 ||
                  composerErrorIssues.length > 0
                }
              >
                {translateUi(language, "Apply + Reset")}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => resetSimulation()}
              >
                {translateUi(language, "Reset Active Run")}
              </Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-muted/40 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {translateUi(language, "Draft preset")}
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {draftPreset
                    ? localizePolicyPreset(draftPreset, language).name
                    : translateUi(language, "Custom Draft")}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/40 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {translateUi(language, "Active preset")}
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {appliedPreset
                    ? localizePolicyPreset(appliedPreset, language).name
                    : translateUi(language, "Custom Run")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <IssueList
            title={translateUi(language, "Validation Errors")}
            issues={errorIssues}
            tone="danger"
          />
          <IssueList
            title={translateUi(language, "Policy Errors")}
            issues={policyErrorIssues}
            tone="danger"
          />
          <IssueList
            title={translateUi(language, "Composer Errors")}
            issues={composerErrorIssues}
            tone="danger"
          />
          <IssueList
            title={translateUi(language, "Warnings")}
            issues={warningIssues}
            tone="warning"
          />
          <IssueList
            title={translateUi(language, "Policy Warnings")}
            issues={policyWarningIssues}
            tone="warning"
          />
          <IssueList
            title={translateUi(language, "Composer Warnings")}
            issues={composerWarningIssues}
            tone="warning"
          />
          <IssueList
            title={translateUi(language, "Normalization Notes")}
            issues={normalizationIssues}
            tone="warning"
          />
          {visibleComposerCompileWarnings.length > 0 ? (
            <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-700">
                {translateUi(language, "Composer Compile Notes")}
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground/80">
                {visibleComposerCompileWarnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-border/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(14,59,64,0.06)] backdrop-blur">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            {translateUi(language, "Policy Presets")}
          </p>
          <h3 className="font-[family-name:var(--font-display)] text-3xl leading-tight">
            {translateUi(
              language,
              "Choose a policy package, or use it as a starting point for custom rules.",
            )}
          </h3>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {translateUi(
              language,
              "Presets still give fast comparisons, but now they also act as launchpads for the raw rule builder and the visual composer below.",
            )}
          </p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {localizedPolicyPresets.map((preset) => {
            const isDraft = draftPreset?.id === preset.id;
            const isActive = appliedPreset?.id === preset.id;

            return (
              <article
                key={preset.id}
                className={cn(
                  "rounded-[1.5rem] border p-5 transition-colors",
                  isDraft
                    ? "border-primary bg-secondary/35"
                    : "border-border/70 bg-white/90",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <h4 className="text-lg font-semibold">{preset.name}</h4>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {preset.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {isActive ? (
                      <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-medium text-slate-50">
                        {translateUi(language, "Active")}
                      </span>
                    ) : null}
                    {isDraft ? (
                      <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
                        {translateUi(language, "Draft")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4">
                  <PresetSummary preset={preset} />
                </div>
                <div className="mt-5">
                  <Button
                    variant={isDraft ? "secondary" : "outline"}
                    onClick={() => {
                      setPoliciesDraft(structuredClone(preset.policies));
                      setSelectedPresetId(preset.id);
                    }}
                  >
                    {isDraft
                      ? translateUi(language, "Loaded In Draft")
                      : translateUi(language, "Use As Draft")}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function ControlStudioExtensions() {
  const { language } = useLanguage();
  const fieldDefinitions = useSimulationStore((state) => state.fieldDefinitions);
  const draftConfig = useSimulationStore((state) => state.draftConfig);
  const appliedConfig = useSimulationStore((state) => state.appliedConfig);
  const setDraftConfigValue = useSimulationStore(
    (state) => state.setDraftConfigValue,
  );

  const groupedFields = Object.entries(groupMeta)
    .map(([group, meta]) => ({
      group: group as ConfigFieldGroup,
      meta: {
        ...meta,
        label: translateUi(language, meta.label),
        description: translateUi(language, meta.description),
      },
      fields: fieldDefinitions.filter(
        (field) =>
          field.visible &&
          field.group === group &&
          field.scope === "simulation",
      ),
    }))
    .filter((entry) => entry.fields.length > 0);

  return (
    <div className="space-y-6">
      <details className="rounded-[1.9rem] border border-border/80 bg-white/70 p-6 shadow-[0_20px_60px_rgba(14,59,64,0.05)] backdrop-blur">
        <summary className="cursor-pointer list-none">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              {translateUi(language, "Phase 9 Vertical Composer Fallback")}
            </p>
            <h3 className="font-[family-name:var(--font-display)] text-2xl leading-tight">
              {translateUi(
                language,
                "Keep the structured vertical composer when the canvas is too heavy.",
              )}
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {translateUi(
                language,
                "This remains useful on smaller screens or when you want a simpler semantic editor without free-position layout.",
              )}
            </p>
          </div>
        </summary>

        <div className="mt-5">
          <PolicyRuleBuilder />
          <div className="mt-6">
            <VisualPolicyComposer />
          </div>
        </div>
      </details>

      <section className="space-y-4">
        {groupedFields.map(({ group, meta, fields }) => (
          <details
            key={group}
            open={meta.defaultOpen}
            className="rounded-[1.9rem] border border-border/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(14,59,64,0.06)] backdrop-blur"
          >
            <summary className="cursor-pointer list-none">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    {meta.label}
                  </p>
                  <h3 className="font-[family-name:var(--font-display)] text-2xl leading-tight">
                    {meta.description}
                  </h3>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {fields.length} {translateUi(language, "fields")}
                </span>
              </div>
            </summary>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {fields.map((definition) => (
                <FieldControl
                  key={definition.id}
                  definition={localizeConfigFieldDefinition(definition, language)}
                  draftConfig={draftConfig}
                  appliedConfig={appliedConfig}
                  onChange={setDraftConfigValue}
                />
              ))}
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}

export function ControlStudio() {
  return (
    <div className="space-y-6">
      <ControlStudioSetup />
      <ScratchPolicyCanvas />
      <ControlStudioExtensions />
    </div>
  );
}
