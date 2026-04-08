"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import {
  localizePolicyTypeDefinition,
  translateUi,
} from "@/lib/i18n/ui";
import { cn } from "@/lib/utils";
import {
  createDefaultPolicy,
  createPolicyId,
  getPolicyTypeDefinition,
  getPolicyTypeDefinitions,
} from "@/lib/policies/metadata";
import { useSimulationStore } from "@/store/simulationStore";
import type {
  Policy,
  PolicyBracket,
  PolicyType,
  PolicyValidationIssue,
} from "@/types/policies";

const policyTypeDefinitions = getPolicyTypeDefinitions();

function parseNumberInput(raw: string, fallback: number) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function withCadence(policy: Policy, cadence: string): Policy {
  switch (policy.type) {
    case "basicIncome":
      return {
        ...policy,
        cadence: cadence as "step" | "year",
      };
    case "wealthTax":
      return {
        ...policy,
        cadence: "year",
      };
    case "progressiveTax":
      return {
        ...policy,
        cadence: "year",
      };
    case "bankruptcyFloor":
      return {
        ...policy,
        cadence: "step",
      };
    case "bailout":
      return {
        ...policy,
        cadence: "step",
      };
    case "talentGrant":
      return {
        ...policy,
        cadence: "year",
      };
  }
}

function issueTone(issues: PolicyValidationIssue[]) {
  return issues.some((issue) => issue.severity === "error")
    ? "danger"
    : "warning";
}

function PolicyIssueList({
  issues,
}: {
  issues: PolicyValidationIssue[];
}) {
  const { language } = useLanguage();

  if (issues.length === 0) {
    return null;
  }

  const tone = issueTone(issues);

  return (
    <div
      className={cn(
        "mt-4 rounded-[1.1rem] border px-4 py-3",
        tone === "danger"
          ? "border-rose-200 bg-rose-50/90"
          : "border-amber-200 bg-amber-50/85",
      )}
    >
      <p
        className={cn(
          "text-xs uppercase tracking-[0.18em]",
          tone === "danger" ? "text-rose-700" : "text-amber-700",
        )}
      >
        {tone === "danger"
          ? translateUi(language, "Rule errors")
          : translateUi(language, "Rule warnings")}
      </p>
      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-foreground/85">
        {issues.map((issue, index) => (
          <li key={`${issue.path}-${issue.code}-${index}`}>{issue.message}</li>
        ))}
      </ul>
    </div>
  );
}

