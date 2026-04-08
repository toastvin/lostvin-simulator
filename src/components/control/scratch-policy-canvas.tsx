"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Copy,
  Download,
  Grip,
  LayoutTemplate,
  Minus,
  MousePointer2,
  Plus,
  Sparkles,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";

import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import {
  localizeComposerBlockDefinition,
  summarizeComposerBlock,
  translateCategory,
  translateUi,
} from "@/lib/i18n/ui";
import { cn } from "@/lib/utils";
import {
  createDefaultCanvasViewport,
  createDefaultRuleFrame,
} from "@/lib/composer-canvas/defaults";
import { exportCanvasDocument } from "@/lib/composer-canvas/export";
import {
  buildFrameMetrics,
  createDistributedFramePositions,
  createTidiedFramePositions,
  getSnappedFramePosition,
  getSnappedFrameWidth,
  getWorldBounds,
  type FrameMetric,
  type SnapGuideSet,
} from "@/lib/composer-canvas/layout";
import {
  addPaletteBlockToLane,
  canDropIntoLane,
  deleteBlockFromDocument,
  deleteRuleFromDocument,
  getBlockById,
  getRuleById,
  moveCanvasBlockToLane,
  updateBlockPayload,
  withUpdatedRule,
  type ScratchCanvasDragPayload,
} from "@/lib/composer-canvas/mutate";
import { composerRegistry, getComposerBlockDefinition } from "@/lib/composer/registry";
import { createComposerRule } from "@/lib/composer/defaults";
import { useSimulationStore } from "@/store/simulationStore";
import type {
  CanvasPoint,
  ComposerCanvasDocument,
  ComposerCanvasLane,
} from "@/types/composer-canvas";
import type {
  ComposerBlock,
  ComposerMode,
  ComposerRule,
} from "@/types/composer";
import type { PolicyBracket } from "@/types/policies";

const laneLabels: Record<ComposerCanvasLane, string> = {
  target: "Target Lane",
  condition: "Condition Lane",
  effect: "Effect Lane",
  modifier: "Modifier Lane",
};

const GUIDE_SPAN = 4800;
const AUTO_PAN_PADDING = 88;
const AUTO_PAN_SPEED = 24;
const MINIMAP_WIDTH = 220;
const MINIMAP_HEIGHT = 148;
const MINIMAP_PADDING = 12;

type MinimapDragState = {
  active: boolean;
};

function formatModeLabel(mode: ComposerMode) {
  switch (mode) {
    case "preset_import":
      return "Imported from preset";
    case "custom_draft":
      return "Canvas draft";
    case "custom_applied":
      return "Canvas applied";
  }
}

function parseNumberInput(raw: string, fallback: number) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function ComposerIssueList({
  title,
  issues,
  tone,
}: {
  title: string;
  issues: Array<{ path?: string; code: string; message: string }>;
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
          <li key={`${issue.path ?? issue.code}-${index}`}>{issue.message}</li>
        ))}
      </ul>
    </div>
  );
}

function DropIndicator({
  allowed,
  label,
}: {
  allowed: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        "rounded-full border border-dashed px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]",
        allowed
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-rose-300 bg-rose-50 text-rose-700",
      )}
    >
      {label}
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

  return (
    <div className="space-y-3">
      {brackets.map((bracket, index) => (
        <div
          key={`canvas-bracket-${index}`}
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
                onChange(
                  brackets.map((candidate, candidateIndex) =>
                    candidateIndex === index
                      ? {
                          ...candidate,
                          threshold: parseNumberInput(
                            event.currentTarget.value,
                            candidate.threshold,
                          ),
                        }
                      : candidate,
                  ),
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
                onChange(
                  brackets.map((candidate, candidateIndex) =>
                    candidateIndex === index
                      ? {
                          ...candidate,
                          rate: parseNumberInput(
                            event.currentTarget.value,
                            candidate.rate,
                          ),
                        }
                      : candidate,
                  ),
                )
              }
              className="mt-2 h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onChange(
                  brackets.filter((_, candidateIndex) => candidateIndex !== index),
                )
              }
              disabled={brackets.length <= 1}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {translateUi(language, "Remove")}
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          onChange([
            ...brackets,
            {
              threshold: (brackets.at(-1)?.threshold ?? 100) + 100,
              rate: 0.05,
            },
          ])
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        {translateUi(language, "Add Bracket")}
      </Button>
    </div>
  );
}

function BlockInspector({
  block,
  onChange,
}: {
  block: ComposerBlock;
  onChange: (nextPayload: Record<string, unknown>) => void;
}) {
  const { language } = useLanguage();
  const resolvedDefinition = getComposerBlockDefinition(block.type, block.category);
  const definition = resolvedDefinition
    ? localizeComposerBlockDefinition(resolvedDefinition, language)
    : null;

  if (!definition) {
    return null;
  }

  if (block.type === "progressiveTax") {
    const progressiveBlock = block as ComposerBlock & {
      payload: { brackets: PolicyBracket[] };
    };

    return (
      <BracketEditor
        brackets={progressiveBlock.payload.brackets}
        onChange={(next) => onChange({ ...progressiveBlock.payload, brackets: next })}
      />
    );
  }

  return (
    <div className="space-y-4">
      {definition.parameters.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/80 bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
          {translateUi(language, "This block does not need extra parameters.")}
        </p>
      ) : null}
      {definition.parameters.map((parameter) => {
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
                  onChange({
                    ...block.payload,
                    [parameter.key]: parseNumberInput(
                      event.currentTarget.value,
                      typeof value === "number" ? value : 0,
                    ),
                  })
                }
                className="mt-2 h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {parameter.description}
              </p>
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
              onChange={(event) =>
                onChange({
                  ...block.payload,
                  [parameter.key]: event.currentTarget.checked,
                })
              }
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
          </label>
        );
      })}
    </div>
  );
}

