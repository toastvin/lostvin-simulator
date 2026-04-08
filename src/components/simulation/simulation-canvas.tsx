"use client";

import { useEffect, useRef, type MutableRefObject } from "react";

import { useLanguage } from "@/components/i18n/language-provider";
import { getLocaleTag, translateStatus, translateUi } from "@/lib/i18n/ui";
import { deriveSimulationGridLayout } from "@/lib/simulation/grid";
import { cn } from "@/lib/utils";
import type { SimulationConfig } from "@/types/config";
import type { MetricsSnapshot } from "@/types/metrics";
import type { Agent, EventNode, SimulationStatus } from "@/types/simulation";
import { useSimulationStore } from "@/store/simulationStore";

type CanvasSnapshot = {
  status: SimulationStatus;
  agents: Agent[];
  events: EventNode[];
  config: SimulationConfig;
  runtimeStep: number;
  runtimePolicyCost: number;
  playbackSpeed: number;
  metrics: MetricsSnapshot;
};

type CanvasLayerCache = {
  canvas: HTMLCanvasElement;
  key: string;
};

const FIXED_STEP_MS = 100;
const MAX_STEPS_PER_FRAME = 5;

function readSnapshot(): CanvasSnapshot {
  const state = useSimulationStore.getState();

  return {
    status: state.status,
    agents: state.agents,
    events: state.events,
    config: state.appliedConfig,
    runtimeStep: state.runtimeStep,
    runtimePolicyCost: state.runtimePolicyCost,
    playbackSpeed: state.playbackSpeed,
    metrics: state.metrics,
  };
}

function syncCanvasResolution(
  canvas: HTMLCanvasElement,
  config: SimulationConfig,
  context: CanvasRenderingContext2D,
) {
  const dpr = window.devicePixelRatio || 1;
  const width = config.arena.width;
  const height = config.arena.height;

  if (
    canvas.width !== Math.floor(width * dpr) ||
    canvas.height !== Math.floor(height * dpr)
  ) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = "100%";
    canvas.style.height = "auto";
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function createLayerCanvas(
  hostCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number,
) {
  const canvas = hostCanvas.ownerDocument.createElement("canvas");
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  return {
    canvas,
    context,
  };
}

function drawBackdrop(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gridLayout = deriveSimulationGridLayout(width, height);
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#f8f2e8");
  gradient.addColorStop(0.6, "#edf7f6");
  gradient.addColorStop(1, "#eef4f4");

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.06;
  context.fillStyle = "#11484f";
  for (let column = 0; column <= gridLayout.columns; column += 1) {
    const x = Math.min(width, column * gridLayout.cellWidth);
    context.fillRect(x, 0, 1, height);
  }
  for (let row = 0; row <= gridLayout.rows; row += 1) {
    const y = Math.min(height, row * gridLayout.cellHeight);
    context.fillRect(0, y, width, 1);
  }
  context.restore();
}

function buildBackdropCache(
  hostCanvas: HTMLCanvasElement,
  snapshot: CanvasSnapshot,
  backdropCacheRef: MutableRefObject<CanvasLayerCache | null>,
) {
  const dpr = window.devicePixelRatio || 1;
  const { width, height } = snapshot.config.arena;
  const key = `${width}x${height}@${dpr}`;

  if (backdropCacheRef.current?.key === key) {
    return backdropCacheRef.current.canvas;
  }

  const layer = createLayerCanvas(hostCanvas, width, height, dpr);

  if (!layer) {
    return null;
  }

  drawBackdrop(layer.context, width, height);

  backdropCacheRef.current = {
    canvas: layer.canvas,
    key,
  };

  return layer.canvas;
}

function getAgentVisualRadius(radius: number) {
  return Math.max(radius - 0.4, 2.2);
}

function getEventVisualRadius(radius: number) {
  return Math.max(radius + 2, radius * 1.55);
}

function traceDiamond(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x, y - radius);
  context.lineTo(x + radius, y);
  context.lineTo(x, y + radius);
  context.lineTo(x - radius, y);
  context.closePath();
}

function eventPalette(kind: EventNode["kind"]) {
  return kind === "luck"
    ? {
        fill: "rgba(22, 163, 74, 0.98)",
        glow: "rgba(34, 197, 94, 0.44)",
        stroke: "rgba(236, 253, 245, 0.96)",
        core: "rgba(255, 255, 255, 0.94)",
      }
    : {
        fill: "rgba(220, 38, 38, 0.98)",
        glow: "rgba(248, 113, 113, 0.42)",
        stroke: "rgba(255, 241, 242, 0.96)",
        core: "rgba(255, 255, 255, 0.92)",
      };
}

