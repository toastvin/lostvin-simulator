"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  GripVertical,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import {
  localizeComposerBlockDefinition,
  translateCategory,
  translateUi,
} from "@/lib/i18n/ui";
import { cn } from "@/lib/utils";
import {
  createComposerBlock,
  createComposerRule,
  moveArrayItem,
} from "@/lib/composer/defaults";
import { exportComposerDocument } from "@/lib/composer/export";
import { composerRegistry, getComposerBlockDefinition } from "@/lib/composer/registry";
import { useSimulationStore } from "@/store/simulationStore";
import type {
  ComposerBlock,
  ComposerBlockCategory,
  ComposerDocument,
  ComposerMode,
  ComposerRule,
  ComposerValidationIssue,
} from "@/types/composer";
import type { PolicyBracket } from "@/types/policies";

const categoryOrder: ComposerBlockCategory[] = [
  "target",
  "condition",
  "effect",
  "modifier",
];

function formatModeLabel(mode: ComposerMode) {
  switch (mode) {
    case "preset_import":
      return "Imported from preset";
    case "custom_draft":
      return "Custom draft";
    case "custom_applied":
      return "Custom applied";
  }
}

function parseNumberInput(raw: string, fallback: number) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ComposerIssueList({
  title,
  issues,
  tone,
}: {
  title: string;
  issues: ComposerValidationIssue[];
  tone: "warning" | "danger";
}) {
  const { language } = useLanguage();

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
          <li key={`${issue.path}-${issue.code}-${index}`}>{issue.message}</li>
        ))}
      </ul>
    </div>
  );
}