function BracketEditor({
  policy,
  onChange,
}: {
  policy: Extract<Policy, { type: "progressiveTax" }>;
  onChange: (next: Policy) => void;
}) {
  const { language } = useLanguage();

  const updateBracket = (
    index: number,
    key: keyof PolicyBracket,
    value: number,
  ) => {
    const nextBrackets = policy.brackets.map((bracket, bracketIndex) =>
      bracketIndex === index ? { ...bracket, [key]: value } : bracket,
    );

    onChange({
      ...policy,
      brackets: nextBrackets,
    });
  };

  const removeBracket = (index: number) => {
    onChange({
      ...policy,
      brackets: policy.brackets.filter((_, bracketIndex) => bracketIndex !== index),
    });
  };

  const addBracket = () => {
    const nextThreshold =
      policy.brackets.at(-1)?.threshold !== undefined
        ? policy.brackets.at(-1)!.threshold + 100
        : 100;

    onChange({
      ...policy,
      brackets: [
        ...policy.brackets,
        {
          threshold: nextThreshold,
          rate: 0.05,
        },
      ],
    });
  };

  return (
    <div className="space-y-3">
      {policy.brackets.map((bracket, index) => (
        <div
          key={`${policy.id}-bracket-${index}`}
          className="grid gap-3 rounded-2xl border border-border/70 bg-muted/25 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <label className="block">
            <span className="text-xs text-muted-foreground">
              {translateUi(language, "Threshold")}
            </span>
            <input
              type="number"
              min={0}
              step={10}
              value={bracket.threshold}
              onChange={(event) =>
                updateBracket(
                  index,
                  "threshold",
                  parseNumberInput(event.currentTarget.value, bracket.threshold),
                )
              }
              className="mt-2 h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">
              {translateUi(language, "Rate")}
            </span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={bracket.rate}
              onChange={(event) =>
                updateBracket(
                  index,
                  "rate",
                  parseNumberInput(event.currentTarget.value, bracket.rate),
                )
              }
              className="mt-2 h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => removeBracket(index)}
              disabled={policy.brackets.length <= 1}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {translateUi(language, "Remove")}
            </Button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addBracket}>
        <Plus className="mr-2 h-4 w-4" />
        {translateUi(language, "Add Bracket")}
      </Button>
    </div>
  );
}

function PolicyCard({
  policy,
  issues,
  onChange,
  onDelete,
}: {
  policy: Policy;
  issues: PolicyValidationIssue[];
  onChange: (next: Policy) => void;
  onDelete: () => void;
}) {
  const { language } = useLanguage();
  const definition = localizePolicyTypeDefinition(
    getPolicyTypeDefinition(policy.type),
    language,
  );

  return (
    <article className="rounded-[1.55rem] border border-border/80 bg-white/90 p-5 shadow-[0_12px_30px_rgba(14,59,64,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-lg font-semibold">{definition.label}</p>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {definition.description}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          {translateUi(language, "Delete")}
        </Button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
        <label className="block">
          <span className="text-xs text-muted-foreground">
            {translateUi(language, "Policy id")}
          </span>
          <input
            type="text"
            value={policy.id}
            onChange={(event) =>
              onChange({
                ...policy,
                id: event.currentTarget.value,
              })
            }
            className="mt-2 h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/25 px-4 py-3">
          <span className="text-sm font-medium">
            {translateUi(language, "Enabled")}
          </span>
          <input
            type="checkbox"
            checked={policy.enabled}
            onChange={(event) =>
              onChange({
                ...policy,
                enabled: event.currentTarget.checked,
              })
            }
            className="h-4 w-4 accent-[hsl(var(--primary))]"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">
            {translateUi(language, "Cadence")}
          </span>
          {definition.supportedCadences.length > 1 ? (
            <select
              value={policy.cadence}
              onChange={(event) => onChange(withCadence(policy, event.currentTarget.value))}
              className="mt-2 h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              {definition.supportedCadences.map((cadence) => (
                <option key={cadence} value={cadence}>
                  {cadence === "step"
                    ? translateUi(language, "Every step")
                    : translateUi(language, "Every year")}
                </option>
              ))}
            </select>
          ) : (
            <div className="mt-2 flex h-11 items-center rounded-2xl border border-border bg-muted/30 px-4 text-sm font-medium capitalize">
              {definition.supportedCadences[0]}
            </div>
          )}
        </label>
      </div>

      <div className="mt-5 space-y-4">
        {definition.parameters.map((parameter) => {
          if (parameter.valueType === "brackets") {
            if (policy.type !== "progressiveTax") {
              return null;
            }

            return (
              <div key={`${policy.id}-${parameter.key}`} className="space-y-2">
                <div>
                  <p className="text-sm font-semibold">{parameter.label}</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {parameter.description}
                  </p>
                </div>
                <BracketEditor
                  policy={policy}
                  onChange={(nextPolicy) => onChange(nextPolicy)}
                />
              </div>
            );
          }

          const value = policy[parameter.key as keyof Policy];

          return (
            <label
              key={`${policy.id}-${parameter.key}`}
              className="block rounded-[1.15rem] border border-border/70 bg-muted/20 p-4"
            >
              <span className="text-sm font-semibold">{parameter.label}</span>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {parameter.description}
              </p>
              <input
                type="number"
                min={parameter.min}
                max={parameter.max}
                step={parameter.step ?? 1}
                value={typeof value === "number" ? value : 0}
                onChange={(event) =>
                  onChange({
                    ...policy,
                    [parameter.key]: parseNumberInput(
                      event.currentTarget.value,
                      typeof value === "number" ? value : 0,
                    ),
                  } as Policy)
                }
                className="mt-3 h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          );
        })}
      </div>

      <PolicyIssueList issues={issues} />
    </article>
  );
}

