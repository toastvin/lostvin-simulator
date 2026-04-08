import { create } from "zustand";
import { createStore } from "zustand/vanilla";
import type { StateCreator, StoreApi } from "zustand";

import {
  type ConfigFieldDefinition,
  type NormalizeIssue,
  type NormalizeConfigResult,
  type SimulationConfig,
  type ValidateConfigResult,
  type ValidationIssue,
} from "@/types/config";
import type {
  CanvasNormalizationIssue,
  CanvasSelection,
  ComposerCanvasDocument,
} from "@/types/composer-canvas";
import type {
  ConnectedCanvasDocument,
  ConnectedCanvasIssue,
  ConnectedCanvasSelection,
} from "@/types/connected-canvas";
import type {
  CompiledComposerRule,
  ComposerDocument,
  ComposerMode,
  ComposerValidationIssue,
} from "@/types/composer";
import type {
  ComparisonHistoryPoint,
  MetricsComparison,
  MetricsSnapshot,
  StatsSnapshot,
} from "@/types/metrics";
import type {
  Policy,
  PolicyValidationIssue,
  ValidatePoliciesResult,
} from "@/types/policies";
import type {
  Agent,
  EventNode,
  SimulationRuntimeState,
  SimulationStatus,
} from "@/types/simulation";
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_SIMULATION_SEED,
  getConfigFieldDefinitionById,
  getConfigFieldDefinitions,
} from "@/lib/config/fields";
import { createDefaultConfig } from "@/lib/config/defaults";
import { migrateConfig } from "@/lib/config/migrate";
import { normalizeConfig } from "@/lib/config/normalize";
import { validateConfig } from "@/lib/config/validate";
import { getAtPath, setAtPath } from "@/lib/config/path";
import { deriveComposerFromCanvas } from "@/lib/composer-canvas/derive-composer";
import { importComposerToCanvas } from "@/lib/composer-canvas/import";
import { normalizeCanvasDocument } from "@/lib/composer-canvas/normalize";
import { deriveComposerFromConnectedCanvas } from "@/lib/connected-canvas/derive-composer";
import { importPhase10CanvasToConnectedCanvas } from "@/lib/connected-canvas/import-from-phase10";
import { normalizeConnectedCanvasDocument } from "@/lib/connected-canvas/normalize";
import { validateConnectedCanvasDocument } from "@/lib/connected-canvas/validate";
import { compileComposerDocument } from "@/lib/composer/compile";
import { createEmptyComposerDocument } from "@/lib/composer/defaults";
import { importPoliciesToComposer } from "@/lib/composer/import";
import { validateComposerDocument } from "@/lib/composer/validate";
import {
  createMetricsSnapshot,
  createInitialMetricsSnapshot,
} from "@/lib/simulation/bootstrap";
import { initializeSimulationState } from "@/lib/simulation/initialize";
import { stepSimulation } from "@/lib/simulation/step";
import { createStatsSnapshot } from "@/lib/stats/aggregate";
import {
  buildComparisonHistoryPoint,
  buildMetricsComparison,
} from "@/lib/stats/comparison";
import { validatePolicies } from "@/lib/policies/validate";

const STATS_CAPTURE_INTERVAL_STEPS = 5;
const MAX_HISTORY_POINTS = 120;

type StoreBootstrap = {
  runtime: SimulationRuntimeState;
  metrics: MetricsSnapshot;
};

type ComparisonBootstrap = {
  comparisonBaselineRuntime: SimulationRuntimeState | null;
  comparisonBaselineMetrics: MetricsSnapshot | null;
  comparisonSnapshot: MetricsComparison | null;
  comparisonHistory: ComparisonHistoryPoint[];
};

type ComposerEvaluation = {
  compiledRules: CompiledComposerRule[];
  validationIssues: ComposerValidationIssue[];
  compileWarnings: string[];
};

type CanvasEvaluation = {
  document: ComposerCanvasDocument;
  validationIssues: CanvasNormalizationIssue[];
  composer: ComposerDocument;
  composerEvaluation: ComposerEvaluation;
};

type ConnectedCanvasEvaluation = {
  document: ConnectedCanvasDocument;
  validationIssues: ConnectedCanvasIssue[];
  composer: ComposerDocument;
  composerEvaluation: ComposerEvaluation;
};