function BracketEditor({
  brackets,
  onChange,
}: {
  brackets: PolicyBracket[];
  onChange: (next: PolicyBracket[]) => void;
}) {
  const { language } = useLanguage();

  const updateBracket = (
    index: number,
    key: keyof PolicyBracket,
    value: number,
  ) => {
    onChange(
      brackets.map((bracket, bracketIndex) =>
        bracketIndex === index ? { ...bracket, [key]: value } : bracket,
      ),
    );
  };

  const addBracket = () => {
    const nextThreshold =
      brackets.at(-1)?.threshold !== undefined ? brackets.at(-1)!.threshold + 100 : 100;

    onChange([
      ...brackets,
      {
        threshold: nextThreshold,
        rate: 0.05,
      },
    ]);
  };

  const removeBracket = (index: number) => {
    onChange(brackets.filter((_, bracketIndex) => bracketIndex !== index));
  };

  return (
    <div className="space-y-3">
      {brackets.map((bracket, index) => (
        <div
          key={`composer-bracket-${index}`}
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
              disabled={brackets.length <= 1}
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

function BlockParameterFields({
  block,
  onChange,
}: {
  block: ComposerBlock;
  onChange: (key: string, value: unknown) => void;
}) {
  const { language } = useLanguage();
  const definition = getComposerBlockDefinition(block.type, block.category);
  const localizedDefinition = definition
    ? localizeComposerBlockDefinition(definition, language)
    : null;

  if (!localizedDefinition) {
    return null;
  }

  if (block.type === "progressiveTax") {
    const brackets = (
      block as ComposerBlock & { payload: { brackets: PolicyBracket[] } }
    ).payload.brackets;

    return (
      <BracketEditor
        brackets={brackets}
        onChange={(next) => onChange("brackets", next)}
      />
    );
  }

  if (localizedDefinition.parameters.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border/80 bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
        {translateUi(language, "This block does not need extra parameters.")}
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {localizedDefinition.parameters.map((parameter) => {
        const value = block.payload[parameter.key as keyof typeof block.payload];

        if (parameter.valueType === "number") {
          return (
            <label key={parameter.key} className="block">
              <span className="text-xs text-muted-foreground">{parameter.label}</span>
              <input
                type="number"
                min={parameter.min}
                max={parameter.max}
                step={parameter.step ?? 1}
                value={typeof value === "number" ? value : 0}
                onChange={(event) =>
                  onChange(
                    parameter.key,
                    parseNumberInput(
                      event.currentTarget.value,
                      typeof value === "number" ? value : 0,
                    ),
                  )
                }
                className="mt-2 h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {parameter.description}
              </p>
            </label>
          );
        }

        if (parameter.valueType === "select") {
          return (
            <label key={parameter.key} className="block">
              <span className="text-xs text-muted-foreground">{parameter.label}</span>
              <select
                value={typeof value === "string" ? value : ""}
                onChange={(event) => onChange(parameter.key, event.currentTarget.value)}
                className="mt-2 h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              >
                {parameter.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        return (
          <label
            key={parameter.key}
            className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/25 px-4 py-3"
          >
            <span className="text-sm font-medium">{parameter.label}</span>
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(event) => onChange(parameter.key, event.currentTarget.checked)}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
          </label>
        );
      })}
    </div>
  );
}

function findInsertionIndex(blocks: ComposerBlock[], category: ComposerBlockCategory) {
  const categoryIndex = categoryOrder.indexOf(category);
  let insertionIndex = blocks.length;

  for (let index = 0; index < blocks.length; index += 1) {
    const blockCategoryIndex = categoryOrder.indexOf(blocks[index].category);

    if (blockCategoryIndex > categoryIndex) {
      insertionIndex = index;
      break;
    }
  }

  return insertionIndex;
}

export function VisualPolicyComposer() {
  const { language } = useLanguage();
  const composerMode = useSimulationStore((state) => state.composerMode);
  const composerDraft = useSimulationStore((state) => state.composerDraft);
  const composerApplied = useSimulationStore((state) => state.composerApplied);
  const composerCompiledDraft = useSimulationStore(
    (state) => state.composerCompiledDraft,
  );
  const composerValidationIssues = useSimulationStore(
    (state) => state.composerValidationIssues,
  );
  const composerCompileWarnings = useSimulationStore(
    (state) => state.composerCompileWarnings,
  );
  const policiesDraft = useSimulationStore((state) => state.policiesDraft);
  const setComposerDraft = useSimulationStore((state) => state.setComposerDraft);
  const importPoliciesToComposerDraft = useSimulationStore(
    (state) => state.importPoliciesToComposerDraft,
  );
  const clearComposerDraft = useSimulationStore((state) => state.clearComposerDraft);

  const [dragState, setDragState] = useState<{
    ruleId: string | null;
    blockId: string | null;
  }>({
    ruleId: null,
    blockId: null,
  });
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const exported = useMemo(
    () => exportComposerDocument(composerDraft),
    [composerDraft],
  );
  const localizedRegistry = useMemo(
    () => ({
      targets: composerRegistry.targets.map((definition) =>
        localizeComposerBlockDefinition(definition, language),
      ),
      conditions: composerRegistry.conditions.map((definition) =>
        localizeComposerBlockDefinition(definition, language),
      ),
      effects: composerRegistry.effects.map((definition) =>
        localizeComposerBlockDefinition(definition, language),
      ),
      modifiers: composerRegistry.modifiers.map((definition) =>
        localizeComposerBlockDefinition(definition, language),
      ),
    }),
    [language],
  );
  const errorIssues = composerValidationIssues.filter(
    (issue) => issue.severity === "error",
  );
  const warningIssues = composerValidationIssues.filter(
    (issue) =>
      issue.severity === "warning" && issue.code !== "empty_document",
  );

  const updateDocument = (nextDocument: ComposerDocument, mode?: ComposerMode) => {
    setComposerDraft(nextDocument, mode ?? "custom_draft");
  };

  const updateRule = (ruleId: string, updater: (rule: ComposerRule) => ComposerRule) => {
    updateDocument(
      {
        ...composerDraft,
        rules: composerDraft.rules.map((rule) =>
          rule.id === ruleId ? updater(rule) : rule,
        ),
      },
      "custom_draft",
    );
  };

  const addRule = () => {
    updateDocument(
      {
        ...composerDraft,
        rules: [...composerDraft.rules, createComposerRule(composerDraft.rules)],
      },
      "custom_draft",
    );
  };

  const deleteRule = (ruleId: string) => {
    updateDocument(
      {
        ...composerDraft,
        rules: composerDraft.rules.filter((rule) => rule.id !== ruleId),
      },
      "custom_draft",
    );
  };

  const moveRule = (ruleId: string, direction: "up" | "down") => {
    const ruleIndex = composerDraft.rules.findIndex((rule) => rule.id === ruleId);
    const targetIndex = direction === "up" ? ruleIndex - 1 : ruleIndex + 1;

    updateDocument(
      {
        ...composerDraft,
        rules: moveArrayItem(composerDraft.rules, ruleIndex, targetIndex),
      },
      "custom_draft",
    );
  };

  const reorderRule = (sourceRuleId: string, targetRuleId: string) => {
    const sourceIndex = composerDraft.rules.findIndex(
      (rule) => rule.id === sourceRuleId,
    );
    const targetIndex = composerDraft.rules.findIndex(
      (rule) => rule.id === targetRuleId,
    );

    updateDocument(
      {
        ...composerDraft,
        rules: moveArrayItem(composerDraft.rules, sourceIndex, targetIndex),
      },
      "custom_draft",
    );
  };

  const addBlock = (
    ruleId: string,
    type: ComposerBlock["type"],
    category: ComposerBlock["category"],
  ) => {
    updateRule(ruleId, (rule) => {
      const nextBlock = createComposerBlock(type, rule.blocks, undefined, category);
      const insertionIndex = findInsertionIndex(rule.blocks, nextBlock.category);
      const nextBlocks = [...rule.blocks];
      nextBlocks.splice(insertionIndex, 0, nextBlock);

      return {
        ...rule,
        blocks: nextBlocks,
      };
    });
  };

  const updateBlock = (
    ruleId: string,
    blockId: string,
    updater: (block: ComposerBlock) => ComposerBlock,
  ) => {
    updateRule(ruleId, (rule) => ({
      ...rule,
      blocks: rule.blocks.map((block) =>
        block.id === blockId ? updater(block) : block,
      ),
    }));
  };

  const deleteBlock = (ruleId: string, blockId: string) => {
    updateRule(ruleId, (rule) => ({
      ...rule,
      blocks: rule.blocks.filter((block) => block.id !== blockId),
    }));
  };

  const moveBlock = (
    ruleId: string,
    blockId: string,
    direction: "up" | "down",
  ) => {
    updateRule(ruleId, (rule) => {
      const blockIndex = rule.blocks.findIndex((block) => block.id === blockId);
      const targetIndex = direction === "up" ? blockIndex - 1 : blockIndex + 1;

      return {
        ...rule,
        blocks: moveArrayItem(rule.blocks, blockIndex, targetIndex),
      };
    });
  };

  const reorderBlock = (
    ruleId: string,
    sourceBlockId: string,
    targetBlockId: string,
  ) => {
    updateRule(ruleId, (rule) => {
      const sourceIndex = rule.blocks.findIndex(
        (block) => block.id === sourceBlockId,
      );
      const targetIndex = rule.blocks.findIndex(
        (block) => block.id === targetBlockId,
      );

      return {
        ...rule,
        blocks: moveArrayItem(rule.blocks, sourceIndex, targetIndex),
      };
    });
  };

  const handleCopyJson = async () => {
    if (!navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(exported.json);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1600);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([exported.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = exported.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-[1.9rem] border border-border/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(14,59,64,0.06)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            {translateUi(language, "Visual Policy Composer")}
          </p>
          <h3 className="font-[family-name:var(--font-display)] text-3xl leading-tight">
            {translateUi(
              language,
              "Build policy logic with constrained blocks instead of raw rule forms.",
            )}
          </h3>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {translateUi(
              language,
              "This stays safer than free-form code. Users can reorder target, condition, effect, and modifier blocks, but the engine still runs a typed JSON AST with validation and compile preview.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-slate-50">
            {translateUi(language, formatModeLabel(composerMode))}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {translateUi(language, "Draft")} {composerDraft.rules.length}{" "}
            {translateUi(language, "rules")}
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {translateUi(language, "Active")} {composerApplied.rules.length}{" "}
            {translateUi(language, "rules")}
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" onClick={addRule}>
          <Plus className="mr-2 h-4 w-4" />
          {translateUi(language, "Add Rule")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => importPoliciesToComposerDraft(policiesDraft)}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {translateUi(language, "Import Draft Policies")}
        </Button>
        <Button type="button" variant="outline" onClick={clearComposerDraft}>
          {translateUi(language, "Clear Draft")}
        </Button>
        <Button type="button" variant="outline" onClick={handleCopyJson}>
          <Copy className="mr-2 h-4 w-4" />
          {copyState === "copied"
            ? translateUi(language, "Copied")
            : translateUi(language, "Copy JSON")}
        </Button>
        <Button type="button" variant="outline" onClick={handleDownloadJson}>
          <Download className="mr-2 h-4 w-4" />
          {translateUi(language, "Download JSON")}
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        <ComposerIssueList
          title={translateUi(language, "Composer Errors")}
          issues={errorIssues}
          tone="danger"
        />
        <ComposerIssueList
          title={translateUi(language, "Composer Warnings")}
          issues={warningIssues}
          tone="warning"
        />
        {composerCompileWarnings.length > 0 ? (
          <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50/80 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-700">
              {translateUi(language, "Compile Notes")}
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground/80">
              {composerCompileWarnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {composerDraft.rules.length === 0 ? (
        <div className="mt-6 rounded-[1.55rem] border border-dashed border-border bg-muted/20 p-8 text-center">
          <p className="font-medium">
            {translateUi(language, "No visual rules yet.")}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {translateUi(
              language,
              "Start from scratch or import the current preset-backed policy draft into block form.",
            )}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {composerDraft.rules.map((rule, ruleIndex) => (
            <article
              key={rule.id}
              draggable
              onDragStart={() =>
                setDragState({
                  ruleId: rule.id,
                  blockId: null,
                })
              }
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={() => {
                if (dragState.ruleId && dragState.ruleId !== rule.id) {
                  reorderRule(dragState.ruleId, rule.id);
                }
                setDragState({ ruleId: null, blockId: null });
              }}
              className="rounded-[1.6rem] border border-border/80 bg-white/90 p-5 shadow-[0_14px_40px_rgba(14,59,64,0.05)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        {translateUi(language, "Rule")} {ruleIndex + 1}
                      </span>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                        {rule.cadence === "step"
                          ? translateUi(language, "Step")
                          : translateUi(language, "Year")}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={rule.name}
                      onChange={(event) =>
                        updateRule(rule.id, (currentRule) => ({
                          ...currentRule,
                          name: event.currentTarget.value,
                        }))
                      }
                      className="h-11 w-full min-w-[16rem] rounded-2xl border border-input bg-background px-4 text-lg font-semibold outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center justify-between rounded-full border border-border/70 bg-muted/25 px-4 py-2 text-sm font-medium">
                    <span>{translateUi(language, "Enabled")}</span>
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(event) =>
                        updateRule(rule.id, (currentRule) => ({
                          ...currentRule,
                          enabled: event.currentTarget.checked,
                        }))
                      }
                      className="ml-3 h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                  </label>
                  <select
                    value={rule.cadence}
                    onChange={(event) =>
                      updateRule(rule.id, (currentRule) => ({
                        ...currentRule,
                        cadence: event.currentTarget.value as ComposerRule["cadence"],
                      }))
                    }
                    className="h-10 rounded-full border border-input bg-background px-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="step">{translateUi(language, "Step")}</option>
                    <option value="year">{translateUi(language, "Year")}</option>
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => moveRule(rule.id, "up")}
                    disabled={ruleIndex === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => moveRule(rule.id, "down")}
                    disabled={ruleIndex === composerDraft.rules.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => deleteRule(rule.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {translateUi(language, "Delete Rule")}
                  </Button>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {rule.blocks.map((block, blockIndex) => {
                  const definition = getComposerBlockDefinition(
                    block.type,
                    block.category,
                  );
                  const localizedDefinition = definition
                    ? localizeComposerBlockDefinition(definition, language)
                    : null;

                  return (
                    <div
                      key={block.id}
                      draggable
                      onDragStart={(event) => {
                        event.stopPropagation();
                        setDragState({
                          ruleId: rule.id,
                          blockId: block.id,
                        });
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        if (
                          dragState.ruleId === rule.id &&
                          dragState.blockId &&
                          dragState.blockId !== block.id
                        ) {
                          reorderBlock(rule.id, dragState.blockId, block.id);
                        }

                        setDragState({ ruleId: null, blockId: null });
                      }}
                      className="rounded-[1.35rem] border border-border/70 bg-muted/20 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <GripVertical className="mt-1 h-5 w-5 text-muted-foreground" />
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-medium text-slate-50">
                                {translateCategory(language, block.category)}
                              </span>
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                {localizedDefinition?.label ?? block.type}
                              </span>
                            </div>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {localizedDefinition?.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => moveBlock(rule.id, block.id, "up")}
                            disabled={blockIndex === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => moveBlock(rule.id, block.id, "down")}
                            disabled={blockIndex === rule.blocks.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => deleteBlock(rule.id, block.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {translateUi(language, "Delete")}
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4">
                        <BlockParameterFields
                          block={block}
                          onChange={(key, value) =>
                            updateBlock(
                              rule.id,
                              block.id,
                              (currentBlock) =>
                                ({
                                  ...currentBlock,
                                  payload: {
                                    ...currentBlock.payload,
                                    [key]: value,
                                  },
                                }) as ComposerBlock,
                            )
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-4">
                {categoryOrder.map((category) => {
                  const definitions = localizedRegistry[`${category}s` as const];

                  return (
                    <div
                      key={`${rule.id}-${category}`}
                      className="rounded-[1.25rem] border border-dashed border-border bg-white/80 p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {translateUi(language, `Add ${category}`)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {definitions.map((definition) => (
                          <Button
                            key={`${rule.id}-${definition.type}`}
                            type="button"
                            variant="outline"
                            onClick={() =>
                              addBlock(rule.id, definition.type, definition.category)
                            }
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            {definition.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[1.45rem] border border-border/70 bg-white/90 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {translateUi(language, "AST Preview")}
          </p>
          <textarea
            readOnly
            value={exported.json}
            className="mt-3 min-h-[24rem] w-full rounded-[1.2rem] border border-input bg-slate-950 px-4 py-4 font-mono text-xs leading-6 text-slate-100 outline-none"
          />
        </div>
        <div className="rounded-[1.45rem] border border-border/70 bg-white/90 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {translateUi(language, "Compiled Preview")}
          </p>
          <textarea
            readOnly
            value={JSON.stringify(composerCompiledDraft, null, 2)}
            className="mt-3 min-h-[24rem] w-full rounded-[1.2rem] border border-input bg-slate-950 px-4 py-4 font-mono text-xs leading-6 text-slate-100 outline-none"
          />
        </div>
      </div>
    </section>
  );
}