export function PolicyRuleBuilder() {
  const { language } = useLanguage();
  const policiesDraft = useSimulationStore((state) => state.policiesDraft);
  const selectedPresetId = useSimulationStore((state) => state.selectedPresetId);
  const policyValidationIssues = useSimulationStore(
    (state) => state.policyValidationIssues,
  );
  const setPoliciesDraft = useSimulationStore((state) => state.setPoliciesDraft);
  const setSelectedPresetId = useSimulationStore(
    (state) => state.setSelectedPresetId,
  );

  const [newPolicyType, setNewPolicyType] = useState<PolicyType>(
    policyTypeDefinitions[0].type,
  );
  const localizedPolicyTypeDefinitions = policyTypeDefinitions.map((definition) =>
    localizePolicyTypeDefinition(definition, language),
  );

  const groupedIssues = useMemo(() => {
    return policiesDraft.reduce<Record<string, PolicyValidationIssue[]>>(
      (accumulator, policy) => {
        accumulator[policy.id] = policyValidationIssues.filter(
          (issue) => issue.policyId === policy.id,
        );
        return accumulator;
      },
      {},
    );
  }, [policiesDraft, policyValidationIssues]);

  const customMode = selectedPresetId === null && policiesDraft.length > 0;
  const summaryTone = issueTone(policyValidationIssues);

  const commitCustomPolicies = (nextPolicies: Policy[]) => {
    setPoliciesDraft(nextPolicies);
    setSelectedPresetId(null);
  };

  return (
    <section className="rounded-[1.9rem] border border-border/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(14,59,64,0.06)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            {translateUi(language, "Rule Builder")}
          </p>
          <h3 className="font-[family-name:var(--font-display)] text-3xl leading-tight">
            {translateUi(
              language,
              "Build a constrained custom policy package without writing code.",
            )}
          </h3>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {translateUi(
              language,
              "This editor is metadata-driven. New policy types should appear here once their type definition, parameter metadata, and validator are added.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedPresetId ? (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {translateUi(language, "Loaded from preset")}
            </span>
          ) : null}
          {customMode ? (
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
              {translateUi(language, "Custom draft")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block">
          <span className="text-xs text-muted-foreground">
            {translateUi(language, "Add policy type")}
          </span>
          <select
            value={newPolicyType}
            onChange={(event) =>
              setNewPolicyType(event.currentTarget.value as PolicyType)
            }
            className="mt-2 h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
          >
            {localizedPolicyTypeDefinitions.map((definition) => (
              <option key={definition.type} value={definition.type}>
                {definition.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button
            type="button"
            onClick={() =>
              commitCustomPolicies([
                ...policiesDraft,
                createDefaultPolicy(
                  newPolicyType,
                  createPolicyId(newPolicyType, policiesDraft),
                ),
              ])
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            {translateUi(language, "Add Rule")}
          </Button>
        </div>
      </div>

      {policyValidationIssues.length > 0 ? (
        <div
          className={cn(
            "mt-4 rounded-[1.35rem] border px-4 py-4",
            summaryTone === "danger"
              ? "border-rose-200 bg-rose-50/90"
              : "border-amber-200 bg-amber-50/85",
          )}
        >
          <p
            className={cn(
              "text-xs uppercase tracking-[0.2em]",
              summaryTone === "danger" ? "text-rose-700" : "text-amber-700",
            )}
          >
            {summaryTone === "danger"
              ? translateUi(language, "Custom rule draft has blocking errors")
              : translateUi(language, "Custom rule draft has warnings")}
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground/80">
            {translateUi(
              language,
              "Invalid rules stay in draft only and cannot be applied until the blocking issues are resolved.",
            )}
          </p>
        </div>
      ) : null}

      {policiesDraft.length === 0 ? (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-border bg-muted/20 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {translateUi(language, "Empty State")}
          </p>
          <h4 className="mt-2 text-xl font-semibold">
            {translateUi(language, "No rules are in the draft yet.")}
          </h4>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {translateUi(
              language,
              "Start from a preset above or add a single policy type here. The builder uses dropdowns and numeric inputs only, so parsing user code is never needed.",
            )}
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {policiesDraft.map((policy, index) => (
            <PolicyCard
              key={`${policy.id}-${index}`}
              policy={policy}
              issues={groupedIssues[policy.id] ?? []}
              onChange={(nextPolicy) => {
                commitCustomPolicies(
                  policiesDraft.map((currentPolicy, currentIndex) =>
                    currentIndex === index ? nextPolicy : currentPolicy,
                  ),
                );
              }}
              onDelete={() => {
                commitCustomPolicies(
                  policiesDraft.filter((_, currentIndex) => currentIndex !== index),
                );
              }}
            />
          ))}
        </div>
      )}

      <details className="mt-5 rounded-[1.35rem] border border-border/70 bg-slate-950/95 p-5 text-slate-50">
        <summary className="cursor-pointer list-none text-sm font-semibold">
          {translateUi(language, "Policy JSON Preview")}
        </summary>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          {translateUi(
            language,
            "This is a debug view of the exact draft policy payload that will be applied on reset.",
          )}
        </p>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/30 p-4 text-xs leading-6 text-slate-100">
          {JSON.stringify(policiesDraft, null, 2)}
        </pre>
      </details>
    </section>
  );
}