function drawEvents(context: CanvasRenderingContext2D, events: EventNode[]) {
  events.forEach((event) => {
    const palette = eventPalette(event.kind);
    // Keep collisions unchanged while rendering event nodes slightly larger.
    const visualRadius = getEventVisualRadius(event.radius);
    context.save();
    context.fillStyle = palette.fill;
    context.shadowColor = palette.glow;
    context.shadowBlur = 18;
    if (event.kind === "luck") {
      context.beginPath();
      context.arc(event.x, event.y, visualRadius, 0, Math.PI * 2);
    } else {
      traceDiamond(context, event.x, event.y, visualRadius);
    }
    context.fill();
    context.restore();

    context.save();
    context.lineWidth = 1.6;
    context.strokeStyle = palette.stroke;
    if (event.kind === "luck") {
      context.beginPath();
      context.arc(event.x, event.y, visualRadius, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = palette.core;
      context.beginPath();
      context.arc(
        event.x,
        event.y,
        Math.max(visualRadius * 0.3, 2),
        0,
        Math.PI * 2,
      );
      context.fill();
    } else {
      traceDiamond(context, event.x, event.y, visualRadius);
      context.stroke();
      const symbolRadius = Math.max(visualRadius * 0.34, 2.5);
      context.strokeStyle = palette.core;
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(event.x - symbolRadius, event.y - symbolRadius);
      context.lineTo(event.x + symbolRadius, event.y + symbolRadius);
      context.moveTo(event.x + symbolRadius, event.y - symbolRadius);
      context.lineTo(event.x - symbolRadius, event.y + symbolRadius);
      context.stroke();
    }
    context.restore();
  });
}

function drawAgents(context: CanvasRenderingContext2D, agents: Agent[]) {
  context.save();
  context.fillStyle = "rgba(37, 52, 74, 0.38)";

  agents.forEach((agent) => {
    context.beginPath();
    context.arc(
      agent.x,
      agent.y,
      getAgentVisualRadius(agent.radius),
      0,
      Math.PI * 2,
    );
    context.fill();
  });

  context.restore();
}

function drawHudEventKey(
  context: CanvasRenderingContext2D,
  kind: EventNode["kind"],
  x: number,
  y: number,
) {
  const palette = eventPalette(kind);
  const radius = 6.5;

  context.save();
  context.fillStyle = palette.fill;
  context.shadowColor = palette.glow;
  context.shadowBlur = 12;
  if (kind === "luck") {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
  } else {
    traceDiamond(context, x, y, radius);
  }
  context.fill();
  context.restore();

  context.save();
  context.lineWidth = 1.2;
  context.strokeStyle = palette.stroke;
  if (kind === "luck") {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = palette.core;
    context.beginPath();
    context.arc(x, y, 2, 0, Math.PI * 2);
    context.fill();
  } else {
    traceDiamond(context, x, y, radius);
    context.stroke();
    context.strokeStyle = palette.core;
    context.beginPath();
    context.moveTo(x - 2.5, y - 2.5);
    context.lineTo(x + 2.5, y + 2.5);
    context.moveTo(x + 2.5, y - 2.5);
    context.lineTo(x - 2.5, y + 2.5);
    context.stroke();
  }
  context.restore();
}

function buildHudCacheKey(
  snapshot: CanvasSnapshot,
  language: "ko" | "en",
  localeTag: string,
) {
  const dpr = window.devicePixelRatio || 1;
  const luckCount = snapshot.events.filter((event) => event.kind === "luck").length;

  return [
    snapshot.config.arena.width,
    dpr,
    language,
    localeTag,
    snapshot.status,
    snapshot.runtimeStep,
    snapshot.playbackSpeed,
    snapshot.metrics.averageWealth,
    snapshot.metrics.meanHappiness,
    luckCount,
    snapshot.events.length,
    snapshot.config.events.luckyGainBase,
    snapshot.config.events.unluckyLossBase,
  ].join("|");
}

function drawHud(
  context: CanvasRenderingContext2D,
  snapshot: CanvasSnapshot,
  language: "ko" | "en",
  localeTag: string,
) {
  const { width } = snapshot.config.arena;
  const luckCount = snapshot.events.filter((event) => event.kind === "luck").length;
  const badLuckCount = snapshot.events.length - luckCount;

  context.save();
  context.fillStyle = "rgba(15, 23, 42, 0.8)";
  context.fillRect(18, 18, 240, 126);
  context.fillStyle = "#ebf6f6";
  context.font = "12px sans-serif";
  context.fillText(
    `${translateUi(language, "Status")}: ${translateStatus(language, snapshot.status)}`,
    30,
    42,
  );
  context.fillText(
    `${translateUi(language, "Step")}: ${snapshot.runtimeStep.toLocaleString(localeTag)}`,
    30,
    64,
  );
  context.fillText(
    `${translateUi(language, "Average wealth")}: ${snapshot.metrics.averageWealth.toLocaleString(localeTag, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    })}`,
    30,
    86,
  );
  context.fillText(
    `${language === "ko" ? "평균 행복" : "Mean happiness"}: ${snapshot.metrics.meanHappiness.toLocaleString(localeTag, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    })}`,
    30,
    108,
  );
  context.fillText(
    `${language === "ko" ? "배속" : "Speed"}: ${snapshot.playbackSpeed}x`,
    30,
    130,
  );

  const legendWidth = 230;
  const legendX = width - legendWidth - 18;
  context.fillStyle = "rgba(15, 23, 42, 0.68)";
  context.fillRect(legendX, 18, legendWidth, 78);
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = "#f8fbfb";
  drawHudEventKey(context, "luck", legendX + 16, 47);
  context.fillText(
    `${language === "ko" ? "초록점" : "Green dots"}: ${luckCount.toLocaleString(localeTag)} / x${snapshot.config.events.luckyGainBase.toLocaleString(localeTag, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })}`,
    legendX + 30,
    47,
  );
  drawHudEventKey(context, "badLuck", legendX + 16, 70);
  context.fillText(
    `${language === "ko" ? "빨간점" : "Red dots"}: ${badLuckCount.toLocaleString(localeTag)} / x${snapshot.config.events.unluckyLossBase.toLocaleString(localeTag, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })}`,
    legendX + 30,
    70,
  );
  context.restore();
}

function buildHudCache(
  hostCanvas: HTMLCanvasElement,
  snapshot: CanvasSnapshot,
  language: "ko" | "en",
  localeTag: string,
  hudCacheRef: MutableRefObject<CanvasLayerCache | null>,
) {
  const dpr = window.devicePixelRatio || 1;
  const { width, height } = snapshot.config.arena;
  const key = buildHudCacheKey(snapshot, language, localeTag);

  if (hudCacheRef.current?.key === key) {
    return hudCacheRef.current.canvas;
  }

  const layer = createLayerCanvas(hostCanvas, width, height, dpr);

  if (!layer) {
    return null;
  }

  drawHud(layer.context, snapshot, language, localeTag);

  hudCacheRef.current = {
    canvas: layer.canvas,
    key,
  };

  return layer.canvas;
}

function hasVisibleSnapshotChange(
  previous: CanvasSnapshot,
  next: CanvasSnapshot,
) {
  return (
    previous.status !== next.status ||
    previous.agents !== next.agents ||
    previous.events !== next.events ||
    previous.config !== next.config ||
    previous.runtimeStep !== next.runtimeStep ||
    previous.runtimePolicyCost !== next.runtimePolicyCost ||
    previous.playbackSpeed !== next.playbackSpeed ||
    previous.metrics !== next.metrics
  );
}

function drawScene(
  canvas: HTMLCanvasElement,
  snapshot: CanvasSnapshot,
  language: "ko" | "en",
  localeTag: string,
  backdropCacheRef: MutableRefObject<CanvasLayerCache | null>,
  hudCacheRef: MutableRefObject<CanvasLayerCache | null>,
) {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  syncCanvasResolution(canvas, snapshot.config, context);

  const { width, height } = snapshot.config.arena;
  context.clearRect(0, 0, width, height);

  const backdropLayer = buildBackdropCache(canvas, snapshot, backdropCacheRef);
  if (backdropLayer) {
    context.drawImage(backdropLayer, 0, 0, width, height);
  } else {
    drawBackdrop(context, width, height);
  }

  drawAgents(context, snapshot.agents);
  drawEvents(context, snapshot.events);

  const hudLayer = buildHudCache(
    canvas,
    snapshot,
    language,
    localeTag,
    hudCacheRef,
  );
  if (hudLayer) {
    context.drawImage(hudLayer, 0, 0, width, height);
  } else {
    drawHud(context, snapshot, language, localeTag);
  }
}

type SimulationCanvasProps = {
  compact?: boolean;
};

export function SimulationCanvas({ compact = false }: SimulationCanvasProps) {
  const { language } = useLanguage();
  const localeTag = getLocaleTag(language);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshotRef = useRef<CanvasSnapshot>(readSnapshot());
  const accumulatorRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const languageRef = useRef(language);
  const localeTagRef = useRef(localeTag);
  const frameIdRef = useRef<number | null>(null);
  const loopActiveRef = useRef(false);
  const singleDrawQueuedRef = useRef(false);
  const backdropCacheRef = useRef<CanvasLayerCache | null>(null);
  const hudCacheRef = useRef<CanvasLayerCache | null>(null);

  const drawCurrentScene = () => {
    if (!canvasRef.current) {
      return;
    }

    drawScene(
      canvasRef.current,
      snapshotRef.current,
      languageRef.current,
      localeTagRef.current,
      backdropCacheRef,
      hudCacheRef,
    );
  };

  const stopLoop = () => {
    if (frameIdRef.current !== null) {
      window.cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    }

    loopActiveRef.current = false;
    singleDrawQueuedRef.current = false;
    accumulatorRef.current = 0;
    lastFrameRef.current = null;
  };

  const queueSingleDraw = () => {
    if (loopActiveRef.current || singleDrawQueuedRef.current) {
      return;
    }

    singleDrawQueuedRef.current = true;
    frameIdRef.current = window.requestAnimationFrame(() => {
      singleDrawQueuedRef.current = false;
      frameIdRef.current = null;
      drawCurrentScene();
    });
  };

  const renderLoop = (timestamp: number) => {
    if (!loopActiveRef.current) {
      frameIdRef.current = null;
      return;
    }

    if (lastFrameRef.current === null) {
      lastFrameRef.current = timestamp;
    }

    const deltaMs = Math.min(timestamp - lastFrameRef.current, 250);
    lastFrameRef.current = timestamp;

    if (snapshotRef.current.status === "running") {
      accumulatorRef.current += deltaMs * snapshotRef.current.playbackSpeed;
      let steps = 0;
      const maxStepsThisFrame = Math.min(
        240,
        Math.max(
          MAX_STEPS_PER_FRAME,
          MAX_STEPS_PER_FRAME * snapshotRef.current.playbackSpeed,
        ),
      );

      while (
        accumulatorRef.current >= FIXED_STEP_MS &&
        steps < maxStepsThisFrame
      ) {
        useSimulationStore.getState().tickSimulation();
        accumulatorRef.current -= FIXED_STEP_MS;
        steps += 1;
      }
    }

    drawCurrentScene();

    if (snapshotRef.current.status === "running") {
      frameIdRef.current = window.requestAnimationFrame(renderLoop);
      return;
    }

    stopLoop();
    queueSingleDraw();
  };

  const startLoop = () => {
    if (loopActiveRef.current) {
      return;
    }

    if (frameIdRef.current !== null && singleDrawQueuedRef.current) {
      window.cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
      singleDrawQueuedRef.current = false;
    }

    loopActiveRef.current = true;
    accumulatorRef.current = 0;
    lastFrameRef.current = null;
    frameIdRef.current = window.requestAnimationFrame(renderLoop);
  };

  useEffect(() => {
    languageRef.current = language;
    localeTagRef.current = localeTag;
    hudCacheRef.current = null;

    if (snapshotRef.current.status !== "running") {
      queueSingleDraw();
    }
  }, [language, localeTag]);

  useEffect(() => {
    snapshotRef.current = readSnapshot();

    if (snapshotRef.current.status === "running") {
      startLoop();
    } else {
      queueSingleDraw();
    }

    return useSimulationStore.subscribe((state) => {
      const nextSnapshot = {
        status: state.status,
        agents: state.agents,
        events: state.events,
        config: state.appliedConfig,
        runtimeStep: state.runtimeStep,
        runtimePolicyCost: state.runtimePolicyCost,
        playbackSpeed: state.playbackSpeed,
        metrics: state.metrics,
      };
      const previousSnapshot = snapshotRef.current;
      const visibleChange = hasVisibleSnapshotChange(
        previousSnapshot,
        nextSnapshot,
      );

      snapshotRef.current = nextSnapshot;

      if (nextSnapshot.status === "running") {
        startLoop();
        return;
      }

      if (previousSnapshot.status === "running") {
        stopLoop();
      }

      if (visibleChange) {
        queueSingleDraw();
      }
    });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      backdropCacheRef.current = null;
      hudCacheRef.current = null;

      if (snapshotRef.current.status !== "running") {
        queueSingleDraw();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      stopLoop();
    };
  }, []);

  return (
    <div
      className={cn(
        "overflow-hidden border border-border/80 bg-white/80 shadow-[0_20px_60px_rgba(14,59,64,0.08)] backdrop-blur",
        compact ? "rounded-[1.45rem] p-0.5" : "rounded-[2rem] p-3",
      )}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "block w-full border border-border/60 bg-[#f7f5ef]",
          compact ? "rounded-[1rem]" : "rounded-[1.5rem]",
        )}
      />
    </div>
  );
}