export type SimulationStore = {
  seed: number;
  draftSeed: number;
  status: SimulationStatus;
  runtimeStep: number;
  runtimePolicyCost: number;
  playbackSpeed: number;
  fieldDefinitions: ConfigFieldDefinition[];
  draftConfig: SimulationConfig;
  appliedConfig: SimulationConfig;
  policiesDraft: Policy[];
  policiesApplied: Policy[];
  composerMode: ComposerMode;
  composerDraft: ComposerDocument;
  composerApplied: ComposerDocument;
  composerCompiledDraft: CompiledComposerRule[];
  composerCompiledApplied: CompiledComposerRule[];
  canvasDraft: ComposerCanvasDocument;
  canvasApplied: ComposerCanvasDocument;
  canvasSelection: CanvasSelection;
  connectedCanvasDraft: ConnectedCanvasDocument;
  connectedCanvasApplied: ConnectedCanvasDocument;
  connectedCanvasSelection: ConnectedCanvasSelection;
  agents: Agent[];
  events: EventNode[];
  metrics: MetricsSnapshot;
  metricsHistory: MetricsSnapshot[];
  statsSnapshot: StatsSnapshot;
  comparisonSnapshot: MetricsComparison | null;
  comparisonHistory: ComparisonHistoryPoint[];
  selectedPresetId: string | null;
  normalizationIssues: NormalizeIssue[];
  validationIssues: ValidationIssue[];
  policyValidationIssues: PolicyValidationIssue[];
  composerValidationIssues: ComposerValidationIssue[];
  composerCompileWarnings: string[];
  canvasValidationIssues: CanvasNormalizationIssue[];
  connectedCanvasValidationIssues: ConnectedCanvasIssue[];
  comparisonBaselineRuntime: SimulationRuntimeState | null;
  comparisonBaselineMetrics: MetricsSnapshot | null;
  setDraftSeed: (seed: number) => void;
  setStatus: (status: SimulationStatus) => void;
  pause: () => void;
  resume: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setDraftConfigValue: (fieldId: string, value: unknown) => NormalizeConfigResult;
  replaceDraftConfig: (input: unknown) => NormalizeConfigResult;
  setPoliciesDraft: (policies: Policy[]) => void;
  setComposerDraft: (document: ComposerDocument, mode?: ComposerMode) => void;
  importPoliciesToComposerDraft: (policies?: Policy[]) => void;
  clearComposerDraft: () => void;
  setCanvasDraft: (document: ComposerCanvasDocument) => void;
  importComposerToCanvasDraft: (composer?: ComposerDocument) => void;
  resetCanvasLayoutDraft: () => void;
  setCanvasSelection: (selection: CanvasSelection) => void;
  setConnectedCanvasDraft: (document: ConnectedCanvasDocument) => void;
  importCanvasToConnectedCanvasDraft: (canvas?: ComposerCanvasDocument) => void;
  resetConnectedCanvasDraft: () => void;
  setConnectedCanvasSelection: (selection: ConnectedCanvasSelection) => void;
  setSelectedPresetId: (presetId: string | null) => void;
  resetSimulation: (seed?: number) => void;
  applyDraftAndReset: (seed?: number) => boolean;
  tickSimulation: () => void;
  advanceSimulation: (steps: number) => void;
};

function bootstrapSimulation(
  seed: number,
  config: SimulationConfig,
): StoreBootstrap {
  const runtimeState = initializeSimulationState(seed, config);
  const metrics = createInitialMetricsSnapshot(runtimeState.agents);

  return { runtime: runtimeState, metrics };
}

function initializeComparisonBaseline(
  seed: number,
  config: SimulationConfig,
  currentMetrics: MetricsSnapshot,
  hasIntervention: boolean,
): ComparisonBootstrap {
  if (!hasIntervention) {
    return {
      comparisonBaselineRuntime: null,
      comparisonBaselineMetrics: null,
      comparisonSnapshot: null,
      comparisonHistory: [],
    };
  }

  const comparisonBaselineRuntime = initializeSimulationState(seed, config);
  const comparisonBaselineMetrics = createInitialMetricsSnapshot(
    comparisonBaselineRuntime.agents,
  );
  const comparisonSnapshot = buildMetricsComparison(
    currentMetrics,
    comparisonBaselineMetrics,
  );

  return {
    comparisonBaselineRuntime,
    comparisonBaselineMetrics,
    comparisonSnapshot,
    comparisonHistory: [
      buildComparisonHistoryPoint(currentMetrics, comparisonBaselineMetrics),
    ],
  };
}