export function ScratchPolicyCanvas() {
  const { language } = useLanguage();
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLDivElement | null>(null);
  const composerMode = useSimulationStore((state) => state.composerMode);
  const composerCompiledDraft = useSimulationStore(
    (state) => state.composerCompiledDraft,
  );
  const composerValidationIssues = useSimulationStore(
    (state) => state.composerValidationIssues,
  );
  const composerCompileWarnings = useSimulationStore(
    (state) => state.composerCompileWarnings,
  );
  const canvasDraft = useSimulationStore((state) => state.canvasDraft);
  const canvasApplied = useSimulationStore((state) => state.canvasApplied);
  const canvasSelection = useSimulationStore((state) => state.canvasSelection);
  const canvasValidationIssues = useSimulationStore(
    (state) => state.canvasValidationIssues,
  );
  const policiesDraft = useSimulationStore((state) => state.policiesDraft);
  const setCanvasDraft = useSimulationStore((state) => state.setCanvasDraft);
  const setCanvasSelection = useSimulationStore(
    (state) => state.setCanvasSelection,
  );
  const importPoliciesToComposerDraft = useSimulationStore(
    (state) => state.importPoliciesToComposerDraft,
  );
  const importComposerToCanvasDraft = useSimulationStore(
    (state) => state.importComposerToCanvasDraft,
  );
  const resetCanvasLayoutDraft = useSimulationStore(
    (state) => state.resetCanvasLayoutDraft,
  );

  const [dragPayload, setDragPayload] = useState<ScratchCanvasDragPayload | null>(
    null,
  );
  const [hoverLane, setHoverLane] = useState<{
    frameId: string;
    ruleId: string;
    lane: ComposerCanvasLane;
    index: number;
    allowed: boolean;
  } | null>(null);
  const [frameDrag, setFrameDrag] = useState<{
    frameId: string;
    startClient: CanvasPoint;
    startPosition: CanvasPoint;
  } | null>(null);
  const [frameResize, setFrameResize] = useState<{
    frameId: string;
    startClientX: number;
    startWidth: number;
  } | null>(null);
  const [framePreview, setFramePreview] = useState<Record<string, CanvasPoint>>({});
  const [frameWidthPreview, setFrameWidthPreview] = useState<Record<string, number>>(
    {},
  );
  const [snapGuides, setSnapGuides] = useState<SnapGuideSet>({
    vertical: [],
    horizontal: [],
  });
  const [workspaceSize, setWorkspaceSize] = useState({
    width: 0,
    height: 0,
  });
  const [minimapDrag, setMinimapDrag] = useState<MinimapDragState>({
    active: false,
  });
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const exported = useMemo(
    () => exportCanvasDocument(canvasDraft),
    [canvasDraft],
  );

  const selectedRule = canvasSelection.ruleId
    ? getRuleById(canvasDraft, canvasSelection.ruleId)
    : null;
  const selectedBlock =
    canvasSelection.ruleId && canvasSelection.blockId
      ? getBlockById(canvasDraft, canvasSelection.ruleId, canvasSelection.blockId)
      : null;
  const composerErrorIssues = composerValidationIssues.filter(
    (issue) => issue.severity === "error",
  );
  const composerWarningIssues = composerValidationIssues.filter(
    (issue) =>
      issue.severity === "warning" && issue.code !== "empty_document",
  );
  const visibleCompileWarnings = composerCompileWarnings.filter(
    (warning) =>
      warning !== "Composer draft is empty. Only preset or raw policy rules will run.",
  );
  const frameMetrics = useMemo(
    () => buildFrameMetrics(canvasDraft, framePreview, frameWidthPreview),
    [canvasDraft, framePreview, frameWidthPreview],
  );
  const worldBounds = useMemo(() => getWorldBounds(frameMetrics), [frameMetrics]);
  const minimapScale = useMemo(
    () =>
      Math.min(
        (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / worldBounds.width,
        (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / worldBounds.height,
      ),
    [worldBounds.height, worldBounds.width],
  );
  const viewportRect = useMemo(() => {
    if (workspaceSize.width === 0 || workspaceSize.height === 0) {
      return null;
    }

    const left = -canvasDraft.viewport.x / canvasDraft.viewport.zoom;
    const top = -canvasDraft.viewport.y / canvasDraft.viewport.zoom;
    const width = workspaceSize.width / canvasDraft.viewport.zoom;
    const height = workspaceSize.height / canvasDraft.viewport.zoom;

    return {
      left,
      top,
      width,
      height,
    };
  }, [canvasDraft.viewport, workspaceSize.height, workspaceSize.width]);

  const clearSelection = () => {
    setCanvasSelection({
      frameId: null,
      ruleId: null,
      blockId: null,
      lane: null,
    });
    setHoverLane(null);
    setSnapGuides({
      vertical: [],
      horizontal: [],
    });
  };

  const autoPanFromClient = (clientX: number, clientY: number) => {
    const workspaceNode = workspaceRef.current;

    if (!workspaceNode) {
      return { dx: 0, dy: 0 };
    }

    const rect = workspaceNode.getBoundingClientRect();
    let dx = 0;
    let dy = 0;

    if (clientX - rect.left < AUTO_PAN_PADDING) {
      dx = AUTO_PAN_SPEED;
    } else if (rect.right - clientX < AUTO_PAN_PADDING) {
      dx = -AUTO_PAN_SPEED;
    }

    if (clientY - rect.top < AUTO_PAN_PADDING) {
      dy = AUTO_PAN_SPEED;
    } else if (rect.bottom - clientY < AUTO_PAN_PADDING) {
      dy = -AUTO_PAN_SPEED;
    }

    if (dx === 0 && dy === 0) {
      return { dx, dy };
    }

    setCanvasDraft({
      ...canvasDraft,
      viewport: {
        ...canvasDraft.viewport,
        x: canvasDraft.viewport.x + dx,
        y: canvasDraft.viewport.y + dy,
      },
    });

    return { dx, dy };
  };

  useEffect(() => {
    const node = workspaceRef.current;

    if (!node) {
      return;
    }

    const updateSize = () => {
      setWorkspaceSize({
        width: node.clientWidth,
        height: node.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!frameDrag && !frameResize) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const zoom = canvasDraft.viewport.zoom;
      const autoPan = autoPanFromClient(event.clientX, event.clientY);

      if (frameDrag) {
        const adjustedStartPosition = {
          x: frameDrag.startPosition.x - autoPan.dx / zoom,
          y: frameDrag.startPosition.y - autoPan.dy / zoom,
        };
        const deltaX = (event.clientX - frameDrag.startClient.x) / zoom;
        const deltaY = (event.clientY - frameDrag.startClient.y) / zoom;
        const rawPoint = {
          x: adjustedStartPosition.x + deltaX,
          y: adjustedStartPosition.y + deltaY,
        };
        const currentMetric = frameMetrics.find(
          (metric) => metric.id === frameDrag.frameId,
        );

        if (!currentMetric) {
          return;
        }

        const snapped = getSnappedFramePosition(
          currentMetric,
          frameMetrics.filter((metric) => metric.id !== frameDrag.frameId),
          rawPoint,
        );

        setFramePreview((current) => ({
          ...current,
          [frameDrag.frameId]: {
            x: snapped.point.x,
            y: snapped.point.y,
          },
        }));
        setSnapGuides(snapped.guides);

        if (autoPan.dx !== 0 || autoPan.dy !== 0) {
          setFrameDrag((current) =>
            current
              ? {
                  ...current,
                  startPosition: adjustedStartPosition,
                }
              : current,
          );
        }
      }

      if (frameResize) {
        const adjustedStartWidth = frameResize.startWidth - autoPan.dx / zoom;
        const deltaWidth = (event.clientX - frameResize.startClientX) / zoom;
        const currentMetric = frameMetrics.find(
          (metric) => metric.id === frameResize.frameId,
        );

        if (!currentMetric) {
          return;
        }

        const snapped = getSnappedFrameWidth(
          currentMetric,
          frameMetrics.filter((metric) => metric.id !== frameResize.frameId),
          adjustedStartWidth + deltaWidth,
        );

        setFrameWidthPreview((current) => ({
          ...current,
          [frameResize.frameId]: snapped.width,
        }));
        setSnapGuides(snapped.guides);

        if (autoPan.dx !== 0) {
          setFrameResize((current) =>
            current
              ? {
                  ...current,
                  startWidth: adjustedStartWidth,
                }
              : current,
          );
        }
      }
    };

    const handlePointerUp = () => {
      if (frameDrag) {
        const preview = framePreview[frameDrag.frameId];

        if (preview) {
          setCanvasDraft({
            ...canvasDraft,
            frames: canvasDraft.frames.map((frame) =>
              frame.id === frameDrag.frameId
                ? {
                    ...frame,
                    x: preview.x,
                    y: preview.y,
                    zIndex:
                      Math.max(
                        ...canvasDraft.frames.map((candidate) => candidate.zIndex),
                        0,
                      ) + 1,
                  }
                : frame,
            ),
          });
        }
      }

      if (frameResize) {
        const previewWidth = frameWidthPreview[frameResize.frameId];

        if (previewWidth) {
          setCanvasDraft({
            ...canvasDraft,
            frames: canvasDraft.frames.map((frame) =>
              frame.id === frameResize.frameId
                ? {
                    ...frame,
                    width: previewWidth,
                    zIndex:
                      Math.max(
                        ...canvasDraft.frames.map((candidate) => candidate.zIndex),
                        0,
                      ) + 1,
                  }
                : frame,
            ),
          });
        }
      }

      setFrameDrag(null);
      setFrameResize(null);
      setFramePreview((current) => {
        const next = { ...current };
        if (frameDrag) {
          delete next[frameDrag.frameId];
        }
        return next;
      });
      setFrameWidthPreview((current) => {
        const next = { ...current };
        if (frameResize) {
          delete next[frameResize.frameId];
        }
        return next;
      });
      setSnapGuides({
        vertical: [],
        horizontal: [],
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    canvasDraft,
    autoPanFromClient,
    frameDrag,
    frameMetrics,
    framePreview,
    frameResize,
    frameWidthPreview,
    setCanvasDraft,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      if (
        target?.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      ) {
        return;
      }

      if (event.key === "Escape") {
        clearSelection();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedBlock && selectedRule) {
          event.preventDefault();
          handleDeleteBlock(selectedRule.id, selectedBlock.id);
          return;
        }

        if (selectedRule) {
          event.preventDefault();
          handleDeleteRule(selectedRule.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedBlock, selectedRule]);

  const updateDocument = (nextDocument: ComposerCanvasDocument) => {
    setCanvasDraft(nextDocument);
  };

  const updateViewport = (
    updater: (viewport: ComposerCanvasDocument["viewport"]) => ComposerCanvasDocument["viewport"],
  ) => {
    updateDocument({
      ...canvasDraft,
      viewport: updater(canvasDraft.viewport),
    });
  };

  const panViewport = (deltaX: number, deltaY: number) => {
    updateViewport((viewport) => ({
      ...viewport,
      x: viewport.x + deltaX,
      y: viewport.y + deltaY,
    }));
  };

  const centerViewportOnWorldPoint = (worldX: number, worldY: number) => {
    updateViewport((viewport) => ({
      ...viewport,
      x: workspaceSize.width / 2 - worldX * viewport.zoom,
      y: workspaceSize.height / 2 - worldY * viewport.zoom,
    }));
  };

  const updateViewportFromMinimapClient = (clientX: number, clientY: number) => {
    const minimapNode = minimapRef.current;

    if (
      !minimapNode ||
      workspaceSize.width === 0 ||
      workspaceSize.height === 0 ||
      minimapScale === 0
    ) {
      return;
    }

    const rect = minimapNode.getBoundingClientRect();
    const minimapWidth = rect.width;
    const minimapHeight = rect.height;
    const contentWidth = worldBounds.width * minimapScale;
    const contentHeight = worldBounds.height * minimapScale;
    const offsetX = (minimapWidth - contentWidth) / 2;
    const offsetY = (minimapHeight - contentHeight) / 2;
    const localX = clamp(clientX - rect.left - offsetX, 0, contentWidth);
    const localY = clamp(clientY - rect.top - offsetY, 0, contentHeight);
    const worldX = worldBounds.minX + localX / minimapScale;
    const worldY = worldBounds.minY + localY / minimapScale;

    centerViewportOnWorldPoint(worldX, worldY);
  };

  const handleTidyLayout = () => {
    if (frameMetrics.length === 0) {
      return;
    }

    const startX =
      workspaceSize.width > 0
        ? -canvasDraft.viewport.x / canvasDraft.viewport.zoom + 40
        : 40;
    const startY =
      workspaceSize.height > 0
        ? -canvasDraft.viewport.y / canvasDraft.viewport.zoom + 40
        : 40;
    const positions = createTidiedFramePositions(
      frameMetrics,
      startX,
      startY,
      workspaceSize.width / Math.max(canvasDraft.viewport.zoom, 0.01),
    );

    updateDocument({
      ...canvasDraft,
      frames: canvasDraft.frames.map((frame, index) => {
        const position = positions.get(frame.id);

        return position
          ? {
              ...frame,
              x: position.x,
              y: position.y,
              zIndex: index + 1,
            }
          : frame;
      }),
    });
  };

  const handleDistributeX = () => {
    if (frameMetrics.length === 0) {
      return;
    }

    const startX =
      workspaceSize.width > 0
        ? -canvasDraft.viewport.x / canvasDraft.viewport.zoom + 40
        : Math.min(...frameMetrics.map((metric) => metric.x));
    const baselineY =
      frameMetrics.length > 1
        ? Math.min(...frameMetrics.map((metric) => metric.y))
        : (frameMetrics[0]?.y ?? 40);
    const positions = createDistributedFramePositions(
      frameMetrics,
      startX,
      baselineY,
      workspaceSize.width / Math.max(canvasDraft.viewport.zoom, 0.01),
    );

    updateDocument({
      ...canvasDraft,
      frames: canvasDraft.frames.map((frame, index) => {
        const position = positions.get(frame.id);

        return position
          ? {
              ...frame,
              x: position.x,
              y: position.y,
              zIndex: index + 1,
            }
          : frame;
      }),
    });
  };

  useEffect(() => {
    if (!minimapDrag.active) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      updateViewportFromMinimapClient(event.clientX, event.clientY);
    };

    const handlePointerUp = () => {
      setMinimapDrag({ active: false });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [minimapDrag.active, updateViewportFromMinimapClient]);

  const handleAddRule = () => {
    const nextRule = createComposerRule(canvasDraft.composer.rules);
    const nextFrame = createDefaultRuleFrame(
      nextRule,
      canvasDraft.frames.length,
      canvasDraft.frames,
    );

    updateDocument({
      ...canvasDraft,
      composer: {
        ...canvasDraft.composer,
        rules: [...canvasDraft.composer.rules, nextRule],
      },
      frames: [...canvasDraft.frames, nextFrame],
      blockLayouts: [
        ...canvasDraft.blockLayouts,
        ...nextRule.blocks.map((block) => ({
          blockId: block.id,
          ruleId: nextRule.id,
          lane: block.category,
        })),
      ],
    });
    setCanvasSelection({
      frameId: nextFrame.id,
      ruleId: nextRule.id,
      blockId: null,
      lane: null,
    });
  };

  const handleDeleteRule = (ruleId: string) => {
    updateDocument(deleteRuleFromDocument(canvasDraft, ruleId));
    setCanvasSelection({
      frameId: null,
      ruleId: null,
      blockId: null,
      lane: null,
    });
  };

  const handleDeleteBlock = (ruleId: string, blockId: string) => {
    updateDocument(deleteBlockFromDocument(canvasDraft, ruleId, blockId));
    setCanvasSelection({
      ...canvasSelection,
      blockId: canvasSelection.blockId === blockId ? null : canvasSelection.blockId,
    });
  };

  const handleLaneDrop = (
    targetRuleId: string,
    lane: ComposerCanvasLane,
    index: number,
  ) => {
    if (!dragPayload) {
      return;
    }

    if (!canDropIntoLane(canvasDraft, dragPayload, targetRuleId, lane)) {
      setHoverLane(null);
      setDragPayload(null);
      return;
    }

    const nextDocument =
      dragPayload.kind === "palette"
        ? addPaletteBlockToLane(
            canvasDraft,
            dragPayload.blockType,
            targetRuleId,
            lane,
            index,
          )
        : moveCanvasBlockToLane(canvasDraft, dragPayload, targetRuleId, lane, index);

    updateDocument(nextDocument);
    setHoverLane(null);
    setDragPayload(null);
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
            {translateUi(language, "Scratch-style Policy Canvas")}
          </p>
          <h3 className="font-[family-name:var(--font-display)] text-3xl leading-tight">
            {translateUi(
              language,
              "Move rule frames freely, then snap policy blocks into semantic lanes.",
            )}
          </h3>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {translateUi(
              language,
              "The canvas gives a stronger visual programming feel, but execution still comes from the same typed composer AST. Layout stays visual. Meaning stays semantic.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-slate-50">
            {translateUi(language, formatModeLabel(composerMode))}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {translateUi(language, "Draft")} {canvasDraft.frames.length}{" "}
            {translateUi(language, "frames")}
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {translateUi(language, "Active")} {canvasApplied.frames.length}{" "}
            {translateUi(language, "frames")}
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" onClick={handleAddRule}>
          <Plus className="mr-2 h-4 w-4" />
          {translateUi(language, "Add Rule Frame")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => importPoliciesToComposerDraft(policiesDraft)}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {translateUi(language, "Import Draft Policies")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => importComposerToCanvasDraft()}
        >
          <LayoutTemplate className="mr-2 h-4 w-4" />
          {translateUi(language, "Sync From Composer")}
        </Button>
        <Button type="button" variant="outline" onClick={resetCanvasLayoutDraft}>
          {translateUi(language, "Reset Layout")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            updateViewport((viewport) => ({
              ...viewport,
              zoom: clamp(viewport.zoom + 0.1, 0.6, 2),
            }))
          }
        >
          <ZoomIn className="mr-2 h-4 w-4" />
          {translateUi(language, "Zoom In")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            updateViewport((viewport) => ({
              ...viewport,
              zoom: clamp(viewport.zoom - 0.1, 0.6, 2),
            }))
          }
        >
          <ZoomOut className="mr-2 h-4 w-4" />
          {translateUi(language, "Zoom Out")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => panViewport(0, -40)}
        >
          <ArrowUp className="mr-2 h-4 w-4" />
          {translateUi(language, "Pan Up")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => panViewport(-40, 0)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {translateUi(language, "Pan Left")}
        </Button>
        <Button type="button" variant="outline" onClick={() => panViewport(40, 0)}>
          <ArrowRight className="mr-2 h-4 w-4" />
          {translateUi(language, "Pan Right")}
        </Button>
        <Button type="button" variant="outline" onClick={() => panViewport(0, 40)}>
          <ArrowDown className="mr-2 h-4 w-4" />
          {translateUi(language, "Pan Down")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            updateViewport(() => createDefaultCanvasViewport())
          }
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          {translateUi(language, "Reset View")}
        </Button>
        <Button type="button" variant="outline" onClick={handleDistributeX}>
          {translateUi(language, "Distribute X")}
        </Button>
        <Button type="button" variant="outline" onClick={handleTidyLayout}>
          {translateUi(language, "Tidy Layout")}
        </Button>
        <Button type="button" variant="outline" onClick={handleCopyJson}>
          <Copy className="mr-2 h-4 w-4" />
          {copyState === "copied"
            ? translateUi(language, "Copied")
            : translateUi(language, "Copy Canvas JSON")}
        </Button>
        <Button type="button" variant="outline" onClick={handleDownloadJson}>
          <Download className="mr-2 h-4 w-4" />
          {translateUi(language, "Download Canvas")}
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        <ComposerIssueList
          title={translateUi(language, "Canvas Errors")}
          issues={canvasValidationIssues.filter((issue) => issue.severity === "error")}
          tone="danger"
        />
        <ComposerIssueList
          title={translateUi(language, "Canvas Warnings")}
          issues={canvasValidationIssues.filter((issue) => issue.severity === "warning")}
          tone="warning"
        />
        <ComposerIssueList
          title={translateUi(language, "Composer Errors")}
          issues={composerErrorIssues}
          tone="danger"
        />
        <ComposerIssueList
          title={translateUi(language, "Composer Warnings")}
          issues={composerWarningIssues}
          tone="warning"
        />
        {visibleCompileWarnings.length > 0 ? (
          <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50/80 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-700">
              {translateUi(language, "Compile Notes")}
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground/80">
              {visibleCompileWarnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="rounded-[1.5rem] border border-border/70 bg-white/90 p-4 xl:sticky xl:top-6 xl:self-start">
          <div className="flex items-center gap-2">
            <MousePointer2 className="h-4 w-4 text-primary" />
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {translateUi(language, "Palette")}
            </p>
          </div>
          <div className="mt-4 space-y-4">
            {(Object.entries(composerRegistry) as Array<
              [string, Array<(typeof composerRegistry)[keyof typeof composerRegistry][number]>]
            >).map(([key, definitions]) => (
              <div key={key} className="space-y-2">
                <p className="text-sm font-semibold capitalize">
                  {translateUi(language, key)}
                </p>
                <div className="space-y-2">
                  {definitions.map((definition) => (
                    <button
                      key={definition.type}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "copyMove";
                        setDragPayload({
                          kind: "palette",
                          blockType: definition.type,
                          category: definition.category,
                        });
                      }}
                      onDragEnd={() => {
                        setDragPayload(null);
                        setHoverLane(null);
                      }}
                      className="w-full rounded-2xl border border-border/70 bg-muted/20 px-3 py-3 text-left transition hover:border-primary/60 hover:bg-secondary/30"
                    >
                      <p className="text-sm font-medium">
                        {localizeComposerBlockDefinition(definition, language).label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {localizeComposerBlockDefinition(definition, language).description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-white/90 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {translateUi(language, "Canvas Workspace")}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {translateUi(
                language,
                "Drag frame headers to move them, use the right-edge handle to resize width, and use `Esc` or `Delete` for quick selection control. Snap guides, edge auto-pan, and the minimap help when the canvas gets crowded.",
              )}
            </p>
          </div>

          <div
            ref={workspaceRef}
            className="relative h-[720px] overflow-hidden rounded-[1.7rem] border border-border/80 bg-[radial-gradient(circle_at_top_left,_rgba(240,246,240,0.95),_rgba(246,242,231,0.98)_45%,_rgba(240,246,240,0.9)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] xl:h-[820px] 2xl:h-[900px]"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                clearSelection();
              }
            }}
            onDragOver={(event) => {
              if (!dragPayload) {
                return;
              }

              event.preventDefault();
              autoPanFromClient(event.clientX, event.clientY);
            }}
          >
            <div
              className="absolute inset-0"
              onClick={clearSelection}
              style={{
                backgroundImage:
                  "linear-gradient(rgba(14,59,64,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(14,59,64,0.06) 1px, transparent 1px)",
                backgroundSize: `${40 * canvasDraft.viewport.zoom}px ${40 * canvasDraft.viewport.zoom}px`,
              }}
            />
            <div
              className="absolute left-0 top-0 h-full w-full origin-top-left"
              style={{
                transform: `translate(${canvasDraft.viewport.x}px, ${canvasDraft.viewport.y}px) scale(${canvasDraft.viewport.zoom})`,
              }}
            >
              <div className="pointer-events-none absolute left-0 top-0 z-0">
                {snapGuides.vertical.map((guide) => (
                  <div
                    key={`guide-v-${guide}`}
                    className="absolute w-px bg-emerald-400/80"
                    style={{
                      left: guide,
                      top: -GUIDE_SPAN / 2,
                      height: GUIDE_SPAN,
                    }}
                  />
                ))}
                {snapGuides.horizontal.map((guide) => (
                  <div
                    key={`guide-h-${guide}`}
                    className="absolute h-px bg-emerald-400/80"
                    style={{
                      left: -GUIDE_SPAN / 2,
                      top: guide,
                      width: GUIDE_SPAN,
                    }}
                  />
                ))}
              </div>
              {canvasDraft.frames.map((frame) => {
                const previewPosition = framePreview[frame.id];
                const previewWidth = frameWidthPreview[frame.id];
                const x = previewPosition?.x ?? frame.x;
                const y = previewPosition?.y ?? frame.y;
                const width = previewWidth ?? frame.width;
                const rule = getRuleById(canvasDraft, frame.ruleId);

                if (!rule) {
                  return null;
                }

                return (
                  <article
                    key={frame.id}
                    className={cn(
                      "absolute rounded-[1.5rem] border bg-white/95 shadow-[0_18px_48px_rgba(14,59,64,0.08)]",
                      canvasSelection.frameId === frame.id
                        ? "border-primary"
                        : "border-border/80",
                    )}
                    style={{
                      left: x,
                      top: y,
                      width,
                      zIndex: frame.zIndex,
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setCanvasSelection({
                        frameId: frame.id,
                        ruleId: rule.id,
                        blockId: null,
                        lane: null,
                      });
                    }}
                  >
                    <div
                      className="flex cursor-grab items-center justify-between rounded-t-[1.5rem] border-b border-border/70 bg-secondary/35 px-4 py-3 active:cursor-grabbing"
                      onPointerDown={(event) => {
                        setCanvasSelection({
                          frameId: frame.id,
                          ruleId: rule.id,
                          blockId: null,
                          lane: null,
                        });
                        setFrameDrag({
                          frameId: frame.id,
                          startClient: {
                            x: event.clientX,
                            y: event.clientY,
                          },
                          startPosition: { x: frame.x, y: frame.y },
                        });
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Grip className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-semibold">{rule.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {rule.cadence === "step"
                              ? `${translateUi(language, "Step")} ${language === "ko" ? "주기" : "cadence"}`
                              : `${translateUi(language, "Year")} ${language === "ko" ? "주기" : "cadence"}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteRule(rule.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {translateUi(language, "Delete")}
                      </Button>
                    </div>

                    <div className="space-y-3 p-4">
                      {(["target", "condition", "effect", "modifier"] as ComposerCanvasLane[]).map(
                        (lane) => {
                          const laneBlockIds = frame.laneOrder[lane];
                          const isHoveringLane =
                            hoverLane?.frameId === frame.id &&
                            hoverLane?.lane === lane &&
                            hoverLane.index === laneBlockIds.length;
                          const laneAllowed = hoverLane?.allowed ?? true;

                          return (
                            <section
                              key={`${frame.id}-${lane}`}
                              className={cn(
                                "rounded-[1.2rem] border px-3 py-3 transition-colors",
                                isHoveringLane
                                  ? laneAllowed
                                    ? "border-emerald-400 bg-emerald-50/80"
                                    : "border-rose-300 bg-rose-50/80"
                                  : "border-border/70 bg-muted/15",
                              )}
                              onDragOver={(event) => {
                                event.preventDefault();
                                const allowed = dragPayload
                                  ? canDropIntoLane(canvasDraft, dragPayload, rule.id, lane)
                                  : false;
                                setHoverLane({
                                  frameId: frame.id,
                                  ruleId: rule.id,
                                  lane,
                                  index: laneBlockIds.length,
                                  allowed,
                                });
                              }}
                              onDragLeave={() => {
                                setHoverLane((current) =>
                                  current?.frameId === frame.id && current.lane === lane
                                    ? null
                                    : current,
                                );
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                handleLaneDrop(rule.id, lane, laneBlockIds.length);
                              }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                    {translateUi(language, laneLabels[lane])}
                                  </p>
                                  <p className="text-xs leading-5 text-muted-foreground">
                                    {translateUi(
                                      language,
                                      "Drop only matching block categories here.",
                                    )}
                                  </p>
                                </div>
                                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                  {laneBlockIds.length}
                                </span>
                              </div>

                              <div className="mt-3 space-y-2">
                                {laneBlockIds.length === 0 ? (
                                  <div className="rounded-2xl border border-dashed border-border/80 bg-white/60 px-3 py-3 text-xs text-muted-foreground">
                                    Drop a {lane} block here.
                                  </div>
                                ) : null}
                                {isHoveringLane ? (
                                  <DropIndicator
                                    allowed={laneAllowed}
                                    label={
                                      laneAllowed
                                        ? `Drop at end of ${lane}`
                                        : `Cannot drop into ${lane}`
                                    }
                                  />
                                ) : null}
                                {laneBlockIds.map((blockId, blockIndex) => {
                                  const block = getBlockById(canvasDraft, rule.id, blockId);
                                  const definition = block
                                    ? getComposerBlockDefinition(
                                        block.type,
                                        block.category,
                                      )
                                    : null;
                                  const localizedDefinition = definition
                                    ? localizeComposerBlockDefinition(
                                        definition,
                                        language,
                                      )
                                    : null;
                                  const blockHover =
                                    hoverLane?.frameId === frame.id &&
                                    hoverLane.lane === lane &&
                                    hoverLane.index === blockIndex;

                                  if (!block || !localizedDefinition) {
                                    return null;
                                  }

                                  return (
                                    <div key={block.id} className="space-y-2">
                                      {blockHover ? (
                                        <DropIndicator
                                          allowed={hoverLane?.allowed ?? false}
                                          label={
                                            hoverLane?.allowed
                                              ? language === "ko"
                                                ? `${localizedDefinition.label} 앞에 삽입`
                                                : `Insert before ${localizedDefinition.label}`
                                              : language === "ko"
                                                ? "여기에는 넣을 수 없습니다"
                                                : "Cannot insert here"
                                          }
                                        />
                                      ) : null}
                                      <button
                                        draggable
                                        onDragStart={(event) => {
                                          event.stopPropagation();
                                          event.dataTransfer.effectAllowed = "move";
                                          setDragPayload({
                                            kind: "canvas-block",
                                            blockId: block.id,
                                            sourceRuleId: rule.id,
                                          });
                                        }}
                                        onDragEnd={() => {
                                          setDragPayload(null);
                                          setHoverLane(null);
                                        }}
                                        onDragOver={(event) => {
                                          event.preventDefault();
                                          const allowed = dragPayload
                                            ? canDropIntoLane(
                                                canvasDraft,
                                                dragPayload,
                                                rule.id,
                                                lane,
                                              )
                                            : false;
                                          setHoverLane({
                                            frameId: frame.id,
                                            ruleId: rule.id,
                                            lane,
                                            index: blockIndex,
                                            allowed,
                                          });
                                        }}
                                        onDrop={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          handleLaneDrop(rule.id, lane, blockIndex);
                                        }}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setCanvasSelection({
                                            frameId: frame.id,
                                            ruleId: rule.id,
                                            blockId: block.id,
                                            lane,
                                          });
                                        }}
                                        className={cn(
                                          "block w-full rounded-2xl border px-3 py-3 text-left transition",
                                          canvasSelection.blockId === block.id
                                            ? "border-primary bg-secondary/30"
                                            : "border-border/70 bg-white/90 hover:border-primary/40 hover:bg-secondary/15",
                                          blockHover
                                            ? hoverLane?.allowed
                                              ? "ring-2 ring-emerald-300"
                                              : "ring-2 ring-rose-300"
                                            : "",
                                        )}
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="space-y-1">
                                            <p className="text-sm font-semibold">
                                              {localizedDefinition.label}
                                            </p>
                                            <p className="text-xs leading-5 text-muted-foreground">
                                              {summarizeComposerBlock(language, block)}
                                            </p>
                                          </div>
                                          <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                            {translateCategory(language, lane)}
                                          </span>
                                        </div>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </section>
                          );
                        },
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Resize ${rule.name}`}
                      className="absolute right-0 top-[4.25rem] h-[calc(100%-4.75rem)] w-3 cursor-col-resize rounded-r-[1.5rem] bg-transparent transition hover:bg-primary/10"
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setCanvasSelection({
                          frameId: frame.id,
                          ruleId: rule.id,
                          blockId: null,
                          lane: null,
                        });
                        setFrameResize({
                          frameId: frame.id,
                          startClientX: event.clientX,
                          startWidth: frame.width,
                        });
                      }}
                    />
                  </article>
                );
              })}
            </div>

            <div className="pointer-events-none absolute left-4 top-4 z-20 flex gap-2">
              <span className="rounded-full bg-slate-950/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-50 backdrop-blur">
                Zoom {canvasDraft.viewport.zoom.toFixed(2)}x
              </span>
              <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground backdrop-blur">
                {frameDrag || frameResize
                  ? translateUi(language, "Snap active")
                  : translateUi(language, "Free move")}
              </span>
            </div>

            <div className="absolute bottom-4 right-4 z-20 w-[244px] rounded-[1.2rem] border border-border/80 bg-white/88 p-3 shadow-[0_16px_36px_rgba(14,59,64,0.12)] backdrop-blur">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {translateUi(language, "Minimap")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {canvasDraft.frames.length} {translateUi(language, "frames")}
                </p>
              </div>
              <div
                ref={minimapRef}
                className="relative h-[148px] w-[220px] cursor-crosshair overflow-hidden rounded-[0.95rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(240,246,240,0.88))]"
                onClick={(event) => {
                  event.stopPropagation();
                  updateViewportFromMinimapClient(event.clientX, event.clientY);
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  updateViewportFromMinimapClient(event.clientX, event.clientY);
                  setMinimapDrag({ active: true });
                }}
              >
                <div
                  className="absolute"
                  style={{
                    left:
                      (MINIMAP_WIDTH - worldBounds.width * minimapScale) / 2,
                    top:
                      (MINIMAP_HEIGHT - worldBounds.height * minimapScale) / 2,
                    width: worldBounds.width * minimapScale,
                    height: worldBounds.height * minimapScale,
                  }}
                >
                  {frameMetrics.map((metric) => (
                    <div
                      key={`minimap-${metric.id}`}
                      className={cn(
                        "absolute rounded-[0.35rem] border",
                        canvasSelection.frameId === metric.id
                          ? "border-primary bg-primary/25"
                          : "border-slate-500/40 bg-slate-700/10",
                      )}
                      style={{
                        left: (metric.x - worldBounds.minX) * minimapScale,
                        top: (metric.y - worldBounds.minY) * minimapScale,
                        width: Math.max(10, metric.width * minimapScale),
                        height: Math.max(10, metric.height * minimapScale),
                      }}
                    />
                  ))}
                  {viewportRect ? (
                    <div
                      className="absolute rounded-[0.45rem] border-2 border-emerald-500/90 bg-emerald-300/10 shadow-[0_0_0_1px_rgba(255,255,255,0.55)]"
                      style={{
                        left:
                          (viewportRect.left - worldBounds.minX) * minimapScale,
                        top:
                          (viewportRect.top - worldBounds.minY) * minimapScale,
                        width: Math.max(16, viewportRect.width * minimapScale),
                        height: Math.max(16, viewportRect.height * minimapScale),
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:col-span-2 2xl:col-span-1 2xl:sticky 2xl:top-6 2xl:self-start">
          <div className="rounded-[1.5rem] border border-border/70 bg-white/90 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {translateUi(language, "Inspector")}
            </p>
            {selectedRule ? (
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-xs text-muted-foreground">
                    {translateUi(language, "Rule Name")}
                  </span>
                  <input
                    type="text"
                    value={selectedRule.name}
                    onChange={(event) =>
                      updateDocument(
                        withUpdatedRule(canvasDraft, selectedRule.id, (rule) => ({
                          ...rule,
                          name: event.currentTarget.value,
                        })),
                      )
                    }
                    className="mt-2 h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/25 px-4 py-3">
                    <span className="text-sm font-medium">
                      {translateUi(language, "Enabled")}
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedRule.enabled}
                      onChange={(event) =>
                        updateDocument(
                          withUpdatedRule(canvasDraft, selectedRule.id, (rule) => ({
                            ...rule,
                            enabled: event.currentTarget.checked,
                          })),
                        )
                      }
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-muted-foreground">
                      {translateUi(language, "Cadence")}
                    </span>
                    <select
                      value={selectedRule.cadence}
                      onChange={(event) =>
                        updateDocument(
                          withUpdatedRule(canvasDraft, selectedRule.id, (rule) => ({
                            ...rule,
                            cadence: event.currentTarget.value as ComposerRule["cadence"],
                          })),
                        )
                      }
                      className="mt-2 h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="step">{translateUi(language, "Step")}</option>
                      <option value="year">{translateUi(language, "Year")}</option>
                    </select>
                  </label>
                </div>

                {selectedBlock ? (
                  <div className="space-y-3 rounded-[1.25rem] border border-border/70 bg-muted/15 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {getComposerBlockDefinition(
                            selectedBlock.type,
                            selectedBlock.category,
                          )
                            ? localizeComposerBlockDefinition(
                                getComposerBlockDefinition(
                                  selectedBlock.type,
                                  selectedBlock.category,
                                )!,
                                language,
                              ).label
                            : selectedBlock.type}
                        </p>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {summarizeComposerBlock(language, selectedBlock)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDeleteBlock(selectedRule.id, selectedBlock.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {translateUi(language, "Delete")}
                      </Button>
                    </div>
                    <BlockInspector
                      block={selectedBlock}
                      onChange={(nextPayload) =>
                        updateDocument(
                          updateBlockPayload(
                            canvasDraft,
                            selectedRule.id,
                            selectedBlock.id,
                            nextPayload,
                          ),
                        )
                      }
                    />
                  </div>
                ) : (
                    <div className="rounded-[1.25rem] border border-dashed border-border/80 bg-muted/15 px-4 py-4 text-sm text-muted-foreground">
                    {translateUi(
                      language,
                      "Select a block to edit its parameters here.",
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-[1.25rem] border border-dashed border-border/80 bg-muted/15 px-4 py-4 text-sm text-muted-foreground">
                {translateUi(
                  language,
                  "Select a rule frame or block from the canvas.",
                )}
              </div>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-white/90 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {translateUi(language, "Compiled Preview")}
            </p>
            <textarea
              readOnly
              value={JSON.stringify(composerCompiledDraft, null, 2)}
              className="mt-3 min-h-[13rem] w-full rounded-[1.2rem] border border-input bg-slate-950 px-4 py-4 font-mono text-xs leading-6 text-slate-100 outline-none"
            />
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-white/90 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {translateUi(language, "Canvas JSON")}
            </p>
            <textarea
              readOnly
              value={exported.json}
              className="mt-3 min-h-[13rem] w-full rounded-[1.2rem] border border-input bg-slate-950 px-4 py-4 font-mono text-xs leading-6 text-slate-100 outline-none"
            />
          </div>
        </aside>
      </div>
    </section>
  );
}