function appendCappedHistory<T>(history: T[], next: T, limit = MAX_HISTORY_POINTS) {
  const appended = [...history, next];

  if (appended.length <= limit) {
    return appended;
  }

  return appended.slice(appended.length - limit);
}

function getValidationIssues(validation: ValidateConfigResult) {
  return [...validation.errors, ...validation.warnings];
}

function getPolicyValidationIssues(validation: ValidatePoliciesResult) {
  return [...validation.errors, ...validation.warnings];
}

function evaluateComposerDocument(
  document: ComposerDocument,
  extraWarnings: string[] = [],
): ComposerEvaluation {
  const validation = validateComposerDocument(document);
  const compileResult = validation.valid
    ? compileComposerDocument(document)
    : {
        compiledRules: [],
        warnings: [],
      };

  return {
    compiledRules: compileResult.compiledRules,
    validationIssues: [...validation.errors, ...validation.warnings],
    compileWarnings: [...extraWarnings, ...compileResult.warnings],
  };
}

function sanitizeCanvasSelection(
  selection: CanvasSelection,
  document: ComposerCanvasDocument,
): CanvasSelection {
  const hasFrame = selection.frameId
    ? document.frames.some((frame) => frame.id === selection.frameId)
    : true;
  const hasRule = selection.ruleId
    ? document.composer.rules.some((rule) => rule.id === selection.ruleId)
    : true;
  const hasBlock =
    selection.ruleId && selection.blockId
      ? document.composer.rules
          .find((rule) => rule.id === selection.ruleId)
          ?.blocks.some((block) => block.id === selection.blockId) ?? false
      : true;

  return {
    frameId: hasFrame ? selection.frameId : null,
    ruleId: hasRule ? selection.ruleId : null,
    blockId: hasBlock ? selection.blockId : null,
    lane: hasBlock || selection.blockId === null ? selection.lane : null,
  };
}

function sanitizeConnectedCanvasSelection(
  selection: ConnectedCanvasSelection,
  document: ConnectedCanvasDocument,
): ConnectedCanvasSelection {
  const hasNode = selection.nodeId
    ? document.nodes.some((node) => node.id === selection.nodeId)
    : true;
  const hasEdge = selection.edgeId
    ? document.edges.some((edge) => edge.id === selection.edgeId)
    : true;
  const hasPort = selection.portId
    ? document.ports.some((port) => port.id === selection.portId)
    : true;

  return {
    nodeId: hasNode ? selection.nodeId : null,
    edgeId: hasEdge ? selection.edgeId : null,
    portId: hasPort ? selection.portId : null,
  };
}

function buildCanvasFromComposer(document: ComposerDocument) {
  return normalizeCanvasDocument(importComposerToCanvas(document).document);
}

function buildConnectedCanvasFromCanvas(document: ComposerCanvasDocument) {
  return normalizeConnectedCanvasDocument(
    importPhase10CanvasToConnectedCanvas(document).document,
  );
}

function evaluateCanvasDocument(
  document: ComposerCanvasDocument,
  extraWarnings: string[] = [],
): CanvasEvaluation {
  const normalized = normalizeCanvasDocument(document);
  const derived = deriveComposerFromCanvas(normalized.document);
  const nextDocument = {
    ...normalized.document,
    composer: structuredClone(derived.composer),
  };
  const composerEvaluation = evaluateComposerDocument(
    derived.composer,
    extraWarnings,
  );

  return {
    document: nextDocument,
    validationIssues: normalized.issues,
    composer: derived.composer,
    composerEvaluation,
  };
}

function evaluateConnectedCanvasDocument(
  document: ConnectedCanvasDocument,
  extraWarnings: string[] = [],
): ConnectedCanvasEvaluation {
  const normalized = normalizeConnectedCanvasDocument(document);
  const validation = validateConnectedCanvasDocument(normalized.document);
  const derived = deriveComposerFromConnectedCanvas(normalized.document);
  const composerEvaluation = evaluateComposerDocument(
    derived.composer,
    extraWarnings,
  );

  return {
    document: normalized.document,
    validationIssues: [...validation.errors, ...validation.warnings],
    composer: derived.composer,
    composerEvaluation,
  };
}

function hasAppliedIntervention(
  policies: Policy[],
  composerRules: CompiledComposerRule[],
) {
  return (
    policies.some((policy) => policy.enabled) ||
    composerRules.some((rule) => rule.enabled)
  );
}

const createSimulationStateCreator =
  (initialSeed = DEFAULT_SIMULATION_SEED): StateCreator<SimulationStore> =>
  (set, get) => {
    const fieldDefinitions = getConfigFieldDefinitions();
    const baseConfig = createDefaultConfig(
      fieldDefinitions,
      CURRENT_SCHEMA_VERSION,
    );
    const initialBootstrap = bootstrapSimulation(initialSeed, baseConfig);
    const initialComposerDraft = createEmptyComposerDocument();
    const initialComposerApplied = createEmptyComposerDocument();
    const initialComposerEvaluation = evaluateComposerDocument(initialComposerDraft);
    const initialCanvasDraft = buildCanvasFromComposer(initialComposerDraft).document;
    const initialCanvasApplied = buildCanvasFromComposer(initialComposerApplied).document;
    const initialConnectedCanvasDraft =
      buildConnectedCanvasFromCanvas(initialCanvasDraft).document;
    const initialConnectedCanvasApplied =
      buildConnectedCanvasFromCanvas(initialCanvasApplied).document;

    const advanceRuntimeState = (
      current: SimulationStore,
      stepsToRun: number,
    ) => {
      let runtime = {
        step: current.runtimeStep,
        agents: current.agents,
        events: current.events,
        lastPolicyCost: current.runtimePolicyCost,
      };
      let baselineRuntime = current.comparisonBaselineRuntime;
      let metrics = current.metrics;
      let metricsHistory = current.metricsHistory;
      let statsSnapshot = current.statsSnapshot;
      let comparisonBaselineMetrics = current.comparisonBaselineMetrics;
      let comparisonSnapshot = current.comparisonSnapshot;
      let comparisonHistory = current.comparisonHistory;

      for (let index = 0; index < stepsToRun; index += 1) {
        runtime = stepSimulation(
          runtime,
          current.appliedConfig,
          current.policiesApplied,
          current.composerCompiledApplied,
        );
        baselineRuntime = baselineRuntime
          ? stepSimulation(baselineRuntime, current.appliedConfig, [], [])
          : null;

        const shouldCaptureStats =
          runtime.step % STATS_CAPTURE_INTERVAL_STEPS === 0;

        if (!shouldCaptureStats) {
          continue;
        }

        metrics = createMetricsSnapshot(
          runtime.step,
          runtime.agents,
          runtime.lastPolicyCost,
        );
        metricsHistory = appendCappedHistory(metricsHistory, metrics);
        statsSnapshot = createStatsSnapshot(metrics, runtime.agents);
        comparisonBaselineMetrics = baselineRuntime
          ? createMetricsSnapshot(
              baselineRuntime.step,
              baselineRuntime.agents,
              baselineRuntime.lastPolicyCost,
            )
          : null;
        comparisonSnapshot = comparisonBaselineMetrics
          ? buildMetricsComparison(metrics, comparisonBaselineMetrics)
          : null;
        comparisonHistory =
          comparisonBaselineMetrics && comparisonSnapshot
            ? appendCappedHistory(
                comparisonHistory,
                buildComparisonHistoryPoint(metrics, comparisonBaselineMetrics),
              )
            : comparisonHistory;
      }

      return {
        runtimeStep: runtime.step,
        runtimePolicyCost: runtime.lastPolicyCost,
        agents: runtime.agents,
        events: runtime.events,
        metrics,
        metricsHistory,
        statsSnapshot,
        comparisonBaselineRuntime: baselineRuntime,
        comparisonBaselineMetrics,
        comparisonSnapshot,
        comparisonHistory,
      };
    };

    return {
      seed: initialSeed,
      draftSeed: initialSeed,
      status: "idle",
      runtimeStep: initialBootstrap.runtime.step,
      runtimePolicyCost: initialBootstrap.runtime.lastPolicyCost,
      playbackSpeed: 1,
      fieldDefinitions,
      draftConfig: baseConfig,
      appliedConfig: baseConfig,
      policiesDraft: [],
      policiesApplied: [],
      composerMode: "custom_draft",
      composerDraft: initialComposerDraft,
      composerApplied: initialComposerApplied,
      composerCompiledDraft: initialComposerEvaluation.compiledRules,
      composerCompiledApplied: [],
      canvasDraft: initialCanvasDraft,
      canvasApplied: initialCanvasApplied,
      canvasSelection: {
        frameId: null,
        ruleId: null,
        blockId: null,
        lane: null,
      },
      connectedCanvasDraft: initialConnectedCanvasDraft,
      connectedCanvasApplied: initialConnectedCanvasApplied,
      connectedCanvasSelection: {
        nodeId: null,
        edgeId: null,
        portId: null,
      },
      agents: initialBootstrap.runtime.agents,
      events: initialBootstrap.runtime.events,
      metrics: initialBootstrap.metrics,
      metricsHistory: [initialBootstrap.metrics],
      statsSnapshot: createStatsSnapshot(
        initialBootstrap.metrics,
        initialBootstrap.runtime.agents,
      ),
      comparisonSnapshot: null,
      comparisonHistory: [],
      selectedPresetId: "laissez-faire",
      normalizationIssues: [],
      validationIssues: [],
      policyValidationIssues: [],
      composerValidationIssues: initialComposerEvaluation.validationIssues,
      composerCompileWarnings: initialComposerEvaluation.compileWarnings,
      canvasValidationIssues: [],
      connectedCanvasValidationIssues: [],
      comparisonBaselineRuntime: null,
      comparisonBaselineMetrics: null,
      setDraftSeed: (seed) => {
        set({ draftSeed: seed });
      },
      setStatus: (status) => {
        set({ status });
      },
      pause: () => {
        if (get().status === "running") {
          set({ status: "paused" });
        }
      },
      resume: () => {
        if (get().status !== "running") {
          set({ status: "running" });
        }
      },
      setPlaybackSpeed: (speed) => {
        const normalizedSpeed = Number.isFinite(speed)
          ? Math.min(Math.max(Math.round(speed), 1), 64)
          : 1;

        set({ playbackSpeed: normalizedSpeed });
      },
      setDraftConfigValue: (fieldId, value) => {
        const field = getConfigFieldDefinitionById(fieldId);

        if (!field || field.scope !== "simulation") {
          return {
            config: get().draftConfig,
            issues: [],
          };
        }

        const rawDraft = structuredClone(get().draftConfig) as Record<
          string,
          unknown
        >;
        setAtPath(rawDraft, field.targetPath, value);

        const normalized = normalizeConfig(
          rawDraft,
          fieldDefinitions,
          CURRENT_SCHEMA_VERSION,
        );
        const validation = validateConfig(normalized.config, fieldDefinitions);

        set({
          draftConfig: normalized.config,
          normalizationIssues: normalized.issues,
          validationIssues: getValidationIssues(validation),
        });

        return normalized;
      },
      replaceDraftConfig: (input) => {
        const migrated = migrateConfig(input);
        const normalized = normalizeConfig(
          migrated.input,
          fieldDefinitions,
          CURRENT_SCHEMA_VERSION,
        );
        const validation = validateConfig(normalized.config, fieldDefinitions);

        set({
          draftConfig: normalized.config,
          normalizationIssues: normalized.issues,
          validationIssues: getValidationIssues(validation),
        });

        return normalized;
      },
      setPoliciesDraft: (policies) => {
        const validation = validatePolicies(policies);

        set({
          policiesDraft: policies,
          policyValidationIssues: getPolicyValidationIssues(validation),
        });
      },
      setComposerDraft: (document, mode = "custom_draft") => {
        const nextDocument = structuredClone(document);
        const composerEvaluation = evaluateComposerDocument(nextDocument);
        const canvasResult = buildCanvasFromComposer(nextDocument);
        const connectedCanvasResult = buildConnectedCanvasFromCanvas(
          canvasResult.document,
        );

        set({
          composerDraft: nextDocument,
          composerCompiledDraft: composerEvaluation.compiledRules,
          composerValidationIssues: composerEvaluation.validationIssues,
          composerCompileWarnings: composerEvaluation.compileWarnings,
          composerMode: mode,
          canvasDraft: {
            ...canvasResult.document,
            composer: structuredClone(nextDocument),
          },
          canvasValidationIssues: canvasResult.issues,
          canvasSelection: sanitizeCanvasSelection(get().canvasSelection, {
            ...canvasResult.document,
            composer: structuredClone(nextDocument),
          }),
          connectedCanvasDraft: connectedCanvasResult.document,
          connectedCanvasValidationIssues: connectedCanvasResult.issues,
          connectedCanvasSelection: sanitizeConnectedCanvasSelection(
            get().connectedCanvasSelection,
            connectedCanvasResult.document,
          ),
        });
      },
      importPoliciesToComposerDraft: (policies) => {
        const imported = importPoliciesToComposer(policies ?? get().policiesDraft);
        const composerEvaluation = evaluateComposerDocument(
          imported.document,
          imported.warnings,
        );
        const canvasResult = buildCanvasFromComposer(imported.document);
        const connectedCanvasResult = buildConnectedCanvasFromCanvas(
          canvasResult.document,
        );

        set({
          composerDraft: imported.document,
          composerCompiledDraft: composerEvaluation.compiledRules,
          composerValidationIssues: composerEvaluation.validationIssues,
          composerCompileWarnings: composerEvaluation.compileWarnings,
          composerMode: "preset_import",
          canvasDraft: {
            ...canvasResult.document,
            composer: structuredClone(imported.document),
          },
          canvasValidationIssues: canvasResult.issues,
          canvasSelection: {
            frameId: null,
            ruleId: null,
            blockId: null,
            lane: null,
          },
          connectedCanvasDraft: connectedCanvasResult.document,
          connectedCanvasValidationIssues: connectedCanvasResult.issues,
          connectedCanvasSelection: {
            nodeId: null,
            edgeId: null,
            portId: null,
          },
        });
      },
      clearComposerDraft: () => {
        const nextDocument = createEmptyComposerDocument();
        const composerEvaluation = evaluateComposerDocument(nextDocument);
        const canvasResult = buildCanvasFromComposer(nextDocument);
        const connectedCanvasResult = buildConnectedCanvasFromCanvas(
          canvasResult.document,
        );

        set({
          composerDraft: nextDocument,
          composerCompiledDraft: composerEvaluation.compiledRules,
          composerValidationIssues: composerEvaluation.validationIssues,
          composerCompileWarnings: composerEvaluation.compileWarnings,
          composerMode: "custom_draft",
          canvasDraft: {
            ...canvasResult.document,
            composer: structuredClone(nextDocument),
          },
          canvasValidationIssues: canvasResult.issues,
          canvasSelection: {
            frameId: null,
            ruleId: null,
            blockId: null,
            lane: null,
          },
          connectedCanvasDraft: connectedCanvasResult.document,
          connectedCanvasValidationIssues: connectedCanvasResult.issues,
          connectedCanvasSelection: {
            nodeId: null,
            edgeId: null,
            portId: null,
          },
        });
      },
      setCanvasDraft: (document) => {
        const evaluation = evaluateCanvasDocument(document);
        const connectedCanvasResult = buildConnectedCanvasFromCanvas(
          evaluation.document,
        );

        set({
          canvasDraft: evaluation.document,
          canvasValidationIssues: evaluation.validationIssues,
          canvasSelection: sanitizeCanvasSelection(
            get().canvasSelection,
            evaluation.document,
          ),
          composerDraft: evaluation.composer,
          composerCompiledDraft: evaluation.composerEvaluation.compiledRules,
          composerValidationIssues: evaluation.composerEvaluation.validationIssues,
          composerCompileWarnings: evaluation.composerEvaluation.compileWarnings,
          composerMode: "custom_draft",
          connectedCanvasDraft: connectedCanvasResult.document,
          connectedCanvasValidationIssues: connectedCanvasResult.issues,
          connectedCanvasSelection: sanitizeConnectedCanvasSelection(
            get().connectedCanvasSelection,
            connectedCanvasResult.document,
          ),
        });
      },
      importComposerToCanvasDraft: (composer) => {
        const sourceComposer = structuredClone(composer ?? get().composerDraft);
        const canvasResult = buildCanvasFromComposer(sourceComposer);
        const connectedCanvasResult = buildConnectedCanvasFromCanvas(
          canvasResult.document,
        );

        set({
          canvasDraft: {
            ...canvasResult.document,
            composer: structuredClone(sourceComposer),
          },
          canvasValidationIssues: canvasResult.issues,
          canvasSelection: {
            frameId: null,
            ruleId: null,
            blockId: null,
            lane: null,
          },
          connectedCanvasDraft: connectedCanvasResult.document,
          connectedCanvasValidationIssues: connectedCanvasResult.issues,
          connectedCanvasSelection: {
            nodeId: null,
            edgeId: null,
            portId: null,
          },
        });
      },
      resetCanvasLayoutDraft: () => {
        const sourceComposer = structuredClone(get().composerDraft);
        const canvasResult = buildCanvasFromComposer(sourceComposer);
        const connectedCanvasResult = buildConnectedCanvasFromCanvas(
          canvasResult.document,
        );

        set({
          canvasDraft: {
            ...canvasResult.document,
            composer: structuredClone(sourceComposer),
          },
          canvasValidationIssues: canvasResult.issues,
          canvasSelection: {
            frameId: null,
            ruleId: null,
            blockId: null,
            lane: null,
          },
          connectedCanvasDraft: connectedCanvasResult.document,
          connectedCanvasValidationIssues: connectedCanvasResult.issues,
          connectedCanvasSelection: {
            nodeId: null,
            edgeId: null,
            portId: null,
          },
        });
      },
      setCanvasSelection: (selection) => {
        set({
          canvasSelection: sanitizeCanvasSelection(selection, get().canvasDraft),
        });
      },
      setConnectedCanvasDraft: (document) => {
        const evaluation = evaluateConnectedCanvasDocument(document);
        const canvasResult = buildCanvasFromComposer(evaluation.composer);

        set({
          connectedCanvasDraft: evaluation.document,
          connectedCanvasValidationIssues: evaluation.validationIssues,
          connectedCanvasSelection: sanitizeConnectedCanvasSelection(
            get().connectedCanvasSelection,
            evaluation.document,
          ),
          composerDraft: evaluation.composer,
          composerCompiledDraft: evaluation.composerEvaluation.compiledRules,
          composerValidationIssues: evaluation.composerEvaluation.validationIssues,
          composerCompileWarnings: evaluation.composerEvaluation.compileWarnings,
          composerMode: "custom_draft",
          canvasDraft: {
            ...canvasResult.document,
            composer: structuredClone(evaluation.composer),
          },
          canvasValidationIssues: canvasResult.issues,
          canvasSelection: sanitizeCanvasSelection(get().canvasSelection, {
            ...canvasResult.document,
            composer: structuredClone(evaluation.composer),
          }),
        });
      },
      importCanvasToConnectedCanvasDraft: (canvas) => {
        const sourceCanvas = structuredClone(canvas ?? get().canvasDraft);
        const connectedCanvasResult = buildConnectedCanvasFromCanvas(sourceCanvas);

        set({
          connectedCanvasDraft: connectedCanvasResult.document,
          connectedCanvasValidationIssues: connectedCanvasResult.issues,
          connectedCanvasSelection: {
            nodeId: null,
            edgeId: null,
            portId: null,
          },
        });
      },
      resetConnectedCanvasDraft: () => {
        const connectedCanvasResult = buildConnectedCanvasFromCanvas(
          get().canvasDraft,
        );

        set({
          connectedCanvasDraft: connectedCanvasResult.document,
          connectedCanvasValidationIssues: connectedCanvasResult.issues,
          connectedCanvasSelection: {
            nodeId: null,
            edgeId: null,
            portId: null,
          },
        });
      },
      setConnectedCanvasSelection: (selection) => {
        set({
          connectedCanvasSelection: sanitizeConnectedCanvasSelection(
            selection,
            get().connectedCanvasDraft,
          ),
        });
      },
      setSelectedPresetId: (presetId) => {
        set({ selectedPresetId: presetId });
      },
      resetSimulation: (seed) => {
        const current = get();
        const nextSeed = seed ?? current.seed;
        const bootstrap = bootstrapSimulation(nextSeed, current.appliedConfig);

        set({
          seed: nextSeed,
          draftSeed: seed === undefined ? current.draftSeed : nextSeed,
          status: "idle",
          runtimeStep: bootstrap.runtime.step,
          runtimePolicyCost: bootstrap.runtime.lastPolicyCost,
          agents: bootstrap.runtime.agents,
          events: bootstrap.runtime.events,
          metrics: bootstrap.metrics,
          metricsHistory: [bootstrap.metrics],
          statsSnapshot: createStatsSnapshot(
            bootstrap.metrics,
            bootstrap.runtime.agents,
          ),
          ...initializeComparisonBaseline(
            nextSeed,
            current.appliedConfig,
            bootstrap.metrics,
            hasAppliedIntervention(
              current.policiesApplied,
              current.composerCompiledApplied,
            ),
          ),
        });
      },
      applyDraftAndReset: (seed) => {
        const validation = validateConfig(get().draftConfig, fieldDefinitions);
        const policyValidation = validatePolicies(get().policiesDraft);
        const connectedCanvasEvaluation = evaluateConnectedCanvasDocument(
          get().connectedCanvasDraft,
        );
        const canvasResult = buildCanvasFromComposer(
          connectedCanvasEvaluation.composer,
        );

        set({
          validationIssues: getValidationIssues(validation),
          policyValidationIssues: getPolicyValidationIssues(policyValidation),
          connectedCanvasValidationIssues:
            connectedCanvasEvaluation.validationIssues,
          composerValidationIssues:
            connectedCanvasEvaluation.composerEvaluation.validationIssues,
          composerCompileWarnings:
            connectedCanvasEvaluation.composerEvaluation.compileWarnings,
          composerDraft: connectedCanvasEvaluation.composer,
          composerCompiledDraft:
            connectedCanvasEvaluation.composerEvaluation.compiledRules,
          connectedCanvasDraft: connectedCanvasEvaluation.document,
          canvasDraft: {
            ...canvasResult.document,
            composer: structuredClone(connectedCanvasEvaluation.composer),
          },
          canvasValidationIssues: canvasResult.issues,
        });

        if (
          !validation.valid ||
          !policyValidation.valid ||
          connectedCanvasEvaluation.validationIssues.some(
            (issue) => issue.severity === "error",
          ) ||
          connectedCanvasEvaluation.composerEvaluation.validationIssues.some(
            (issue) => issue.severity === "error",
          )
        ) {
          return false;
        }

        const nextSeed = seed ?? get().draftSeed;
        const nextAppliedConfig = structuredClone(get().draftConfig);
        const nextPoliciesApplied = structuredClone(get().policiesDraft);
        const nextComposerApplied = structuredClone(
          connectedCanvasEvaluation.composer,
        );
        const nextCanvasApplied = structuredClone(canvasResult.document);
        const nextConnectedCanvasApplied = structuredClone(
          connectedCanvasEvaluation.document,
        );
        const nextComposerCompiledApplied =
          connectedCanvasEvaluation.composerEvaluation.compiledRules;
        const bootstrap = bootstrapSimulation(nextSeed, nextAppliedConfig);
        const comparisonBaseline = initializeComparisonBaseline(
          nextSeed,
          nextAppliedConfig,
          bootstrap.metrics,
          hasAppliedIntervention(
            nextPoliciesApplied,
            nextComposerCompiledApplied,
          ),
        );

        set({
          seed: nextSeed,
          draftSeed: nextSeed,
          status: "idle",
          runtimeStep: bootstrap.runtime.step,
          runtimePolicyCost: bootstrap.runtime.lastPolicyCost,
          appliedConfig: nextAppliedConfig,
          policiesApplied: nextPoliciesApplied,
          composerApplied: nextComposerApplied,
          composerCompiledApplied: nextComposerCompiledApplied,
          canvasApplied: nextCanvasApplied,
          connectedCanvasApplied: nextConnectedCanvasApplied,
          agents: bootstrap.runtime.agents,
          events: bootstrap.runtime.events,
          metrics: bootstrap.metrics,
          metricsHistory: [bootstrap.metrics],
          statsSnapshot: createStatsSnapshot(
            bootstrap.metrics,
            bootstrap.runtime.agents,
          ),
          ...comparisonBaseline,
        });

        return true;
      },
      tickSimulation: () => {
        const current = get();
        set(advanceRuntimeState(current, 1));
      },
      advanceSimulation: (steps) => {
        const normalizedSteps = Math.min(
          Math.max(Math.floor(steps), 1),
          5000,
        );

        if (!Number.isFinite(normalizedSteps) || normalizedSteps < 1) {
          return;
        }

        const current = get();
        set(advanceRuntimeState(current, normalizedSteps));
      },
    };
  };

export const useSimulationStore = create<SimulationStore>()(
  createSimulationStateCreator(),
);

export function createSimulationStore(
  initialSeed = DEFAULT_SIMULATION_SEED,
): StoreApi<SimulationStore> {
  return createStore<SimulationStore>(createSimulationStateCreator(initialSeed));
}

export function getDraftConfigValue(
  config: SimulationConfig,
  fieldId: string,
): unknown {
  const field = getConfigFieldDefinitionById(fieldId);
  return field ? getAtPath(config, field.targetPath) : undefined;
}

export { CURRENT_SCHEMA_VERSION, DEFAULT_SIMULATION_SEED };
